const test = require('node:test');
const assert = require('node:assert/strict');
const i18next = require('i18next');
const { loadTs, memoryStorage, deferred } = require('./helpers.cjs');

function languageModule(storage) {
  const instance = i18next.createInstance();
  const module = loadTs('src/i18n/index.ts', {
    i18next: instance,
    'react-i18next': { initReactI18next: { type: '3rdParty', init() {} } },
    '@react-native-async-storage/async-storage': storage,
  });
  return { ...module, instance };
}

test('saved English is read before a default can overwrite it', async () => {
  const storage = memoryStorage({ 'user-language': 'en' });
  const operations = [];
  const module = languageModule({
    getItem: async key => { operations.push('read'); return storage.getItem(key); },
    setItem: async (key, value) => { operations.push(`write:${value}`); await storage.setItem(key, value); },
  });
  await module.i18nReady;
  assert.equal(module.instance.language, 'en');
  assert.equal(storage.data.get('user-language'), 'en');
  assert.deepEqual(operations, ['read', 'write:en']);
});

test('a slow storage read does not prematurely cache Korean', async () => {
  const pending = deferred();
  const writes = [];
  const module = languageModule({ getItem: () => pending.promise, setItem: async (_, value) => writes.push(value) });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(writes.length, 0);
  pending.resolve('ja');
  await module.i18nReady;
  assert.equal(module.instance.language, 'ja');
  assert.deepEqual(writes, ['ja']);
});

test('invalid or unreadable preferences fall back to a supported language', async () => {
  for (const storage of [memoryStorage({ 'user-language': 'invalid' }), {
    getItem: async () => { throw new Error('storage unavailable'); }, setItem: async () => {},
  }]) {
    const module = languageModule(storage);
    await module.i18nReady;
    assert.equal(module.instance.language, 'ko');
  }
});

test('a changed language survives the next initialization', async () => {
  const storage = memoryStorage();
  const first = languageModule(storage);
  await first.i18nReady;
  await first.instance.changeLanguage('zh');
  const second = languageModule(storage);
  await second.i18nReady;
  assert.equal(second.instance.language, 'zh');
  assert.notEqual(second.instance.t('routeReason.no-route'), 'routeReason.no-route');
  assert.notEqual(second.instance.t('manualTravelTime'), 'manualTravelTime');
});

test('automatic routing and optional recovery are translated in every supported language', async () => {
  const module = languageModule(memoryStorage());
  await module.i18nReady;
  const keys = [
    'routeReason.no-route', 'routeReason.provider-coverage', 'routeReason.place-not-found',
    'openKakaoRoute', 'openGoogleRoute', 'mapDepartureHint', 'mapOpenFailed', 'manualDurationHint',
    'autoTravelTime', 'recalculateAutomatically', 'adjustTravelTime', 'tmapAttribution',
    'routeReason.not-configured', 'routeReason.current-traffic',
  ];
  for (const language of module.SUPPORTED_LANGUAGES) {
    await module.instance.changeLanguage(language);
    for (const key of keys) {
      const resource = module.instance.getResource(language, 'translation', key);
      assert.equal(typeof resource, 'string', `${language}: ${key}`);
      assert.ok(resource.trim().length > 0, `${language}: ${key}`);
      assert.equal(module.instance.t(key), resource, `${language}: ${key} must not use a fallback`);
    }
    assert.notEqual(module.instance.t('routeReason.no-route'), module.instance.t('routeReason.provider-coverage'));
    assert.notEqual(module.instance.t('routeReason.provider-coverage'), module.instance.t('routeReason.place-not-found'));
  }
  const korean = module.instance.getResource('ko', 'translation', 'routeReason.no-route');
  assert.match(korean, /경로/);
  assert.doesNotMatch(korean, /직접 입력/);
  assert.doesNotMatch(korean, /갈 수 없|이동할 수 없|통행 불가/);
});


test('every literal UI translation key is present in all four languages', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const files = [path.join(root, 'App.tsx')];
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(file);
      else if (file.endsWith('.tsx')) files.push(file);
    }
  }
  collect(path.join(root, 'src'));
  const keys = new Set(files.flatMap(file => [...fs.readFileSync(file, 'utf8').matchAll(/\bt\(['"]([^'"`]+)['"]\s*(?=[,)])/g)].map(match => match[1])));
  const module = languageModule(memoryStorage());
  await module.i18nReady;
  for (const language of ['ko', 'en', 'ja', 'zh']) {
    for (const key of keys) assert.equal(typeof module.instance.getResource(language, 'translation', key), 'string', `${language}: ${key}`);
  }
});

test('a failed language preference write leaves the current language unchanged', async () => {
  let changed = false;
  const hook = loadTs('src/hooks/useLanguage.ts', {
    'react-i18next': { useTranslation: () => ({ i18n: { language: 'en', changeLanguage: async () => { changed = true; } } }) },
    '../i18n': { isSupportedLanguage: value => ['ko', 'en', 'ja', 'zh'].includes(value) },
    '@react-native-async-storage/async-storage': { setItem: async () => { throw new Error('storage full'); } },
  });
  const value = hook.useLanguage();
  assert.equal(value.currentLanguage, 'en');
  await assert.rejects(value.changeLanguage('ja'), /storage full/);
  assert.equal(changed, false);
});
