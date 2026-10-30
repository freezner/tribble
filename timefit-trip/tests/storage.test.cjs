const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, memoryStorage, place, trip, leg } = require('./helpers.cjs');
const setup = backend => loadTs('src/utils/storage.ts', { '@react-native-async-storage/async-storage': backend });

test('legacy migration preserves stays, flags unverified routes and removes ghost last edge', async () => {
  const old = { id: 'old', name: 'old', places: [place('A', { travelTimeToNext: 12, transportModeToNext: 'transit' }), place('B', { travelTimeToNext: 99 })], totalAvailableTime: 480, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-02T00:00:00Z' };
  const backend = memoryStorage({ trips: JSON.stringify([old]), activeTrip: 'old' });
  const storage = setup(backend);
  const library = await storage.loadLibrary();
  const migrated = library.savedTrips[0];
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.bufferMinutes, 0);
  assert.equal(migrated.places[0].stayDuration, 60);
  assert.equal(migrated.places[0].travelTimeToNext, undefined);
  assert.equal(migrated.legs.length, 1);
  assert.equal(migrated.legs[0].duration, 12);
  assert.equal(migrated.legs[0].status, 'estimated');
  assert.equal(migrated.legs[0].reason, 'legacy-unverified');
  assert.equal(migrated.legs[0].mode, 'transit');
  assert.ok(migrated.createdAt instanceof Date);
  assert.equal(library.drafts[0].id, 'old');
  assert.equal(backend.data.get('trips'), JSON.stringify([old]));
});

test('write failure rejects and leaves prior data intact', async () => {
  const backend = memoryStorage();
  const storage = setup(backend);
  await storage.loadLibrary();
  const before = backend.data.get(storage.LIBRARY_KEY);
  backend.setItem = async () => { throw new Error('disk full'); };
  await assert.rejects(storage.saveTrip(trip('A')), /disk full/);
  assert.equal(backend.data.get(storage.LIBRARY_KEY), before);
});

test('read failure cannot overwrite library with an empty list', async () => {
  let writes = 0;
  const storage = setup({ getItem: async () => { throw new Error('read failed'); }, setItem: async () => { writes++; } });
  await assert.rejects(storage.saveTrip(trip('A')), /read failed/);
  assert.equal(writes, 0);
});

test('malformed stored JSON is retained and blocks mutation', async () => {
  const backend = memoryStorage({ 'tribble:library:v2': '{broken' });
  const storage = setup(backend);
  await assert.rejects(storage.saveTrip(trip('A')));
  assert.equal(backend.data.get(storage.LIBRARY_KEY), '{broken');
});

test('concurrent deletes are serialized and both remove their drafts', async () => {
  const backend = memoryStorage();
  const storage = setup(backend);
  await storage.saveTrip(trip('A'));
  await storage.saveTrip(trip('B'));
  await Promise.all([storage.deleteTrip('A'), storage.deleteTrip('B')]);
  const library = await storage.loadLibrary();
  assert.equal(library.savedTrips.length, 0);
  assert.equal(library.drafts.length, 0);
});

test('pending saved snapshot receives route result without overwriting later user edits', async () => {
  const storage = setup(memoryStorage());
  const pending = trip('A', [place('a'), place('b')], { legs: [leg('a', 'b', { status: 'pending', duration: null })] });
  await storage.saveTrip(pending);
  const ready = { ...pending, legs: [leg('a', 'b')] };
  await storage.saveDraft(ready, true, true);
  assert.equal((await storage.getAllTrips())[0].legs[0].duration, 20);
  const changed = { ...ready, revision: 1, places: [place('a', { stayDuration: 120 }), place('b')] };
  await storage.saveDraft(changed, true, true);
  assert.equal((await storage.getAllTrips())[0].places[0].stayDuration, 60);
  assert.equal((await storage.getTrip('A')).places[0].stayDuration, 120);
});

test('new drafts preserve previous drafts and latest active selection', async () => {
  const storage = setup(memoryStorage());
  await storage.saveDraft(trip('A'));
  await storage.saveDraft(trip('B'));
  const library = await storage.loadLibrary();
  assert.equal(library.drafts.length, 2);
  assert.equal(library.activeTripId, 'B');
});

test('explicit deletion also removes legacy recovery copies', async () => {
  const old = { id: 'old', name: 'old', places: [place('A')], totalAvailableTime: 480 };
  const backend = memoryStorage({ trips: JSON.stringify([old]), activeTrip: 'old' });
  const storage = setup(backend);
  await storage.loadLibrary();
  await storage.deleteTrip('old');
  assert.equal(backend.data.has('trips'), false);
  assert.equal(backend.data.has('activeTrip'), false);
  assert.equal((await storage.loadLibrary()).savedTrips.length, 0);
});

