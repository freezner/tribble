const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers.cjs');

// Tests for the Google adapter; provider dispatch is covered in koreanRouting.test.cjs.
const origin = { lat: 37.5, lng: 127, placeId: 'origin' };
const destination = { lat: 37.51, lng: 127, placeId: 'destination' };
function apiWith(response, key = 'test-key') {
  const calls = [];
  const axios = {
    get: async (url, config) => {
      calls.push({ url, config });
      if (response instanceof Error || response?.isAxiosError || response?.code === 'ERR_CANCELED') throw response;
      return { data: response };
    },
    isAxiosError: error => !!error?.isAxiosError,
    isCancel: error => error?.code === 'ERR_CANCELED',
  };
  return { api: loadTs('src/services/googleApi.ts', { axios, '../constants': { GOOGLE_API_KEY: key }, './koreanRouting': { usesKoreanRouting: () => false } }), calls };
}
const route = (element = {}) => ({ status: 'OK', rows: [{ elements: [{
  status: 'OK', duration: { value: 600 }, distance: { value: 1000 }, ...element,
}] }] });

test('no route remains unresolved instead of inventing a successful walking route', async () => {
  const { api, calls } = apiWith(route({ status: 'ZERO_RESULTS' }));
  const value = await api.calculateDistance(origin, destination, 'walking');
  assert.equal(value.status, 'unavailable');
  assert.equal(value.duration, null);
  assert.equal(value.distance, null);
  assert.equal(value.reason, 'no-route');
  assert.equal(calls.length, 1);
});

test('empty Korean road routes explain provider coverage only with both explicit countries', async () => {
  for (const mode of ['driving', 'walking', 'bicycling']) {
    const { api, calls } = apiWith(route({ status: 'ZERO_RESULTS' }));
    const value = await api.calculateDistance({ ...origin, countryCode: 'KR' }, { ...destination, countryCode: 'KR' }, mode);
    assert.equal(value.reason, 'provider-coverage');
    assert.equal(value.status, 'unavailable');
    assert.equal(value.duration, null);
    assert.equal(calls.length, 1); // Country metadata never prevents a provider request.
  }
  for (const [from, to, mode] of [
    [origin, destination, 'driving'], // Korean coordinates alone are not country evidence.
    [{ ...origin, countryCode: 'KR' }, destination, 'driving'],
    [{ ...origin, countryCode: 'KR' }, { ...destination, countryCode: 'US' }, 'driving'],
    [{ ...origin, countryCode: 'US' }, { ...destination, countryCode: 'US' }, 'walking'],
    [{ ...origin, countryCode: 'KR' }, { ...destination, countryCode: 'KR' }, 'transit'],
  ]) {
    const { api } = apiWith(route({ status: 'ZERO_RESULTS' }));
    assert.equal((await api.calculateDistance(from, to, mode)).reason, 'no-route');
  }
});

test('missing endpoints, authentication and quota are distinct from Korean coverage', async () => {
  for (const [status, reason] of [['NOT_FOUND', 'place-not-found'], ['REQUEST_DENIED', 'auth'], ['OVER_QUERY_LIMIT', 'quota']]) {
    for (const response of [{ status }, route({ status })]) {
      const { api } = apiWith(response);
      const value = await api.calculateDistance({ ...origin, countryCode: 'KR' }, { ...destination, countryCode: 'KR' }, 'driving');
      assert.equal(value.reason, reason);
      assert.equal(value.status, 'unavailable');
      assert.equal(value.duration, null);
    }
  }
});

test('successful Korean driving routes remain usable despite limited regional coverage', async () => {
  const { api, calls } = apiWith(route({ duration_in_traffic: { value: 1261 } }));
  const value = await api.calculateDistance({ ...origin, countryCode: 'KR' }, { ...destination, countryCode: 'KR' }, 'driving', '2030-10-26T13:00:00+09:00');
  assert.equal(calls.length, 1);
  assert.equal(value.status, 'ready');
  assert.equal(value.duration, 22);
  assert.equal(value.source, 'google');
  assert.equal(value.reason, undefined);
});

