const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers.cjs');

const from = { lat: 37.7913, lng: 128.9148, countryCode: 'KR', placeId: 'private-place-id' };
const to = { lat: 35.1152, lng: 129.0415, countryCode: 'KR' };
const departureAt = '2030-01-01T04:00:00.000Z';
const result = { status: 'ready', duration: 267.2, distance: 336000, source: 'kakao', calculatedAt: new Date().toISOString() };
function setup(response = result, endpoint = 'https://routing.example.com/api', googleKey = '') {
  const previous = process.env.EXPO_PUBLIC_KAKAO_API_URL;
  process.env.EXPO_PUBLIC_KAKAO_API_URL = endpoint;
  const calls = [];
  const axios = {
    post: async (url, body, config) => {
      calls.push({ url, body, config });
      if (response?.isAxiosError) throw response;
      return { data: response };
    },
    get: async (url, config) => { calls.push({ url, config }); return { data: { status: 'ZERO_RESULTS' } }; },
    isAxiosError: error => !!error?.isAxiosError,
    isCancel: () => false,
  };
  const mocks = { axios, '../constants': { GOOGLE_API_KEY: googleKey } };
  return {
    api: loadTs('src/services/googleApi.ts', mocks), routes: loadTs('src/services/koreanRouting.ts', mocks), calls,
    restore: () => previous === undefined ? delete process.env.EXPO_PUBLIC_KAKAO_API_URL : process.env.EXPO_PUBLIC_KAKAO_API_URL = previous,
  };
}

test('All four Korean travel modes use the proxy without a Google routing key or manual input', async () => {
  const ctx = setup();
  try {
    for (const mode of ['walking', 'driving', 'transit', 'bicycling']) {
      const value = await ctx.api.calculateDistance(from, to, mode, departureAt);
      assert.equal(value.duration, 268);
      assert.equal(value.source, 'kakao');
      assert.equal(value.status, 'ready');
    }
    assert.equal(ctx.calls.length, 4);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.calls[0].body.origin)), { lat: from.lat, lng: from.lng });
    assert.equal(ctx.calls[0].body.departureAt, departureAt);
    assert.equal(JSON.stringify(ctx.calls).includes('private-place-id'), false);
    assert.equal(JSON.stringify(ctx.calls).includes('appKey'), false);
    assert.equal(ctx.calls[0].config.timeout, 15000);
  } finally { ctx.restore(); }
});

test('legacy Korean coordinates select Kakao for every mode but explicit foreign countries do not', () => {
  const ctx = setup();
  try {
    const select = ctx.routes.usesKoreanRouting;
    assert.equal(select({ ...from, countryCode: undefined }, { ...to, countryCode: undefined }, 'walking'), true);
    assert.equal(select(from, { ...to, countryCode: undefined }, 'driving'), true);
    assert.equal(select(from, { ...to, countryCode: 'JP' }, 'driving'), false);
    assert.equal(select(from, to, 'transit'), true);
    assert.equal(select(from, to, 'bicycling'), true);
    assert.equal(select({ lat: 40.7, lng: -74 }, { lat: 40.8, lng: -74 }, 'walking'), false);
  } finally { ctx.restore(); }
});

test('legacy mainland, Jeju, Ulleungdo and Dokdo points retain Korean routing', () => {
  const ctx = setup();
  try {
    const points = [
      ['Seoul', 37.5665, 126.978], ['Gangneung', 37.7913, 128.9148], ['Busan', 35.1152, 129.0415],
      ['Mokpo', 34.8118, 126.3922], ['Geoje', 34.8806, 128.6211], ['Sokcho', 38.207, 128.591],
      ['Jeju', 33.4996, 126.5312], ['Seogwipo', 33.2541, 126.56], ['Udo', 33.5065, 126.953],
      ['Ulleungdo', 37.4844, 130.9057], ['Dokdo', 37.2411, 131.8658],
    ];
    for (const [name, lat, lng] of points) {
      for (const mode of ['walking', 'driving', 'transit', 'bicycling']) {
        assert.equal(ctx.routes.usesKoreanRouting({ lat, lng }, { lat, lng }, mode), true, `${name}: ${mode}`);
      }
    }
    const offshore = { lat: 34.68, lng: 125.43, countryCode: 'kr' };
    assert.equal(ctx.routes.usesKoreanRouting(offshore, offshore, 'walking'), true, 'explicit KR metadata takes priority over the conservative footprint');
    const foreign = { lat: 37.5665, lng: 126.978, countryCode: 'JP' };
    assert.equal(ctx.routes.usesKoreanRouting(foreign, foreign, 'walking'), false, 'explicit foreign metadata takes priority over coordinates');
  } finally { ctx.restore(); }
});

