const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, memoryStorage, deferred, place, trip, leg, estimate } = require('./helpers.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(calculateDistance = async () => estimate(), backend = memoryStorage(), globals = {}) {
  const storage = loadTs('src/utils/storage.ts', { '@react-native-async-storage/async-storage': backend }, globals);
  const store = loadTs('src/stores/tripStore.ts', {
    '../utils/storage': storage, '../services/googleApi': { calculateDistance },
  }, globals).useTripStore;
  return { store, storage, backend };
}
function put(store, plan) { store.setState({ currentTrip: plan, drafts: [plan], initialized: true }); store.getState().updateSummary(); }
const plan = () => trip('original', [place('A'), place('B')], { legs: [leg('A', 'B', { status: 'pending', duration: null })] });

test('late route response merges only the leg and preserves name edits', async () => {
  const request = deferred();
  const { store, storage } = setup(() => request.promise);
  put(store, plan());
  const run = store.getState().recalculateTravelTimes();
  store.getState().setTripName('new name');
  store.getState().updatePlace('A', { name: 'new place name' });
  request.resolve(estimate(12));
  await run;
  assert.equal(store.getState().currentTrip.name, 'new name');
  assert.equal(store.getState().currentTrip.places[0].name, 'new place name');
  assert.equal(store.getState().summary.totalTime, 162);
  await storage.flushStorage();
});

test('older response cannot overwrite a changed stay duration or newer result', async () => {
  const requests = [];
  const { store, storage } = setup(() => { const request = deferred(); requests.push(request); return request.promise; });
  const driving = plan();
  driving.legs[0].mode = 'driving';
  put(store, driving);
  const oldRun = store.getState().recalculateTravelTimes();
  store.getState().setStayDuration('A', 120);
  assert.equal(requests.length, 2);
  requests[1].resolve(estimate(15));
  await tick();
  requests[0].resolve(estimate(99));
  await oldRun;
  assert.equal(store.getState().currentTrip.places[0].stayDuration, 120);
  assert.equal(store.getState().currentTrip.legs[0].duration, 15);
  assert.equal(store.getState().isLoading, false);
  await storage.flushStorage();
});

test('old route response cannot resurrect previous trip after creating a new one', async () => {
  const request = deferred();
  const { store, storage } = setup(() => request.promise);
  put(store, plan());
  const run = store.getState().recalculateTravelTimes();
  store.getState().createTrip('new trip');
  const newId = store.getState().currentTrip.id;
  request.resolve(estimate());
  await run;
  assert.equal(store.getState().currentTrip.id, newId);
  assert.equal(store.getState().currentTrip.name, 'new trip');
  await storage.flushStorage();
  const library = await storage.loadLibrary();
  assert.equal(library.activeTripId, newId);
  assert.ok(library.drafts.some(item => item.id === 'original'));
});

test('deleting final place removes ghost outgoing edge and time', async () => {
  const { store, storage } = setup();
  put(store, trip('day', [place('A', { travelTimeToNext: 12 }), place('B')], { bufferMinutes: 0, legs: [leg('A', 'B', { duration: 12 })] }));
  store.getState().removePlace('B');
  assert.equal(store.getState().currentTrip.legs.length, 0);
  assert.equal(store.getState().summary.totalTravelTime, 0);
  assert.equal(store.getState().summary.totalTime, 60);
  await storage.flushStorage();
});

test('save during calculation persists the completed result later', async () => {
  const request = deferred();
  const { store, storage } = setup(() => request.promise);
  put(store, plan());
  const run = store.getState().recalculateTravelTimes();
  await store.getState().saveCurrentTrip();
  request.resolve(estimate(20));
  await run;
  await storage.flushStorage();
  const saved = (await storage.getAllTrips())[0];
  assert.equal(saved.legs[0].duration, 20);
  assert.equal(store.getState().savedTrips[0].legs[0].duration, 20);
  const time = loadTs('src/utils/timeCalculator.ts');
  assert.equal(time.calculateTripSummary(saved).totalTime, store.getState().summary.totalTime);
});

test('saving an old snapshot cannot replace edits or a newly selected trip', async () => {
  const { store, storage } = setup();
  put(store, trip('A', [place('A')]));
  const gate = deferred();
  const originalSave = storage.saveTrip;
  storage.saveTrip = async value => { await gate.promise; return originalSave(value); };
  const saving = store.getState().saveCurrentTrip();
  store.getState().setTripName('edited during save');
  store.getState().createTrip('B');
  const id = store.getState().currentTrip.id;
  gate.resolve();
  await saving;
  assert.equal(store.getState().currentTrip.id, id);
  const draftA = store.getState().drafts.find(item => item.id === 'A');
  assert.equal(draftA.name, 'edited during save');
  await storage.flushStorage();
});

test('manual route overrides and cancels pending provider result', async () => {
  const request = deferred();
  const { store, storage } = setup(() => request.promise);
  put(store, plan());
  const run = store.getState().recalculateTravelTimes();
  store.getState().setManualTravelTime('leg:A:B', 35);
  request.resolve(estimate(99));
  await run;
  assert.equal(store.getState().currentTrip.legs[0].duration, 35);
  assert.equal(store.getState().currentTrip.legs[0].source, 'manual');
  assert.equal(store.getState().summary.status, 'estimated');
  await storage.flushStorage();
});

