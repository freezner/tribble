const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, memoryStorage, deferred } = require('./helpers.cjs');
const KEY = 'tribble:social-profiles:v1';
const tick = () => new Promise(resolve => setImmediate(resolve));
const plain = value => JSON.parse(JSON.stringify(value));
const profile = (platform, handle) => loadTs('src/utils/socialProfiles.ts').parseSocialProfile(platform, handle);
const encoded = profiles => JSON.stringify({ version: 1, profiles });
function setup(backend = memoryStorage()) {
  const { useSocialStore: store, SOCIAL_PROFILES_KEY } = loadTs('src/stores/socialStore.ts', {
    '@react-native-async-storage/async-storage': backend,
  });
  assert.equal(SOCIAL_PROFILES_KEY, KEY);
  return { store, backend };
}

test('empty initialization is read-only and profile saves use a separate versioned key', async () => {
  const { store, backend } = setup(memoryStorage({ 'tribble:library:v2': 'keep trips untouched' }));
  await store.getState().initialize();
  assert.equal(store.getState().initialized, true);
  assert.equal(backend.data.has(KEY), false);
  await store.getState().saveProfile('instagram', '@Trip_1');
  assert.equal(backend.data.get('tribble:library:v2'), 'keep trips untouched');
  assert.deepEqual(JSON.parse(backend.data.get(KEY)), { version: 1, profiles: { instagram: plain(profile('instagram', 'Trip_1')) } });
  assert.equal(store.getState().profiles.instagram.handle, 'Trip_1');
  assert.equal(store.getState().isSaving, false);
});

test('save and remove publish state only after their storage writes succeed', async () => {
  const gates = [deferred(), deferred()];
  let writes = 0;
  const backend = memoryStorage();
  const persist = backend.setItem;
  backend.setItem = async (key, value) => { await gates[writes++].promise; await persist(key, value); };
  const { store } = setup(backend);
  await store.getState().initialize();
  const saving = store.getState().saveProfile('x', 'Trip_1');
  await tick();
  assert.equal(store.getState().isSaving, true);
  assert.equal(store.getState().profiles.x, undefined);
  gates[0].resolve(); await saving;
  const removing = store.getState().removeProfile('x');
  await tick();
  assert.equal(store.getState().profiles.x.handle, 'Trip_1');
  assert.equal(store.getState().isSaving, true);
  gates[1].resolve(); await removing;
  assert.equal(store.getState().profiles.x, undefined);
  assert.equal(store.getState().isSaving, false);
});

test('write failures preserve existing profiles and are redacted and retryable', async () => {
  const original = profile('x', 'original');
  const backend = memoryStorage({ [KEY]: encoded({ x: original }) });
  const persist = backend.setItem;
  backend.setItem = async () => { throw new Error('private provider text'); };
  const { store } = setup(backend);
  await store.getState().initialize();
  await assert.rejects(store.getState().saveProfile('x', 'changed'), /social-profiles-write-failed/);
  await assert.rejects(store.getState().removeProfile('x'), /social-profiles-write-failed/);
  assert.equal(store.getState().profiles.x.handle, 'original');
  assert.equal(JSON.parse(backend.data.get(KEY)).profiles.x.handle, 'original');
  assert.equal(store.getState().error, 'social-profiles-write-failed');
  assert.equal(store.getState().isSaving, false);
  store.getState().clearError();
  assert.equal(store.getState().error, null);
  backend.setItem = persist;
  await store.getState().saveProfile('x', 'changed');
  assert.equal(store.getState().profiles.x.handle, 'changed');
});

test('concurrent writes and removal are serialized without dropping unrelated profiles', async () => {
  const gate = deferred();
  const backend = memoryStorage();
  const persist = backend.setItem;
  let active = 0, peak = 0, writes = 0;
  backend.setItem = async (key, value) => {
    active++; peak = Math.max(peak, active);
    if (++writes === 1) await gate.promise;
    await persist(key, value); active--;
  };
  const { store } = setup(backend);
  const first = store.getState().saveProfile('instagram', 'Trip_1');
  const second = store.getState().saveProfile('x', 'Trip_2');
  const third = store.getState().removeProfile('instagram');
  await tick();
  assert.equal(writes, 1);
  assert.equal(store.getState().isSaving, true);
  gate.resolve(); await Promise.all([first, second, third]);
  assert.equal(peak, 1);
  assert.deepEqual(Object.keys(store.getState().profiles), ['x']);
  assert.equal(JSON.parse(backend.data.get(KEY)).profiles.x.handle, 'Trip_2');
  assert.equal(store.getState().isSaving, false);
});