test('legacy cleanup failure cannot partially commit a v2 deletion', async () => {
  for (const action of ['delete', 'clear']) {
    const backend = memoryStorage();
    const storage = setup(backend);
    await storage.saveTrip(trip('A', [place('A')]));
    const before = backend.data.get(storage.LIBRARY_KEY);
    backend.removeItem = async () => { throw new Error('legacy cleanup failed'); };
    await assert.rejects(action === 'delete' ? storage.deleteTrip('A') : storage.clearTrips(), /legacy cleanup failed/);
    assert.equal(backend.data.get(storage.LIBRARY_KEY), before);
    assert.equal((await storage.loadLibrary()).savedTrips[0].id, 'A');
  }
});

test('final deletion write failure preserves authoritative v2 after legacy cleanup', async () => {
  const backend = memoryStorage({ trips: JSON.stringify([{ id: 'A', name: 'A', places: [place('A')] }]), activeTrip: 'A' });
  const storage = setup(backend);
  await storage.loadLibrary();
  const before = backend.data.get(storage.LIBRARY_KEY);
  backend.setItem = async () => { throw new Error('final write failed'); };
  await assert.rejects(storage.deleteTrip('A'), /final write failed/);
  assert.equal(backend.data.get(storage.LIBRARY_KEY), before);
  assert.equal(backend.data.has('trips'), false);
  assert.equal((await storage.loadLibrary()).savedTrips[0].id, 'A');
});

test('country metadata survives v2 save, resume and unrelated library writes', async () => {
  const storage = setup(memoryStorage());
  const plan = trip('korea', [place('chodang', { countryCode: 'KR' }), place('busan', { countryCode: 'KR' })]);
  await storage.saveTrip(plan);
  await storage.saveDraft(plan);
  await storage.saveDraft(trip('other'));
  const restored = await storage.getTrip('korea');
  assert.equal(restored.places[0].countryCode, 'KR');
  assert.equal(restored.places[1].countryCode, 'KR');
  const library = await storage.loadLibrary();
  assert.equal(library.savedTrips.find(item => item.id === 'korea').places[0].countryCode, 'KR');
  assert.equal(library.drafts.find(item => item.id === 'korea').places[1].countryCode, 'KR');
});

test('legacy country metadata is normalized when present and never guessed when missing', async () => {
  const old = { id: 'old', name: 'old', places: [
    place('known', { countryCode: 'kr' }), place('missing'), place('invalid', { countryCode: 'KOR' }),
  ] };
  const storage = setup(memoryStorage({ trips: JSON.stringify([old]) }));
  const restored = (await storage.loadLibrary()).savedTrips[0];
  assert.equal(restored.places[0].countryCode, 'KR');
  assert.equal(restored.places[1].countryCode, undefined);
  assert.equal(restored.places[2].countryCode, undefined);
});

test('route result from changed country metadata cannot update a different saved input', async () => {
  const storage = setup(memoryStorage());
  const pending = trip('A', [place('a'), place('b')], { legs: [leg('a', 'b', { status: 'pending', duration: null })] });
  await storage.saveTrip(pending);
  const changed = { ...pending, places: pending.places.map(item => ({ ...item, countryCode: 'KR' })),
    legs: [leg('a', 'b', { status: 'unavailable', duration: null, source: 'none', reason: 'provider-coverage' })] };
  await storage.saveDraft(changed, true, true);
  assert.equal((await storage.getAllTrips())[0].legs[0].status, 'pending');
  assert.equal((await storage.getTrip('A')).legs[0].reason, 'provider-coverage');
});

test('fresh TMAP results preserve their provider on save and restore', async () => {
  const storage = setup(memoryStorage());
  const plan = trip('tmap', [place('A'), place('B')], { legs: [leg('A', 'B', {
    source: 'tmap', status: 'estimated', reason: 'current-traffic', calculatedAt: new Date().toISOString(),
  })] });
  await storage.saveTrip(plan);
  assert.equal((await storage.getTrip('tmap')).legs[0].source, 'tmap');
  assert.equal((await storage.getTrip('tmap')).legs[0].reason, 'current-traffic');
});

test('reading and writing removes expired TMAP cache values while keeping manual plans', async () => {
  const old = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const expired = trip('tmap', [place('A'), place('B')], { legs: [leg('A', 'B', { source: 'tmap', calculatedAt: old })] });
  const manual = { ...expired, id: 'manual', legs: [{ ...expired.legs[0], source: 'manual', status: 'estimated' }] };
  const backend = memoryStorage({ 'tribble:library:v2': JSON.stringify({ version: 2, savedTrips: [expired, manual], drafts: [expired], activeTripId: 'tmap' }) });
  const storage = setup(backend);
  const restored = await storage.loadLibrary();
  assert.equal(restored.savedTrips[0].legs[0].status, 'pending');
  assert.equal(restored.savedTrips[0].legs[0].duration, null);
  assert.equal(restored.savedTrips[0].legs[0].distance, null);
  assert.equal(restored.savedTrips[1].legs[0].duration, 20);
  assert.equal(JSON.parse(backend.data.get(storage.LIBRARY_KEY)).drafts[0].legs[0].duration, null);
  await storage.saveDraft(expired);
  assert.equal(JSON.parse(backend.data.get(storage.LIBRARY_KEY)).drafts[0].legs[0].duration, null);
});