test('unavailable upstream route does not request later route at an invented departure', async () => {
  const calls = [];
  const { store, storage } = setup(async (...args) => { calls.push(args); return { ...estimate(), status: 'unavailable', duration: null, distance: null, source: 'none', reason: 'no-route' }; });
  put(store, trip('A', [place('A'), place('B'), place('C')], { legs: [leg('A', 'B', { status: 'pending', duration: null }), leg('B', 'C', { status: 'pending', duration: null })] }));
  await store.getState().recalculateTravelTimes();
  assert.equal(calls.length, 1);
  assert.equal(store.getState().currentTrip.legs[1].reason, 'previous-leg-unresolved');
  assert.equal(store.getState().summary.totalTime, null);
  assert.equal(store.getState().summary.isOverTime, null);
  await storage.flushStorage();
});

test('provider receives cumulative departures including previous travel and stays', async () => {
  const departures = [];
  const { store, storage } = setup(async (from, to, mode, departure) => { departures.push(new Date(departure)); return estimate(20); });
  put(store, trip('A', [place('A'), place('B'), place('C')]));
  // Store normalizes edges when edits arrive; direct fixtures must supply adjacency too.
  store.getState().setStayDuration('A', 60);
  await tick();
  assert.equal(departures.length, 2);
  assert.equal(departures[1].getTime() - departures[0].getTime(), 80 * 60 * 1000);
  await storage.flushStorage();
});

test('initialize restores active draft and retains multiple drafts', async () => {
  const first = setup();
  first.store.getState().createTrip('A');
  const idA = first.store.getState().currentTrip.id;
  first.store.getState().addPlace(place('first'));
  first.store.getState().createTrip('B');
  const idB = first.store.getState().currentTrip.id;
  await first.storage.flushStorage();
  const second = setup(undefined, first.backend);
  await second.store.getState().initialize();
  assert.equal(second.store.getState().currentTrip.id, idB);
  assert.equal(second.store.getState().drafts.length, 2);
  await second.store.getState().resumeDraft(idA);
  assert.equal(second.store.getState().currentTrip.places.length, 1);
  await second.storage.flushStorage();
});

test('schedule rejects invalid calendar, fractional or negative time values', () => {
  const { store } = setup();
  put(store, trip());
  for (const update of [{ date: '2026-02-29' }, { startTimeMinutes: 1440 }, { totalAvailableTime: 0 }, { bufferMinutes: -1 }, { startTimeMinutes: 1.5 }]) {
    assert.throws(() => store.getState().setSchedule(update));
  }
  assert.equal(store.getState().currentTrip.date, '2026-10-26');
});

test('deleting a trip invalidates late provider response and removes persisted draft', async () => {
  const request = deferred();
  const { store, storage } = setup(() => request.promise);
  put(store, plan());
  const run = store.getState().recalculateTravelTimes();
  await store.getState().deleteTrip('original');
  request.resolve(estimate());
  await run;
  await storage.flushStorage();
  assert.equal(store.getState().currentTrip, null);
  assert.equal(store.getState().drafts.length, 0);
  assert.equal((await storage.loadLibrary()).drafts.length, 0);
});

test('failed initialization remains retryable without creating or wiping drafts', async () => {
  const backend = memoryStorage();
  let fail = true;
  const read = backend.getItem;
  backend.getItem = async key => { if (fail) throw new Error('temporary read failure'); return read(key); };
  const { store, storage } = setup(undefined, backend);
  await assert.rejects(store.getState().initialize(), /temporary read failure/);
  assert.equal(store.getState().initialized, false);
  assert.equal(store.getState().currentTrip, null);
  fail = false;
  await store.getState().initialize();
  assert.equal(store.getState().initialized, true);
  await storage.flushStorage();
});

test('a new trip created during clear-all remains in memory and storage', async () => {
  const { store, storage } = setup();
  store.getState().createTrip('old');
  await storage.flushStorage();
  const clearing = store.getState().clearAllTrips();
  store.getState().createTrip('new');
  const newId = store.getState().currentTrip.id;
  await clearing;
  await storage.flushStorage();
  assert.equal(store.getState().drafts.length, 1);
  assert.equal(store.getState().drafts[0].id, newId);
  assert.equal((await storage.loadLibrary()).drafts[0].id, newId);
});

test('zero stay duration is valid for an origin or return destination', async () => {
  const { store, storage } = setup();
  store.getState().createTrip('return trip');
  store.getState().addPlace(place('origin', { stayDuration: 0 }));
  assert.equal(store.getState().summary.totalStayTime, 0);
  store.getState().setStayDuration('origin', 0);
  assert.equal(store.getState().currentTrip.places[0].stayDuration, 0);
  await storage.flushStorage();
});

test('reopening an expired automatic route marks it unknown, refreshes and synchronizes saved results', async () => {
  const request = deferred();
  let calls = 0;
  const { store, storage } = setup(() => { calls++; return request.promise; });
  const old = trip('A', [place('A'), place('B')], { legs: [leg('A', 'B', { duration: 10, calculatedAt: new Date(Date.now() - 16 * 60_000).toISOString() })] });
  await storage.saveTrip(old);
  await storage.saveDraft(old);
  await store.getState().initialize();
  assert.equal(calls, 1);
  assert.equal(store.getState().currentTrip.legs[0].status, 'pending');
  assert.equal(store.getState().summary.totalTime, null);
  assert.equal(store.getState().summary.isOverTime, null);
  await storage.flushStorage();
  assert.equal((await storage.getAllTrips())[0].legs[0].status, 'pending');
  request.resolve(estimate(25));
  await tick();
  await storage.flushStorage();
  assert.equal(store.getState().summary.totalTravelTime, 25);
  assert.equal((await storage.getAllTrips())[0].legs[0].duration, 25);
  assert.equal(store.getState().savedTrips[0].legs[0].duration, 25);
});

