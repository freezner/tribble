const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, deferred } = require('./helpers.cjs');

const place = (extra = {}) => ({
  id: 'kakao:123', name: '  부산역  ', address: ' 부산 동구 중앙대로 206 ',
  latitude: 35.115, longitude: 129.042, countryCode: 'KR', ...extra,
});
function service(reply, endpoint = 'https://maps.example.com/api/places') {
  const calls = [];
  const axios = {
    post: async (...args) => { calls.push(args); return typeof reply === 'function' ? reply(...args) : { data: reply }; },
    isAxiosError: value => value?.isAxiosError === true,
    isCancel: value => value?.code === 'ERR_CANCELED',
  };
  const api = loadTs('src/services/placesApi.ts', {
    axios, './mapsProxy': { getMapsApiUrl: kind => { assert.equal(kind, 'places'); return endpoint; } },
  });
  return { ...api, calls };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('place search posts one trimmed query and returns only normalized Kakao fields', async () => {
  const api = service({ places: [place({ providerPayload: { ignored: true } }), place(), place({ id: 'kakao:456' })] });
  const controller = new AbortController();
  const results = await api.searchPlaces('  부산역  ', { signal: controller.signal });
  assert.deepEqual(plain(results), [place({ name: '부산역', address: '부산 동구 중앙대로 206' }), place({ id: 'kakao:456', name: '부산역', address: '부산 동구 중앙대로 206' })]);
  assert.equal(api.calls.length, 1);
  assert.equal(api.calls[0][0], 'https://maps.example.com/api/places');
  assert.deepEqual(plain(api.calls[0][1]), { query: '부산역' });
  assert.equal(api.calls[0][2].signal, controller.signal);
  assert.equal(api.calls[0][2].timeout, 15000);
});

test('short queries, missing proxy, invalid input and pre-cancellation do not send requests', async () => {
  const api = service({ places: [] }, null);
  assert.deepEqual(plain(await api.searchPlaces('  가  ')), []);
  assert.deepEqual(plain(await api.searchPlaces('😀')), []);
  await assert.rejects(api.searchPlaces('부산역'), error => error instanceof api.PlaceSearchError && error.code === 'missing-key');
  await assert.rejects(api.searchPlaces('가'.repeat(101)), error => error.code === 'invalid-request');
  await assert.rejects(api.searchPlaces('부산\n역'), error => error.code === 'invalid-request');
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.searchPlaces('부산역', { signal: controller.signal }), error => error.code === 'cancelled');
  assert.equal(api.calls.length, 0);
  const unicode = service({ places: [] });
  await unicode.searchPlaces('😀'.repeat(100));
  assert.equal(unicode.calls.length, 1, 'the length limit counts Unicode code points');
});

test('a real empty result is distinct from a malformed or invalid result', async () => {
  assert.deepEqual(plain(await service({ places: [] }).searchPlaces('부산역')), []);
  for (const data of [null, {}, { places: null }, { places: [place({ id: 'google:123' })] },
    { places: [place({ id: 'kakao:abc' })] }, { places: [place({ name: ' ' })] },
    { places: [place({ latitude: NaN })] }, { places: [place({ longitude: 181 })] },
    { places: [place({ latitude: '35.115' })] }, { places: [place({ countryCode: 'US' })] },
    { places: Array.from({ length: 16 }, (_, i) => place({ id: `kakao:${i}` })) }]) {
    await assert.rejects(service(data).searchPlaces('부산역'), error => error.code === 'unknown');
  }
});

test('HTTP and transport failures expose stable user-facing codes without provider messages', async () => {
  const cases = [
    [{ response: { status: 503, data: { reason: 'server-configuration' } } }, 'missing-key'],
    [{ response: { status: 401, data: { reason: 'authentication' } } }, 'auth'],
    [{ response: { status: 429, data: { reason: 'daily-limit' } } }, 'quota'],
    [{ response: { status: 413, data: { reason: 'request-too-large' } } }, 'invalid-request'],
    [{ response: { status: 503, data: { reason: 'raw-provider-message' } } }, 'unknown'],
    [{ response: { status: 429 } }, 'quota'], [{ response: { status: 403 } }, 'auth'],
    [{ response: { status: 400 } }, 'invalid-request'], [{ code: 'ECONNABORTED' }, 'timeout'],
    [{ code: 'ETIMEDOUT' }, 'timeout'], [{ code: 'ERR_NETWORK' }, 'network'],
    [{ code: 'ERR_CANCELED' }, 'cancelled'],
  ];
  for (const [failure, code] of cases) {
    const api = service(() => { throw { isAxiosError: true, ...failure }; });
    await assert.rejects(api.searchPlaces('부산역'), error => error instanceof api.PlaceSearchError && error.code === code && error.message === code);
  }
});

test('a request aborted while the proxy replies cannot return selectable places', async () => {
  const pending = deferred();
  const api = service(() => pending.promise);
  const controller = new AbortController();
  const response = api.searchPlaces('부산역', { signal: controller.signal });
  controller.abort();
  pending.resolve({ data: { places: [place()] } });
  await assert.rejects(response, error => error.code === 'cancelled');
});