test('Kakao results are session-only while manual input and provider failures survive persistence', async () => {
  const backend = memoryStorage();
  const storage = setup(backend);
  const plan = trip('kakao', [place('A'), place('B'), place('C'), place('D')], { revision: 4, legs: [
    leg('A', 'B', { source: 'kakao', duration: 31, distance: 4567, calculatedAt: new Date().toISOString() }),
    leg('B', 'C', { source: 'manual', status: 'estimated', duration: 0, distance: null, reason: 'manual' }),
    leg('C', 'D', { source: 'kakao', status: 'unavailable', duration: null, distance: null, reason: 'quota' }),
  ] });
  await storage.saveDraft(plan);
  await storage.saveTrip(plan);
  await storage.saveDraft(plan, true, true);
  const disk = JSON.parse(backend.data.get(storage.LIBRARY_KEY));
  for (const stored of [disk.savedTrips[0], disk.drafts[0]]) {
    assert.equal(stored.name, plan.name);
    assert.equal(stored.revision, 4);
    assert.equal(stored.places[0].stayDuration, 60);
    assert.equal(stored.legs[0].source, 'kakao');
    assert.equal(stored.legs[0].status, 'unavailable');
    assert.equal(stored.legs[0].reason, 'stale');
    assert.equal(stored.legs[0].duration, null);
    assert.equal(stored.legs[0].distance, null);
    assert.equal(stored.legs[0].calculatedAt, undefined);
    assert.equal(stored.legs[1].duration, 0);
    assert.equal(stored.legs[1].source, 'manual');
    assert.equal(stored.legs[2].reason, 'quota');
  }
  assert.equal(plan.legs[0].duration, 31, 'serialization must not mutate the live session');
  assert.equal((await storage.getTrip('kakao')).legs[0].source, 'kakao');
});

test('hydration removes old persisted Kakao values and preserves Google, TMAP and manual compatibility', async () => {
  const providers = ['kakao', 'google', 'tmap', 'manual'];
  const plans = providers.map(source => trip(source, [place('A'), place('B')], { legs: [leg('A', 'B', {
    source, calculatedAt: new Date().toISOString(), status: source === 'manual' ? 'estimated' : 'ready',
  })] }));
  const backend = memoryStorage({ 'tribble:library:v2': JSON.stringify({ version: 2, savedTrips: plans, drafts: plans, activeTripId: 'kakao' }) });
  const storage = setup(backend);
  const library = await storage.loadLibrary();
  assert.equal(library.activeTripId, 'kakao');
  for (const list of [library.savedTrips, library.drafts]) {
    assert.deepEqual(Array.from(list, item => item.legs[0].source), providers);
    assert.deepEqual(Array.from(list, item => item.legs[0].duration), [null, 20, 20, 20]);
    assert.ok(list[0].createdAt instanceof Date);
  }
  const disk = JSON.parse(backend.data.get(storage.LIBRARY_KEY));
  assert.equal(disk.savedTrips[0].legs[0].duration, null);
  assert.equal(disk.drafts[0].legs[0].distance, null);
});

test('route-only draft synchronization preserves the saved version timestamps and hydrates existing dates', async () => {
  const storage = setup(memoryStorage());
  const saved = trip('A', [place('a'), place('b')], {
    name: 'saved name', revision: 2,
    createdAt: new Date('2026-10-25T01:00:00.000Z'), updatedAt: new Date('2026-10-26T02:00:00.000Z'),
    legs: [leg('a', 'b', { status: 'pending', duration: null })],
  });
  await storage.saveTrip(saved);
  const edited = { ...saved, name: 'draft name', revision: 3, updatedAt: new Date('2026-10-29T03:00:00.000Z'),
    legs: [leg('a', 'b', { duration: 22 })] };
  await storage.saveDraft(edited, true, true);
  await storage.saveDraft(trip('unrelated'));
  const library = await storage.loadLibrary();
  const restoredSaved = library.savedTrips.find(item => item.id === 'A');
  const restoredDraft = library.drafts.find(item => item.id === 'A');
  assert.equal(restoredSaved.name, 'saved name');
  assert.equal(restoredSaved.legs[0].duration, 22);
  assert.equal(restoredSaved.createdAt.toISOString(), saved.createdAt.toISOString());
  assert.equal(restoredSaved.updatedAt.toISOString(), saved.updatedAt.toISOString());
  assert.equal(restoredDraft.name, 'draft name');
  assert.equal(restoredDraft.createdAt.toISOString(), saved.createdAt.toISOString());
  assert.equal(restoredDraft.updatedAt.toISOString(), edited.updatedAt.toISOString());
  await storage.saveTrip(edited);
  await storage.saveTrip(edited);
  const resaved = (await storage.loadLibrary()).savedTrips.find(item => item.id === 'A');
  assert.equal(resaved.createdAt.toISOString(), saved.createdAt.toISOString());
  assert.equal(resaved.updatedAt.toISOString(), edited.updatedAt.toISOString());
});