test('resuming fresh automatic and old manual or legacy estimates does not issue requests', async () => {
  let calls = 0;
  const { store, storage } = setup(async () => { calls++; return estimate(); });
  const time = loadTs('src/utils/timeCalculator.ts');
  const fresh = trip('fresh', [place('A'), place('B')], { legs: [leg('A', 'B', { calculatedAt: new Date().toISOString() })] });
  fresh.legs[0].departureAt = time.departureAtForLeg(fresh, 0);
  const manual = { ...fresh, id: 'manual', legs: [{ ...fresh.legs[0], source: 'manual', status: 'estimated', calculatedAt: '2020-01-01T00:00:00Z' }] };
  const legacy = { ...fresh, id: 'legacy', legs: [{ ...fresh.legs[0], source: 'none', status: 'estimated', reason: 'legacy-unverified', calculatedAt: undefined }] };
  store.setState({ drafts: [fresh, manual, legacy], initialized: true });
  for (const id of ['fresh', 'manual', 'legacy']) {
    await store.getState().resumeDraft(id);
    assert.equal(store.getState().summary.totalTravelTime, 20);
  }
  assert.equal(calls, 0);
  await storage.flushStorage();
});

test('failed legacy cleanup restores the current trip consistently with persisted data', async () => {
  const { store, storage, backend } = setup();
  store.getState().createTrip('A');
  store.getState().addPlace(place('A'));
  await store.getState().saveCurrentTrip();
  const id = store.getState().currentTrip.id;
  backend.removeItem = async () => { throw new Error('cleanup failed'); };
  await assert.rejects(store.getState().deleteTrip(id), /cleanup failed/);
  assert.equal(store.getState().currentTrip.id, id);
  assert.equal((await storage.getAllTrips())[0].id, id);
});

test('failed deletion restores dirty state and rejoins the same pending route request', async () => {
  const requests = [];
  const { store, storage, backend } = setup(() => { const request = deferred(); requests.push(request); return request.promise; });
  put(store, plan());
  store.getState().setTripName('unsaved edits');
  const oldRun = store.getState().recalculateTravelTimes();
  assert.equal(requests.length, 1);
  backend.removeItem = async () => { throw new Error('cleanup failed'); };
  await assert.rejects(store.getState().deleteTrip('original'), /cleanup failed/);
  assert.equal(store.getState().isDirty, true);
  assert.equal(store.getState().isLoading, true);
  assert.equal(requests.length, 1);
  requests[0].resolve(estimate(17));
  await oldRun;
  await tick();
  assert.equal(store.getState().summary.totalTravelTime, 17);
  assert.equal(store.getState().currentTrip.name, 'unsaved edits');
  assert.equal(store.getState().isDirty, true);
  await storage.flushStorage();
});

test('Korean driving no-route remains unknown and can be completed with a manual time', async () => {
  const calls = [];
  const { store, storage } = setup(async (...args) => { calls.push(args); return {
    ...estimate(), status: 'unavailable', duration: null, distance: null, source: 'tmap', reason: 'no-route',
  }; });
  store.getState().createTrip('강릉에서 부산');
  store.getState().setTransportMode('driving');
  store.getState().addPlace(place('chodang', { name: '초당순두부마을', latitude: 37.7913, longitude: 128.9148, countryCode: 'KR', stayDuration: 0 }));
  store.getState().addPlace(place('busan', { name: '부산역', latitude: 35.1152, longitude: 129.0415, countryCode: 'KR', stayDuration: 0 }));
  await tick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0].countryCode, 'KR');
  assert.equal(calls[0][1].countryCode, 'KR');
  assert.equal(calls[0][2], 'driving');
  assert.equal(store.getState().currentTrip.legs[0].reason, 'no-route');
  assert.equal(store.getState().summary.totalTime, null);
  assert.equal(store.getState().summary.isOverTime, null);
  await store.getState().saveCurrentTrip();
  await storage.flushStorage();
  assert.equal((await storage.getAllTrips())[0].places[0].countryCode, 'KR');
  store.getState().setManualTravelTime('leg:chodang:busan', 240);
  assert.equal(store.getState().summary.status, 'estimated');
  assert.equal(store.getState().summary.totalTime, 270);
  assert.equal(store.getState().summary.remainingTime, 30);
  assert.equal(calls.length, 1);
  await storage.flushStorage();
});

