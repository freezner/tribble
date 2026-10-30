const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, memoryStorage, place, trip, leg } = require('./helpers.cjs');

test('planner → client → Kakao proxy computes a mixed Korean itinerary and strips stored route results (mock upstream)', async () => {
  const { createKakaoService } = await import('../server/src/route.mjs');
  const upstream = [];
  const service = createKakaoService({ env: { KAKAO_REST_API_KEY: 'mock-server-key', KAKAO_FUTURE_DRIVING_ENABLED: 'true' }, fetchImpl: async (url, config) => {
    upstream.push({ url, method: config.method });
    assert.equal(config.headers.Authorization, 'KakaoAK mock-server-key');
    const path = new URL(url).pathname;
    // Contract fixtures only: these are NOT observed Chodang/Busan route times.
    const payload = path.includes('/future/directions')
      ? { routes: [{ result_code: 0, summary: { duration: 18000, distance: 350000 } }] }
      : path.endsWith('/walk')
        ? { status: 'OK', route: { properties: { totalTime: 900, totalDistance: 900 } } }
        : path.endsWith('/bicycle')
          ? { status: 'OK', route: { properties: { totalTime: 600, totalDistance: 1900 } } }
          : { status: 'OK', routes: [{ properties: { totalTime: 1200, totalDistance: 4900 } }] };
    return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } });
  } });
  const originalEndpoint = process.env.EXPO_PUBLIC_KAKAO_API_URL;
  process.env.EXPO_PUBLIC_KAKAO_API_URL = 'https://mock-routing.example/api';
  const axios = {
    post: async (url, body) => {
      assert.equal(url, 'https://mock-routing.example/api/route');
      const response = await service.route({ method: 'POST', headers: { 'content-type': 'application/json' }, body, clientIp: '192.0.2.3' });
      assert.equal(response.statusCode, 200);
      return { data: response.body };
    },
    get: async () => { throw new Error('Domestic legs must not use Google routing'); },
    isAxiosError: () => false, isCancel: () => false,
  };
  try {
    const backend = memoryStorage();
    const storage = loadTs('src/utils/storage.ts', { '@react-native-async-storage/async-storage': backend });
    const api = loadTs('src/services/googleApi.ts', { axios, '../constants': { GOOGLE_API_KEY: '' } });
    const store = loadTs('src/stores/tripStore.ts', { '../utils/storage': storage, '../services/googleApi': api }).useTripStore;
    const plan = trip('mock-integration', [
      place('chodang', { name: '초당순두부마을', latitude: 37.7925599, longitude: 128.9170172, countryCode: 'KR', stayDuration: 0 }),
      place('busan', { name: '부산역', latitude: 35.114495, longitude: 129.03933, countryCode: 'KR', stayDuration: 60 }),
      place('nearby', { name: '모의 도보 목적지', latitude: 35.116, longitude: 129.037, countryCode: 'KR', stayDuration: 0 }),
      place('bike', { latitude: 35.126, longitude: 129.039, countryCode: 'KR', stayDuration: 0 }),
      place('transit', { latitude: 35.156, longitude: 129.059, countryCode: 'KR', stayDuration: 0 }),
    ], { date: '2030-10-27', totalAvailableTime: 600, legs: [
      leg('chodang', 'busan', { mode: 'driving', status: 'pending', duration: null }),
      leg('busan', 'nearby', { mode: 'walking', status: 'pending', duration: null }),
      leg('nearby', 'bike', { mode: 'bicycling', status: 'pending', duration: null }),
      leg('bike', 'transit', { mode: 'transit', status: 'pending', duration: null }),
    ] });
    store.setState({ currentTrip: plan, drafts: [plan], initialized: true });
    await store.getState().recalculateTravelTimes();
    await store.getState().flushDrafts();
    const state = store.getState();
    assert.equal(state.currentTrip.legs[0].source, 'kakao');
    assert.equal(state.currentTrip.legs[0].reason, 'predicted-traffic');
    assert.equal(state.currentTrip.legs[1].reason, 'walking-route');
    assert.equal(state.currentTrip.legs[2].reason, 'bicycling-route');
    assert.equal(state.currentTrip.legs[3].reason, 'current-schedule');
    assert.equal(state.currentTrip.legs[3].status, 'estimated');
    assert.equal(state.summary.totalTravelTime, 345);
    assert.equal(state.summary.totalTime, 435);
    assert.equal(state.summary.remainingTime, 165);
    assert.equal(state.summary.unresolvedLegCount, 0);
    assert.equal(upstream.length, 4);
    assert.match(upstream[0].url, /\/future\/directions\?/);
    assert.match(upstream[1].url, /\/walk\?/);
    assert.match(upstream[2].url, /\/bicycle\?/);
    assert.match(upstream[3].url, /\/publictraffic\?/);
    assert.equal(new URL(upstream[3].url).searchParams.has('departure_time'), false);
    const restored = await storage.getTrip(plan.id);
    assert.equal(restored.legs[0].status, 'unavailable');
    assert.equal(restored.legs[0].reason, 'stale');
    assert.equal(restored.legs[0].duration, null);
    assert.equal(restored.legs[0].distance, null);
    assert.equal(JSON.stringify(state.currentTrip).includes('mock-server-key'), false);
  } finally {
    if (originalEndpoint === undefined) delete process.env.EXPO_PUBLIC_KAKAO_API_URL;
    else process.env.EXPO_PUBLIC_KAKAO_API_URL = originalEndpoint;
  }
});
