const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, memoryStorage, deferred } = require('./helpers.cjs');
const KEY = 'tribble:card-preferences:v1';
const encoded = title => JSON.stringify({ version: 1, title });
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(backend = memoryStorage()) {
  const { useCardPreferencesStore: store, CARD_PREFERENCES_KEY, CARD_TITLE_MAX_LENGTH } = loadTs('src/stores/cardPreferencesStore.ts', {
    '@react-native-async-storage/async-storage': backend,
  });
  assert.equal(CARD_PREFERENCES_KEY, KEY);
  assert.equal(CARD_TITLE_MAX_LENGTH, 40);
  return { store, backend };
}

test('card title uses separate storage, trims input, and persists the empty default without changing SNS profiles', async () => {
  const socialKey = 'tribble:social-profiles:v1';
  const socialValue = JSON.stringify({ version: 1, profiles: { x: { handle: 'keep_me' } } });
  const { store, backend } = setup(memoryStorage({ [socialKey]: socialValue, 'tribble:library:v2': 'existing trips' }));
  await store.getState().initialize();
  assert.equal(store.getState().title, '');
  assert.equal(backend.data.has(KEY), false, 'default initialization is read-only');
  await store.getState().saveTitle('  나의 여행 ✨  ');
  assert.equal(store.getState().title, '나의 여행 ✨');
  assert.equal(backend.data.get(KEY), encoded('나의 여행 ✨'));
  assert.equal(backend.data.get(socialKey), socialValue);
  assert.equal(backend.data.get('tribble:library:v2'), 'existing trips');
  const reloaded = setup(backend).store;
  await reloaded.getState().initialize();
  assert.equal(reloaded.getState().title, '나의 여행 ✨');
  await reloaded.getState().saveTitle('   ');
  assert.equal(reloaded.getState().title, '');
  assert.equal(backend.data.get(KEY), encoded(''));
  assert.equal(backend.data.get(socialKey), socialValue);
});

test('new titles publish only after durable storage succeeds and failures preserve the saved title', async () => {
  const gate = deferred();
  const backend = memoryStorage({ [KEY]: encoded('original') });
  const persist = backend.setItem;
  backend.setItem = async (key, value) => { await gate.promise; await persist(key, value); };
  const { store } = setup(backend);
  await store.getState().initialize();
  const save = store.getState().saveTitle('changed');
  await tick();
  assert.equal(store.getState().title, 'original');
  assert.equal(store.getState().isSaving, true);
  gate.resolve(); await save;
  assert.equal(store.getState().title, 'changed');
  backend.setItem = async () => { throw new Error('private diagnostic'); };
  await assert.rejects(store.getState().saveTitle('failed'), /card-preferences-write-failed/);
  assert.equal(store.getState().title, 'changed');
  assert.equal(backend.data.get(KEY), encoded('changed'));
  assert.equal(store.getState().error, 'card-preferences-write-failed');
  assert.equal(store.getState().isSaving, false);
  store.getState().clearError();
  assert.equal(store.getState().error, null);
  backend.setItem = persist;
  await store.getState().saveTitle('retried');
  assert.equal(store.getState().title, 'retried');
});

test('delayed hydration is shared and cannot overwrite a newer queued title', async () => {
  const reading = deferred();
  let reads = 0;
  const backend = memoryStorage();
  backend.getItem = async () => { reads++; return reading.promise; };
  const { store } = setup(backend);
  const first = store.getState().initialize();
  const duplicate = store.getState().initialize();
  const saving = store.getState().saveTitle('new title');
  await tick();
  assert.equal(reads, 1);
  reading.resolve(encoded('old title'));
  await Promise.all([first, duplicate, saving]);
  assert.equal(store.getState().title, 'new title');
  assert.equal(backend.data.get(KEY), encoded('new title'));
  await store.getState().initialize();
  assert.equal(reads, 1);
});

test('concurrent title changes are written in order and a failed write does not poison the queue', async () => {
  const gate = deferred();
  const backend = memoryStorage({ [KEY]: encoded('original') });
  const persist = backend.setItem;
  let writes = 0, active = 0, peak = 0;
  backend.setItem = async (key, value) => {
    active++; peak = Math.max(active, peak);
    try {
      if (++writes === 1) { await gate.promise; throw new Error('disk'); }
      await persist(key, value);
    } finally { active--; }
  };
  const { store } = setup(backend);
  const failed = assert.rejects(store.getState().saveTitle('failed'), /card-preferences-write-failed/);
  const last = store.getState().saveTitle('final');
  const init = store.getState().initialize();
  await tick();
  assert.equal(writes, 1);
  assert.equal(store.getState().isSaving, true);
  assert.equal(store.getState().title, 'original');
  gate.resolve(); await Promise.all([failed, last, init]);
  assert.equal(peak, 1);
  assert.equal(store.getState().title, 'final');
  assert.equal(store.getState().error, null);
  assert.equal(store.getState().isSaving, false);
  assert.equal(backend.data.get(KEY), encoded('final'));
});

test('failed reads are redacted, preserve memory and storage, and allow initialization retry', async () => {
  const backend = memoryStorage({ [KEY]: encoded('saved') });
  const read = backend.getItem;
  backend.getItem = async () => { throw new Error('private storage data'); };
  const { store } = setup(backend);
  store.setState({ title: 'memory' });
  await assert.rejects(store.getState().initialize(), /card-preferences-read-failed/);
  assert.equal(store.getState().title, 'memory');
  assert.equal(store.getState().initialized, false);
  assert.equal(store.getState().error, 'card-preferences-read-failed');
  assert.equal(backend.data.get(KEY), encoded('saved'));
  backend.getItem = read;
  await store.getState().initialize();
  assert.equal(store.getState().title, 'saved');
  assert.equal(store.getState().initialized, true);
  assert.equal(store.getState().error, null);
});

test('corrupt or unsupported stored preferences are preserved instead of overwritten with a new title', async () => {
  for (const raw of ['{broken', JSON.stringify({ version: 2, title: '' }), encoded(' title '), encoded('bad\nline'),
    encoded('x'.repeat(41)), JSON.stringify({ version: 1, title: 123 }), JSON.stringify({ version: 1, title: '', extra: true })]) {
    const { store, backend } = setup(memoryStorage({ [KEY]: raw }));
    store.setState({ title: 'memory' });
    await assert.rejects(store.getState().initialize(), /card-preferences-corrupt/);
    await assert.rejects(store.getState().saveTitle('replacement'), /card-preferences-corrupt/);
    assert.equal(store.getState().title, 'memory');
    assert.equal(store.getState().initialized, false);
    assert.equal(store.getState().isSaving, false);
    assert.equal(backend.data.get(KEY), raw);
  }
});

test('title validation rejects controls and excessive length before touching storage, while allowing Korean and emoji', async () => {
  const backend = memoryStorage();
  let reads = 0;
  backend.getItem = async () => { reads++; return null; };
  const { store } = setup(backend);
  for (const input of [null, 123, 'x'.repeat(41), 'a\nb', 'a\tb', 'a\u0000b', 'a\u2028b']) {
    await assert.rejects(store.getState().saveTitle(input), /invalid-card-title/);
  }
  assert.equal(reads, 0);
  assert.equal(backend.data.size, 0);
  await store.getState().saveTitle('가'.repeat(40));
  assert.equal(store.getState().title.length, 40);
  await store.getState().saveTitle('여행 🌿');
  assert.equal(store.getState().title, '여행 🌿');
});