test('country metadata changes invalidate pending classification without losing manual times', async () => {
  const requests = [];
  const { store, storage } = setup((...args) => { const request = deferred(); requests.push({ ...request, args }); return request.promise; });
  put(store, plan());
  const oldRun = store.getState().recalculateTravelTimes();
  store.getState().updatePlace('A', { countryCode: 'KR' });
  store.getState().updatePlace('B', { countryCode: 'KR' });
  assert.equal(requests.length, 3);
  assert.equal(requests[2].args[0].countryCode, 'KR');
  assert.equal(requests[2].args[1].countryCode, 'KR');
  requests[2].resolve({ ...estimate(), status: 'unavailable', duration: null, source: 'none', reason: 'provider-coverage' });
  await tick();
  requests[0].resolve({ ...estimate(), status: 'unavailable', duration: null, source: 'none', reason: 'no-route' });
  requests[1].resolve(estimate(99));
  await oldRun;
  await tick();
  assert.equal(store.getState().currentTrip.legs[0].reason, 'provider-coverage');
  store.getState().setManualTravelTime('leg:A:B', 35);
  store.getState().updatePlace('B', { countryCode: undefined });
  assert.equal(store.getState().currentTrip.legs[0].source, 'manual');
  assert.equal(store.getState().currentTrip.legs[0].duration, 35);
  assert.equal(requests.length, 3);
  await storage.flushStorage();
});

test('reopening a failed domestic route retries once and persists a successful new provider result', async () => {
  for (const reason of ['provider-coverage', 'no-route']) {
    let calls = 0;
    const { store, storage } = setup(async () => { calls++; return { ...estimate(45), source: 'tmap' }; });
    const failed = trip('A', [place('A', { countryCode: 'KR' }), place('B', { countryCode: 'KR' })], {
      legs: [leg('A', 'B', { mode: 'walking', status: 'unavailable', duration: null, distance: null, source: 'none', reason })],
    });
    await storage.saveTrip(failed);
    await storage.saveDraft(failed);
    await store.getState().initialize();
    await tick();
    await store.getState().flushDrafts();
    assert.equal(calls, 1);
    assert.equal(store.getState().summary.totalTravelTime, 45);
    assert.equal((await storage.getAllTrips())[0].legs[0].source, 'tmap');
    assert.equal((await storage.getTrip('A')).legs[0].duration, 45);
  }
});

test('a repeated provider failure does not loop and manual values survive resuming', async () => {
  let calls = 0;
  const { store, storage } = setup(async () => { calls++; return {
    ...estimate(), status: 'unavailable', duration: null, source: 'tmap', reason: 'no-route',
  }; });
  const failed = trip('A', [place('A'), place('B')], { legs: [leg('A', 'B', {
    mode: 'driving', status: 'unavailable', duration: null, reason: 'provider-coverage',
  })] });
  await storage.saveDraft(failed);
  await store.getState().initialize();
  await tick();
  await tick();
  assert.equal(calls, 1);
  assert.equal(store.getState().isLoading, false);
  await store.getState().resumeDraft('A');
  await tick();
  assert.equal(calls, 2);
  store.getState().setManualTravelTime('leg:A:B', 30);
  await store.getState().resumeDraft('A');
  await tick();
  assert.equal(calls, 2);
  assert.equal(store.getState().currentTrip.legs[0].source, 'manual');
  assert.equal(store.getState().summary.totalTravelTime, 30);
  await store.getState().flushDrafts();
});

test('failed draft writes remain visible across selection and flush retries every draft', async () => {
  const backend = memoryStorage();
  const { store, storage } = setup(undefined, backend);
  await store.getState().initialize();
  store.getState().createTrip('A');
  const idA = store.getState().currentTrip.id;
  store.getState().addPlace(place('first'));
  await store.getState().flushDrafts();
  const write = backend.setItem;
  backend.setItem = async () => { throw new Error('disk write failed'); };
  store.getState().setTripName('A edited');
  await storage.flushStorage();
  await tick();
  assert.equal(store.getState().draftSaveError, 'disk write failed');
  await assert.rejects(store.getState().flushDrafts(), /disk write failed/);
  store.getState().createTrip('B');
  const idB = store.getState().currentTrip.id;
  assert.equal(store.getState().draftSaveError, 'disk write failed');
  backend.setItem = write;
  await store.getState().flushDrafts();
  assert.equal(store.getState().draftSaveError, null);
  assert.equal(store.getState().isPersistingDraft, false);
  const restarted = setup(undefined, backend);
  await restarted.store.getState().initialize();
  assert.equal(restarted.store.getState().currentTrip.id, idB);
  assert.equal(restarted.store.getState().drafts.find(item => item.id === idA).name, 'A edited');
  await restarted.store.getState().flushDrafts();
});

test('flush waits for late edits and pending disk writes before reporting success', async () => {
  const backend = memoryStorage();
  const { store, storage } = setup(undefined, backend);
  store.getState().createTrip('A');
  await store.getState().flushDrafts();
  const gate = deferred();
  const write = backend.setItem;
  let block = true;
  backend.setItem = async (...args) => { if (block) { block = false; await gate.promise; } return write(...args); };
  store.getState().setTripName('first edit');
  let flushed = false;
  const flushing = store.getState().flushDrafts().then(() => { flushed = true; });
  store.getState().setTripName('latest edit');
  await tick();
  assert.equal(flushed, false);
  assert.equal(store.getState().isPersistingDraft, true);
  gate.resolve();
  await flushing;
  assert.equal(store.getState().isPersistingDraft, false);
  assert.equal((await storage.loadLibrary()).drafts[0].name, 'latest edit');
});