test('delayed hydration cannot overwrite a newer save, and initialization calls share one read', async () => {
  const reading = deferred();
  let reads = 0;
  const backend = memoryStorage();
  backend.getItem = async () => { reads++; return reading.promise; };
  const { store } = setup(backend);
  const init = store.getState().initialize();
  const duplicate = store.getState().initialize();
  const saving = store.getState().saveProfile('x', 'new_profile');
  await tick();
  assert.equal(reads, 1);
  reading.resolve(encoded({ x: profile('x', 'old_profile'), facebook: profile('facebook', '100012345678901') }));
  await Promise.all([init, duplicate, saving]);
  assert.equal(store.getState().profiles.x.handle, 'new_profile');
  assert.equal(store.getState().profiles.facebook.handle, '100012345678901');
  assert.equal(JSON.parse(backend.data.get(KEY)).profiles.x.handle, 'new_profile');
  await store.getState().initialize();
  assert.equal(reads, 1);
});

test('saving before initialize loads existing profiles and later initialize does not reload stale data', async () => {
  const backend = memoryStorage({ [KEY]: encoded({ instagram: profile('instagram', 'existing') }) });
  const { store } = setup(backend);
  const saving = store.getState().saveProfile('tiktok', 'new_profile');
  const init = store.getState().initialize();
  await Promise.all([saving, init]);
  assert.equal(store.getState().profiles.instagram.handle, 'existing');
  assert.equal(store.getState().profiles.tiktok.handle, 'new_profile');
});

test('read failures allow initialize retry and leave storage and in-memory profiles intact', async () => {
  const existing = profile('x', 'existing');
  const backend = memoryStorage({ [KEY]: encoded({ x: existing }) });
  const read = backend.getItem;
  backend.getItem = async () => { throw new Error('private storage diagnostic'); };
  const { store } = setup(backend);
  store.setState({ profiles: { x: existing } });
  await assert.rejects(store.getState().initialize(), /social-profiles-read-failed/);
  assert.equal(store.getState().initialized, false);
  assert.equal(store.getState().profiles.x.handle, 'existing');
  assert.equal(store.getState().error, 'social-profiles-read-failed');
  backend.getItem = read;
  await store.getState().initialize();
  assert.equal(store.getState().initialized, true);
  assert.equal(store.getState().error, null);
});

test('corrupt data is neither partially hydrated nor overwritten by save or delete', async () => {
  const good = profile('x', 'existing');
  for (const raw of ['{bad JSON', encoded({ x: good, instagram: { platform: 'instagram', handle: 'alice', url: 'javascript:bad' } }),
    JSON.stringify({ version: 2, profiles: {} }), encoded({ unknown: good }),
    encoded({ x: { ...good, url: 'https://evil.example/existing' } }), encoded({ x: { ...good, password: 'never accept extra fields' } })]) {
    const backend = memoryStorage({ [KEY]: raw });
    const { store } = setup(backend);
    store.setState({ profiles: { x: good } });
    await assert.rejects(store.getState().initialize(), /social-profiles-corrupt/);
    await assert.rejects(store.getState().saveProfile('instagram', 'safe_name'), /social-profiles-corrupt/);
    await assert.rejects(store.getState().removeProfile('x'), /social-profiles-corrupt/);
    assert.equal(backend.data.get(KEY), raw);
    assert.equal(store.getState().initialized, false);
    assert.equal(store.getState().profiles.x.handle, 'existing');
    assert.equal(store.getState().isSaving, false);
  }
});

test('one failed queued write does not poison the next write or publish the failed value', async () => {
  const backend = memoryStorage();
  const persist = backend.setItem;
  let writes = 0;
  backend.setItem = async (key, value) => { if (++writes === 1) throw new Error('disk'); await persist(key, value); };
  const { store } = setup(backend);
  const first = store.getState().saveProfile('x', 'will_fail');
  const failed = assert.rejects(first, /social-profiles-write-failed/);
  const second = store.getState().saveProfile('instagram', 'will_succeed');
  await Promise.all([failed, second]);
  assert.equal(store.getState().profiles.x, undefined);
  assert.equal(store.getState().profiles.instagram.handle, 'will_succeed');
  assert.equal(store.getState().error, null);
  assert.equal(store.getState().isSaving, false);
});

test('invalid inputs never touch persistence and only the selected profile is removed', async () => {
  const backend = memoryStorage({ [KEY]: encoded({ x: profile('x', 'existing'), tiktok: profile('tiktok', 'keep_me') }) });
  let reads = 0;
  const read = backend.getItem;
  backend.getItem = async key => { reads++; return read(key); };
  const { store } = setup(backend);
  await assert.rejects(store.getState().saveProfile('x', 'https://evil.example/alice'), /invalid-social-profile/);
  await assert.rejects(store.getState().removeProfile('unknown'), /invalid-social-profile/);
  assert.equal(reads, 0);
  await store.getState().removeProfile('x');
  assert.deepEqual(Object.keys(store.getState().profiles), ['tiktok']);
  assert.equal(JSON.parse(backend.data.get(KEY)).profiles.tiktok.handle, 'keep_me');
});