test('authentication and quota failures are not hidden by a straight-line result', async () => {
  for (const [status, reason] of [['REQUEST_DENIED', 'auth'], ['OVER_QUERY_LIMIT', 'quota']]) {
    const { api } = apiWith({ status });
    const value = await api.calculateDistance(origin, destination, 'walking');
    assert.equal(value.status, 'unavailable');
    assert.equal(value.duration, null);
    assert.equal(value.reason, reason);
  }
});

test('network and timeout failures never substitute a straight-line travel time', async () => {
  for (const [code, reason] of [['ERR_NETWORK', 'network'], ['ECONNABORTED', 'timeout']]) {
    const { api } = apiWith({ isAxiosError: true, code });
    const value = await api.calculateDistance(origin, destination, 'walking');
    assert.equal(value.status, 'unavailable');
    assert.equal(value.source, 'none');
    assert.equal(value.reason, reason);
    assert.equal(value.duration, null);
    assert.equal(value.distance, null);
    assert.ok(Number.isFinite(Date.parse(value.calculatedAt)));
  }
});

test('driving network failures never invent a duration from a fixed speed', async () => {
  for (const [code, reason] of [['ERR_NETWORK', 'network'], ['ECONNABORTED', 'timeout']]) {
    for (const to of [destination, { lat: 35.1796, lng: 129.0756, countryCode: 'KR' }]) {
      const { api } = apiWith({ isAxiosError: true, code });
      const value = await api.calculateDistance({ lat: 37.7913, lng: 128.9148, countryCode: 'KR' }, to, 'driving');
      assert.equal(value.status, 'unavailable');
      assert.equal(value.source, 'none');
      assert.equal(value.reason, reason);
      assert.equal(value.duration, null);
      assert.equal(value.distance, null);
    }
  }
});

test('future driving uses traffic duration at the actual departure time', async () => {
  const { api, calls } = apiWith(route({ duration_in_traffic: { value: 1261 } }));
  const departureAt = '2030-10-26T13:00:00+09:00';
  const value = await api.calculateDistance(origin, destination, 'driving', departureAt);
  assert.equal(value.status, 'ready');
  assert.equal(value.duration, 22);
  assert.equal(calls[0].config.params.departure_time, Date.parse(departureAt) / 1000);
  assert.equal(calls[0].config.timeout, 10000);
  assert.equal(value.departureAt, new Date(departureAt).toISOString());
});

test('past driving and missing traffic information remain marked estimates', async () => {
  const { api, calls } = apiWith(route());
  const past = await api.calculateDistance(origin, destination, 'driving', '2000-01-01T00:00:00Z');
  assert.equal(past.status, 'estimated');
  assert.equal(past.source, 'google');
  assert.equal(past.reason, 'past-departure');
  assert.equal(calls[0].config.params.departure_time, undefined);
  const future = await api.calculateDistance(origin, destination, 'driving', '2030-01-01T00:00:00Z');
  assert.equal(future.reason, 'traffic-unavailable');
});

test('transit sends its scheduled departure while walking omits it', async () => {
  const { api, calls } = apiWith(route());
  const departureAt = '2030-01-01T03:00:00Z';
  await api.calculateDistance(origin, destination, 'transit', departureAt);
  await api.calculateDistance(origin, destination, 'walking', departureAt);
  assert.equal(calls[0].config.params.departure_time, Date.parse(departureAt) / 1000);
  assert.equal(calls[1].config.params.departure_time, undefined);
});