test('flushing during an in-progress deletion cannot resurrect the deleted draft', async () => {
  const backend = memoryStorage();
  const { store, storage } = setup(undefined, backend);
  store.getState().createTrip('A');
  const id = store.getState().currentTrip.id;
  await store.getState().flushDrafts();
  const gate = deferred();
  const remove = backend.removeItem;
  backend.removeItem = async (...args) => { await gate.promise; return remove(...args); };
  const deleting = store.getState().deleteTrip(id);
  await store.getState().flushDrafts();
  gate.resolve();
  await deleting;
  assert.equal((await storage.loadLibrary()).drafts.length, 0);
});

test('opening a saved trip resumes its newer draft and preserves both snapshots', async () => {
  const { store, storage } = setup();
  const saved = trip('A', [place('first')], { name: 'saved name', revision: 1 });
  const draft = { ...saved, name: 'unfinished name', revision: 2, places: [place('first', { stayDuration: 90 })] };
  await storage.saveTrip(saved);
  await storage.saveDraft(draft);
  await store.getState().initialize();
  store.getState().createTrip('B');
  await store.getState().flushDrafts();
  await store.getState().loadTrip('A');
  assert.equal(store.getState().currentTrip.name, 'unfinished name');
  assert.equal(store.getState().currentTrip.places[0].stayDuration, 90);
  assert.equal(store.getState().isDirty, true);
  await store.getState().flushDrafts();
  assert.equal((await storage.getAllTrips()).find(item => item.id === 'A').name, 'saved name');
  assert.equal((await storage.getTrip('A')).name, 'unfinished name');
});

test('resuming a straight-line fallback recalculates even before its normal freshness expires', async () => {
  const response = deferred();
  let calls = 0;
  const { store, storage } = setup(() => { calls++; return response.promise; });
  const fallback = trip('old-estimate', [place('A'), place('B')], { legs: [leg('A', 'B', {
    mode: 'walking', source: 'straight-line', status: 'estimated', reason: 'network', calculatedAt: new Date().toISOString(),
  })] });
  await storage.saveTrip(fallback);
  await storage.saveDraft(fallback);
  await store.getState().initialize();
  assert.equal(calls, 1);
  assert.equal(store.getState().summary.totalTime, null);
  response.resolve({ ...estimate(25), source: 'tmap' });
  await tick();
  await store.getState().flushDrafts();
  assert.equal(store.getState().summary.totalTravelTime, 25);
  assert.equal((await storage.getTrip(fallback.id)).legs[0].source, 'tmap');
});

test('foreground marks aged routes for explicit retry without calls and preserves manual input', async () => {
  const realNow = Date.now;
  const startedAt = realNow();
  const requests = [];
  const { store, storage } = setup(() => { const request = deferred(); requests.push(request); return request.promise; });
  const cached = trip('active-day', [place('A'), place('B'), place('C'), place('D')], { legs: [
    leg('A', 'B', { source: 'tmap', calculatedAt: new Date(startedAt).toISOString() }),
    leg('B', 'C', { source: 'tmap', calculatedAt: new Date(startedAt).toISOString() }),
    leg('C', 'D', { source: 'manual', status: 'estimated', duration: 7, reason: 'manual' }),
  ] });
  put(store, cached);
  store.setState({ savedTrips: [cached] });
  try {
    Date.now = () => startedAt + 24 * 60 * 60 * 1000;
    await store.getState().refreshExpiredRoutes();
    const current = store.getState().currentTrip;
    assert.deepEqual(Array.from(current.legs, edge => edge.duration), [null, null, 7]);
    assert.deepEqual(Array.from(current.legs, edge => edge.distance), [null, null, 1000]);
    assert.equal(store.getState().summary.totalTravelTime, null);
    assert.equal(store.getState().savedTrips[0].legs[1].duration, null);
    assert.equal(store.getState().drafts[0].legs[1].duration, null);
    assert.equal(current.revision, cached.revision);
    assert.equal(requests.length, 0);
    assert.equal(current.legs[0].status, 'unavailable');
    assert.equal(current.legs[0].reason, 'stale');
    const refresh = store.getState().recalculateTravelTimes();
    assert.equal(requests.length, 1);
    await store.getState().refreshExpiredRoutes();
    assert.equal(requests.length, 1, 'a timer tick cannot restart an in-flight calculation');
    requests[0].resolve({ ...estimate(25), source: 'tmap', calculatedAt: new Date(Date.now()).toISOString() });
    await tick();
    assert.equal(requests.length, 2);
    requests[1].resolve({ ...estimate(35), source: 'tmap', calculatedAt: new Date(Date.now()).toISOString() });
    await refresh;
    assert.equal(store.getState().summary.totalTravelTime, 67);
    assert.equal(store.getState().currentTrip.legs[2].source, 'manual');
    await store.getState().flushDrafts();
    assert.equal((await storage.getTrip(cached.id)).legs[0].duration, 25);
    assert.equal(store.getState().savedTrips[0].legs[1].duration, 35);
  } finally { Date.now = realNow; }
});