test('legacy Fukuoka, Dazaifu, Kitakyushu and Tsushima never issue Kakao route requests', async () => {
  const ctx = setup(result, undefined, 'mock');
  try {
    const points = [
      ['Fukuoka', 33.59, 130.4], ['Dazaifu', 33.519, 130.532], ['Kitakyushu', 33.883, 130.875],
      ['Tsushima south', 34.205, 129.287], ['Tsushima north', 34.655, 129.47],
    ];
    for (const [name, lat, lng] of points) {
      for (const mode of ['walking', 'driving', 'transit', 'bicycling']) {
        const point = { lat, lng };
        assert.equal(ctx.routes.usesKoreanRouting(point, point, mode), false, `${name}: ${mode}`);
        assert.equal(ctx.routes.usesKoreanRouting(from, point, mode), false, `${name}: both endpoints must qualify`);
        await ctx.api.calculateDistance(point, point, mode, departureAt);
      }
    }
    assert.equal(ctx.calls.length, points.length * 4);
    assert.ok(ctx.calls.every(call => !call.body && call.url.includes('/distancematrix/')), 'foreign legacy trips keep the Google compatibility path');
  } finally { ctx.restore(); }
});

test('missing or insecure proxy fails explicitly before sending coordinates', async () => {
  for (const endpoint of ['', 'http://routing.example.com/api/route', 'https://user:secret@example.com/api/route', 'https://example.com/api/route?key=secret']) {
    const ctx = setup(result, endpoint);
    try {
      const value = await ctx.api.calculateDistance(from, to, 'driving');
      assert.equal(value.reason, 'not-configured');
      assert.equal(value.duration, null);
      assert.equal(ctx.calls.length, 0);
    } finally { ctx.restore(); }
  }
});

test('malformed or failed provider data cannot become a successful route', async () => {
  for (const response of [{ ...result, duration: -1 }, { ...result, distance: null }, { ...result, calculatedAt: 'bad' }, { ...result, source: 'manual' }, { status: 'unavailable', reason: 'no-route' }]) {
    const ctx = setup(response);
    try {
      const value = await ctx.api.calculateDistance(from, to, 'walking');
      assert.equal(value.status, 'unavailable');
      assert.equal(value.duration, null);
    } finally { ctx.restore(); }
  }
});

test('network and quota errors stay unresolved; current-traffic estimates keep their basis', async () => {
  for (const [response, reason] of [
    [{ isAxiosError: true, code: 'ECONNABORTED' }, 'timeout'],
    [{ isAxiosError: true, response: { status: 429 } }, 'quota'],
    [{ isAxiosError: true, response: { status: 503, data: { reason: 'not-configured' } } }, 'not-configured'],
  ]) {
    const ctx = setup(response);
    try { assert.equal((await ctx.api.calculateDistance(from, to, 'walking')).reason, reason); }
    finally { ctx.restore(); }
  }
  const ctx = setup({ ...result, status: 'estimated', reason: 'current-traffic', secret: 'not copied' });
  try {
    const value = await ctx.api.calculateDistance(from, to, 'driving', departureAt);
    assert.equal(value.status, 'estimated');
    assert.equal(value.reason, 'current-traffic');
    assert.equal(value.secret, undefined);
  } finally { ctx.restore(); }
});

test('planned-departure and walking route results preserve their calculation basis', async () => {
  for (const [mode, reason] of [['driving', 'predicted-traffic'], ['walking', 'walking-route'], ['bicycling', 'bicycling-route'], ['transit', 'current-schedule']]) {
    const ctx = setup({ ...result, reason });
    try {
      const value = await ctx.api.calculateDistance(from, to, mode, departureAt);
      assert.equal(value.reason, reason);
      assert.equal(value.departureAt, departureAt);
    } finally { ctx.restore(); }
  }
});