test('Google fallback uses coordinates for Kakao IDs and preserves genuine Google place IDs', async () => {
  for (const [from, to, expectedOrigin, expectedDestination] of [
    [{ ...origin, placeId: 'kakao:123', countryCode: 'KR' }, { ...destination, countryCode: 'JP' }, '37.5,127', 'place_id:destination'],
    [{ ...origin, countryCode: 'JP' }, { ...destination, placeId: 'kakao:456', countryCode: 'KR' }, 'place_id:origin', '37.51,127'],
    [origin, destination, 'place_id:origin', 'place_id:destination'],
  ]) {
    const { api, calls } = apiWith(route());
    const result = await api.calculateDistance(from, to, 'transit', '2030-11-01T04:00:00.000Z');
    assert.equal(result.status, 'ready');
    assert.equal(calls[0].config.params.origins, expectedOrigin);
    assert.equal(calls[0].config.params.destinations, expectedDestination);
    assert.equal(calls[0].config.params.departure_time, Date.parse('2030-11-01T04:00:00.000Z') / 1000);
  }
});

test('malformed durations and invalid coordinates cannot produce a feasible journey', async () => {
  const { api } = apiWith(route({ duration: { value: -20 } }));
  assert.equal((await api.calculateDistance(origin, destination)).status, 'unavailable');
  assert.equal((await api.calculateDistance({ lat: NaN, lng: 0 }, destination)).reason, 'invalid-request');
  assert.equal((await api.calculateDistance(origin, destination, 'walking', 'bad-date')).reason, 'invalid-request');
});

test('missing key fails locally without a paid request', async () => {
  const { api, calls } = apiWith(route(), '');
  assert.equal((await api.calculateDistance(origin, destination)).reason, 'missing-key');
  await assert.rejects(api.searchPlaces('서울'), error => error.code === 'missing-key');
  assert.equal(calls.length, 0);
});

test('search distinguishes no matches from an API error', async () => {
  const empty = apiWith({ status: 'ZERO_RESULTS' });
  assert.equal((await empty.api.searchPlaces('서울')).length, 0);
  const denied = apiWith({ status: 'REQUEST_DENIED' });
  await assert.rejects(denied.api.searchPlaces('서울'), error => error.code === 'auth');
});

test('search forwards cancellation and language, and does not convert cancellation into an empty result', async () => {
  const { api, calls } = apiWith({ code: 'ERR_CANCELED' });
  const controller = new AbortController();
  await assert.rejects(api.searchPlaces('Seoul', { signal: controller.signal, language: 'en' }), error => error.code === 'cancelled');
  assert.equal(calls[0].config.signal, controller.signal);
  assert.equal(calls[0].config.params.language, 'en');
  assert.equal(calls[0].config.timeout, 10000);
});

test('place selection rejects missing geometry so invalid places are not added', async () => {
  const { api } = apiWith({ status: 'OK', result: { name: 'Place', place_id: 'id' } });
  await assert.rejects(api.getPlaceDetails('id'), error => error.code === 'unknown');
});

test('place details extract an optional country only from the provider country component', async () => {
  const result = { place_id: 'chodang', name: '초당순두부마을', formatted_address: '대한민국 강릉시 초당동',
    geometry: { location: { lat: 37.7913, lng: 128.9148 } } };
  for (const [components, expected] of [
    [[{ long_name: '대한민국', short_name: 'KR', types: ['country', 'political'] }], 'KR'],
    [[{ long_name: '대한민국', short_name: 'kr', types: ['country'] }], 'KR'],
    [undefined, undefined],
    [[{ long_name: '강릉시', short_name: 'KR', types: ['locality'] }], undefined],
    [[{ long_name: '대한민국', short_name: 'KOR', types: ['country'] }], undefined],
    [null, undefined],
  ]) {
    const { api, calls } = apiWith({ status: 'OK', result: { ...result, address_components: components } });
    const details = await api.getPlaceDetails('chodang');
    assert.equal(details.countryCode, expected);
    assert.equal(details.name, result.name);
    assert.ok(calls[0].config.params.fields.split(',').includes('address_components'));
  }
});