test('foreground freshness marks the 15-minute boundary without automatic retry loops', async () => {
  const realNow = Date.now;
  const startedAt = realNow();
  let calls = 0;
  const { store, storage } = setup(async () => { calls++; return {
    ...estimate(), status: 'unavailable', duration: null, distance: null, source: 'none', reason: 'network',
  }; });
  const cached = trip('freshness', [place('A'), place('B')], { legs: [leg('A', 'B', {
    source: 'tmap', calculatedAt: new Date(startedAt).toISOString(),
  })] });
  put(store, cached);
  try {
    Date.now = () => startedAt + 15 * 60 * 1000 - 1;
    await store.getState().refreshExpiredRoutes();
    assert.equal(calls, 0);
    Date.now = () => startedAt + 15 * 60 * 1000;
    await store.getState().refreshExpiredRoutes();
    assert.equal(calls, 0);
    assert.equal(store.getState().summary.totalTravelTime, null);
    assert.equal(store.getState().currentTrip.legs[0].status, 'unavailable');
    await store.getState().recalculateTravelTimes();
    assert.equal(calls, 1);
    await store.getState().refreshExpiredRoutes();
    assert.equal(calls, 1);
    await storage.flushStorage();
  } finally { Date.now = realNow; }
});

test('foreground expiry clears inactive library values without requesting their routes', async () => {
  let calls = 0;
  const { store } = setup(async () => { calls++; return estimate(); });
  const old = trip('inactive', [place('A'), place('B'), place('C')], { legs: [
    leg('A', 'B', { source: 'tmap', calculatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }),
    leg('B', 'C', { source: 'manual', status: 'estimated', duration: 0, reason: 'manual' }),
  ] });
  store.setState({ initialized: true, currentTrip: null, savedTrips: [old], drafts: [old] });
  await store.getState().refreshExpiredRoutes();
  assert.equal(calls, 0);
  assert.equal(store.getState().savedTrips[0].legs[0].duration, null);
  assert.equal(store.getState().drafts[0].legs[0].distance, null);
  assert.equal(store.getState().savedTrips[0].legs[1].duration, 0);
  assert.equal(store.getState().currentTrip, null);
});

test('foreground refresh preserves legacy and manual estimates without requesting new routes', async () => {
  let calls = 0;
  const { store } = setup(async () => { calls++; return estimate(); });
  const old = trip('manual', [place('A'), place('B'), place('C')], { legs: [
    leg('A', 'B', { source: 'none', status: 'estimated', reason: 'legacy-unverified' }),
    leg('B', 'C', { source: 'manual', status: 'estimated', duration: 0, reason: 'manual' }),
  ] });
  put(store, old);
  await store.getState().refreshExpiredRoutes();
  assert.equal(calls, 0);
  assert.equal(store.getState().currentTrip, old);
  assert.equal(store.getState().summary.totalTravelTime, 20);
});

test('saving and refreshing the library retains Kakao session summaries but writes no route values', async () => {
  const request = deferred();
  const { store, storage, backend } = setup(() => request.promise);
  put(store, plan());
  const run = store.getState().recalculateTravelTimes();
  await store.getState().saveCurrentTrip();
  request.resolve({ ...estimate(26), source: 'kakao' });
  await run;
  await store.getState().saveCurrentTrip();
  await store.getState().loadAllTrips();
  assert.equal(store.getState().summary.totalTravelTime, 26);
  assert.equal(store.getState().savedTrips[0].legs[0].duration, 26);
  assert.equal(store.getState().drafts[0].legs[0].duration, 26);
  assert.equal(store.getState().isDirty, false);
  await store.getState().flushDrafts();
  const disk = JSON.parse(backend.data.get(storage.LIBRARY_KEY));
  for (const stored of [disk.savedTrips[0], disk.drafts[0]]) {
    assert.equal(stored.legs[0].source, 'kakao');
    assert.equal(stored.legs[0].status, 'unavailable');
    assert.equal(stored.legs[0].reason, 'stale');
    assert.equal(stored.legs[0].duration, null);
    assert.equal(stored.legs[0].distance, null);
  }
});

test('restarting restores saved and draft fields, re-queries Kakao and preserves manual inputs', async () => {
  const backend = memoryStorage();
  const first = setup(async () => ({ ...estimate(20), source: 'kakao' }), backend);
  const initial = trip('resume-kakao', [place('A', { stayDuration: 0 }), place('B'), place('C')], {
    name: 'saved day', revision: 7, date: '2026-11-01', startTimeMinutes: 620, bufferMinutes: 15,
    legs: [leg('A', 'B', { source: 'kakao', calculatedAt: new Date().toISOString() }),
      leg('B', 'C', { source: 'manual', status: 'estimated', duration: 13, reason: 'manual' })],
  });
  put(first.store, initial);
  await first.store.getState().saveCurrentTrip();
  first.store.getState().setTripName('unsaved draft name');
  await first.store.getState().flushDrafts();
  const request = deferred();
  let calls = 0;
  const second = setup(() => { calls++; return request.promise; }, backend);
  await second.store.getState().initialize();
  assert.equal(calls, 1);
  const active = second.store.getState().currentTrip;
  assert.equal(active.id, initial.id);
  assert.equal(active.name, 'unsaved draft name');
  assert.equal(active.revision, 8);
  assert.equal(active.date, initial.date);
  assert.equal(active.startTimeMinutes, 620);
  assert.equal(active.bufferMinutes, 15);
  assert.equal(active.places[0].stayDuration, 0);
  assert.equal(active.legs[0].status, 'pending');
  assert.equal(active.legs[1].duration, 13);
  assert.equal(second.store.getState().savedTrips[0].name, 'saved day');
  assert.equal(second.store.getState().summary.totalTime, null);
  assert.equal(second.store.getState().isDirty, true);
  request.resolve({ ...estimate(29), source: 'kakao' });
  await tick();
  assert.equal(second.store.getState().summary.totalTravelTime, 42);
  assert.equal(second.store.getState().savedTrips[0].legs[0].duration, 29);
  assert.equal(second.store.getState().savedTrips[0].name, 'saved day');
  await second.store.getState().flushDrafts();
});

