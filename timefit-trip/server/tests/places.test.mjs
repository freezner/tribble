import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlacesService, validatePlacesBody } from '../src/route.mjs';

const KEY = 'mock-only-place-key';
const document = (extra = {}) => ({ id: '12345', place_name: '부산역', address_name: '부산 동구 초량동', road_address_name: '부산 동구 중앙대로 206', x: '129.0422', y: '35.1152', ...extra });
const response = (documents = [document()]) => new Response(JSON.stringify({ documents, meta: { is_end: true } }));
const call = (body = { query: '부산역' }, extra = {}) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body, clientIp: '192.0.2.1', ...extra });
const setup = (fetchImpl = async () => response(), env = {}) => createPlacesService({ fetchImpl, env: { KAKAO_REST_API_KEY: KEY, ...env } });

test('keyword search uses fixed official endpoint and returns normalized full places without a second details call', async () => {
  let request, calls = 0;
  const result = await setup(async (url, options) => { calls++; request = { url: new URL(url), ...options }; return response(); })(call({ query: '  부산역  ' }));
  assert.equal(calls, 1);
  assert.equal(request.url.origin + request.url.pathname, 'https://dapi.kakao.com/v2/local/search/keyword.json');
  assert.equal(request.url.searchParams.get('query'), '부산역');
  assert.equal(request.url.searchParams.get('size'), '15');
  assert.equal(request.url.searchParams.get('sort'), 'accuracy');
  assert.equal(request.headers.Authorization, 'KakaoAK ' + KEY);
  assert.deepEqual(result.body, { places: [{ id: 'kakao:12345', name: '부산역', address: '부산 동구 중앙대로 206', latitude: 35.1152, longitude: 129.0422, countryCode: 'KR' }] });
  assert.equal(JSON.stringify(result).includes(KEY), false);
});

test('query parameters are encoded and cannot select another upstream', async () => {
  let url;
  await setup(async value => { url = new URL(value); return response(); })(call({ query: '서울 &url=https://other.example' }));
  assert.equal(url.origin, 'https://dapi.kakao.com');
  assert.equal(url.searchParams.get('query'), '서울 &url=https://other.example');
  assert.equal(url.searchParams.has('url'), false);
});

test('search length, control characters and extra fields are validated before network', async () => {
  let calls = 0;
  const service = setup(async () => { calls++; return response(); });
  for (const query of ['', ' ', '역', '가'.repeat(101), '서울\n역', null, 123]) {
    assert.equal((await service(call({ query }))).statusCode, 400);
  }
  assert.equal((await service(call({ query: '부산역', url: 'https://other.example' }))).statusCode, 400);
  assert.equal(calls, 0);
  assert.ok(validatePlacesBody({ query: '가'.repeat(100) }));
});

test('empty search is successful, address fallback works and duplicate/malformed results are not selectable', async () => {
  assert.deepEqual((await setup(async () => response([]))(call())).body, { places: [] });
  const result = await setup(async () => response([document({ road_address_name: '' }), document(), document({ id: '2', x: 'not-a-number' })]))(call());
  assert.equal(result.body.places.length, 1);
  assert.equal(result.body.places[0].address, '부산 동구 초량동');
  assert.equal((await setup(async () => response([document({ y: '91' })]))(call())).body.reason, 'invalid-response');
  assert.equal((await setup(async () => response([document({ x: '' })]))(call())).body.reason, 'invalid-response');
});

test('malformed provider data and provider error bodies are rejected, never disguised as empty results', async () => {
  for (const payload of [{}, { documents: null }, { documents: [document({ id: '../../bad' })] }, { code: -5, msg: KEY }]) {
    const result = await setup(async () => new Response(JSON.stringify(payload)))(call());
    assert.equal(result.statusCode, 502);
    assert.deepEqual(result.body.places, []);
    assert.ok(result.body.reason);
    assert.equal(JSON.stringify(result).includes(KEY), false);
  }
});

test('search errors use non-200 status, redacted reason and empty places contract', async () => {
  for (const [status, reason] of [[401, 'authentication'], [403, 'authentication'], [429, 'quota'], [500, 'upstream-error']]) {
    const result = await setup(async () => new Response(KEY, { status }))(call());
    assert.equal(result.body.reason, reason);
    assert.deepEqual(result.body.places, []);
    assert.equal(JSON.stringify(result).includes(KEY), false);
  }
  const missing = await setup(undefined, { KAKAO_REST_API_KEY: '' })(call());
  assert.equal(missing.statusCode, 503);
  assert.equal(missing.body.reason, 'not-configured');
});

test('places results are not cached after request completion', async () => {
  let calls = 0;
  const service = setup(async () => { calls++; return response(); });
  await service(call()); await service(call());
  assert.equal(calls, 2);
});