test('Kakao walking and cycling reuse a session result across schedule edits but not endpoint or mode changes', async () => {
  for (const mode of ['walking', 'bicycling']) {
    let calls = 0;
    const { store, storage } = setup(async () => { calls++; return { ...estimate(16), source: 'kakao' }; });
    const initial = plan();
    initial.legs[0].mode = mode;
    put(store, initial);
    await store.getState().recalculateTravelTimes();
    store.getState().setSchedule({ date: '2026-11-01', startTimeMinutes: 600 });
    store.getState().setStayDuration('A', 90);
    await tick();
    assert.equal(calls, 1);
    assert.equal(store.getState().summary.totalTravelTime, 16);
    const time = loadTs('src/utils/timeCalculator.ts');
    assert.equal(store.getState().currentTrip.legs[0].departureAt, time.departureAtForLeg(store.getState().currentTrip, 0));
    store.getState().updatePlace('A', { latitude: 37.6 });
    await tick();
    assert.equal(calls, 2);
    store.getState().setLegMode('leg:A:B', mode === 'walking' ? 'bicycling' : 'walking');
    await tick();
    assert.equal(calls, 3);
    store.getState().retryLeg('leg:A:B');
    await tick();
    assert.equal(calls, 4);
    await storage.flushStorage();
  }
});

test('schedule edits share an in-flight walking request and merge its result into the latest departure', async () => {
  const request = deferred();
  let calls = 0;
  const { store, storage } = setup(() => { calls++; return request.promise; });
  put(store, plan());
  const original = store.getState().recalculateTravelTimes();
  store.getState().setStayDuration('A', 120);
  store.getState().setSchedule({ date: '2026-11-02', startTimeMinutes: 500 });
  assert.equal(calls, 1);
  request.resolve({ ...estimate(18), source: 'kakao' });
  await original;
  await tick();
  assert.equal(store.getState().summary.totalTravelTime, 18);
  assert.equal(store.getState().currentTrip.places[0].stayDuration, 120);
  const time = loadTs('src/utils/timeCalculator.ts');
  assert.equal(store.getState().currentTrip.legs[0].departureAt, time.departureAtForLeg(store.getState().currentTrip, 0));
  assert.equal(store.getState().isLoading, false);
  await storage.flushStorage();
});

test('foreground keeps Kakao walking session values and marks traffic stale until explicit retry or resume', async () => {
  const realNow = Date.now;
  const startedAt = realNow();
  const calls = [];
  const { store, storage } = setup(async (from, to, mode) => { calls.push(mode); return {
    ...estimate(14), source: 'kakao', calculatedAt: new Date(Date.now()).toISOString(),
  }; });
  const cached = trip('mixed', [place('A'), place('B'), place('C')], { legs: [
    leg('A', 'B', { source: 'kakao', mode: 'driving', calculatedAt: new Date(startedAt).toISOString() }),
    leg('B', 'C', { source: 'kakao', mode: 'walking', calculatedAt: new Date(startedAt).toISOString() }),
  ] });
  put(store, cached);
  try {
    Date.now = () => startedAt + 15 * 60_000;
    await store.getState().refreshExpiredRoutes();
    await store.getState().refreshExpiredRoutes();
    assert.equal(calls.length, 0);
    assert.equal(store.getState().currentTrip.legs[0].status, 'unavailable');
    assert.equal(store.getState().currentTrip.legs[1].duration, 20);
    assert.equal(store.getState().isLoading, false);
    await store.getState().resumeDraft('mixed');
    await tick();
    assert.deepEqual(calls, ['driving']);
    assert.equal(store.getState().summary.totalTravelTime, 34);
    await store.getState().flushDrafts();
    assert.equal((await storage.getTrip('mixed')).legs[1].duration, null);
  } finally { Date.now = realNow; }
});

test('inactive Kakao library cards also stop displaying stale traffic without spending requests', async () => {
  let calls = 0;
  const { store } = setup(async () => { calls++; return { ...estimate(), source: 'kakao' }; });
  const inactive = trip('inactive-kakao', [place('A'), place('B'), place('C')], { legs: [
    leg('A', 'B', { source: 'kakao', mode: 'driving', calculatedAt: new Date(Date.now() - 15 * 60_000).toISOString() }),
    leg('B', 'C', { source: 'kakao', mode: 'bicycling', calculatedAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString() }),
  ] });
  store.setState({ initialized: true, savedTrips: [inactive], drafts: [inactive] });
  await store.getState().refreshExpiredRoutes();
  assert.equal(calls, 0);
  for (const item of [store.getState().savedTrips[0], store.getState().drafts[0]]) {
    assert.equal(item.legs[0].status, 'unavailable');
    assert.equal(item.legs[0].duration, null);
    assert.equal(item.legs[1].duration, 20);
  }
});

test('creation date survives edits, repeated saves and restart while edit time records user changes', async () => {
  let clock = Date.parse('2026-10-27T01:00:00.000Z');
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  }
  const backend = memoryStorage();
  const { store } = setup(undefined, backend, { Date: ClockDate });
  store.getState().createTrip('first name');
  store.getState().addPlace(place('A'));
  await store.getState().flushDrafts();
  const id = store.getState().currentTrip.id;
  const createdAt = store.getState().currentTrip.createdAt.toISOString();
  assert.equal(createdAt, '2026-10-27T01:00:00.000Z');

  clock = Date.parse('2026-10-28T02:00:00.000Z');
  store.getState().setTripName('edited name');
  assert.equal(store.getState().currentTrip.updatedAt.toISOString(), '2026-10-28T02:00:00.000Z');
  await store.getState().saveCurrentTrip();

  clock = Date.parse('2026-10-29T03:00:00.000Z');
  store.getState().setStayDuration('A', 120);
  store.getState().setSchedule({ date: '2026-11-10' });
  await store.getState().saveCurrentTrip();
  const editedAt = '2026-10-29T03:00:00.000Z';

  clock = Date.parse('2026-10-30T04:00:00.000Z');
  await store.getState().saveCurrentTrip();
  await store.getState().flushDrafts();
  const restarted = setup(undefined, backend, { Date: ClockDate }).store;
  await restarted.getState().initialize();
  await restarted.getState().flushDrafts();
  for (const item of [restarted.getState().currentTrip, restarted.getState().savedTrips[0], restarted.getState().drafts[0]]) {
    assert.equal(item.id, id);
    assert.equal(item.createdAt.toISOString(), createdAt);
    assert.equal(item.updatedAt.toISOString(), editedAt);
    assert.equal(item.date, '2026-11-10');
    assert.equal(item.name, 'edited name');
    assert.equal(item.places[0].stayDuration, 120);
  }
});

test('automatic calculation and reopening preserve saved, current and draft edit timestamps', async () => {
  let clock = Date.parse('2026-10-29T03:00:00.000Z');
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  }
  const requests = [];
  const { store, storage } = setup(() => {
    const request = deferred(); requests.push(request); return request.promise;
  }, memoryStorage(), { Date: ClockDate });
  const original = plan();
  const createdAt = original.createdAt.toISOString();
  const editedAt = original.updatedAt.toISOString();
  put(store, original);
  await store.getState().saveCurrentTrip();
  const checkDates = async () => {
    await store.getState().flushDrafts();
    const persisted = await storage.loadLibrary();
    for (const item of [store.getState().currentTrip, store.getState().drafts[0], store.getState().savedTrips[0],
      persisted.drafts[0], persisted.savedTrips[0]]) {
      assert.equal(item.createdAt.toISOString(), createdAt);
      assert.equal(item.updatedAt.toISOString(), editedAt);
      assert.equal(item.revision, original.revision);
    }
  };
  const calculating = store.getState().recalculateTravelTimes();
  assert.equal(requests.length, 1);
  await checkDates();
  requests[0].resolve({ ...estimate(21), source: 'kakao', calculatedAt: new ClockDate().toISOString() });
  await calculating;
  assert.equal(store.getState().summary.totalTravelTime, 21);
  await checkDates();

  clock = Date.parse('2026-10-30T04:00:00.000Z');
  await store.getState().loadTrip(original.id);
  assert.equal(requests.length, 2);
  await checkDates();
  requests[1].resolve({ ...estimate(27), source: 'kakao', calculatedAt: new ClockDate().toISOString() });
  await tick();
  assert.equal(store.getState().summary.totalTravelTime, 27);
  await checkDates();
});

test('an unsaved rename cannot leak its edit time into the saved version through routing or flush', async () => {
  let clock = Date.parse('2026-10-29T03:00:00.000Z');
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  }
  const { store, storage } = setup(async () => ({ ...estimate(18), calculatedAt: new ClockDate().toISOString() }),
    memoryStorage(), { Date: ClockDate });
  const original = plan();
  put(store, original);
  await store.getState().saveCurrentTrip();
  store.getState().setTripName('unsaved name');
  const editedAt = store.getState().currentTrip.updatedAt.toISOString();
  await store.getState().recalculateTravelTimes();
  await store.getState().flushDrafts();
  for (const saved of [store.getState().savedTrips[0], (await storage.loadLibrary()).savedTrips[0]]) {
    assert.equal(saved.name, original.name);
    assert.equal(saved.revision, original.revision);
    assert.equal(saved.updatedAt.toISOString(), original.updatedAt.toISOString());
    assert.equal(saved.legs[0].duration, 18);
  }
  for (const draft of [store.getState().currentTrip, store.getState().drafts[0], (await storage.loadLibrary()).drafts[0]]) {
    assert.equal(draft.name, 'unsaved name');
    assert.equal(draft.updatedAt.toISOString(), editedAt);
    assert.equal(draft.createdAt.toISOString(), original.createdAt.toISOString());
  }
  clock = Date.parse('2026-10-30T04:00:00.000Z');
  await store.getState().saveCurrentTrip();
  assert.equal(store.getState().savedTrips[0].updatedAt.toISOString(), editedAt);
  assert.equal(store.getState().savedTrips[0].name, 'unsaved name');
});
