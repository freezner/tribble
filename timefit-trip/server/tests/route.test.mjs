import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createKakaoService, createRouteService, upstreamRequest, validateBody } from '../src/route.mjs';
import { readRequestBody, createHandler, resolveClientIp } from '../src/http.mjs';

const NOW = Date.parse('2026-10-27T03:00:00Z');
const KEY = 'mock-only-secret-not-a-real-key';
const input = (extra = {}) => ({ origin: { lat: 37.5665, lng: 126.978 }, destination: { lat: 37.5701, lng: 126.985 }, mode: 'walking', ...extra });
const call = (body = input(), extra = {}) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body, clientIp: '192.0.2.1', ...extra });
const walkingData = (extra = {}) => ({ status: 'OK', route: { properties: { totalTime: 601, totalDistance: 800, ...extra } } });
const drivingData = (extra = {}) => ({ routes: [{ result_code: 0, summary: { duration: 1200, distance: 8000, ...extra } }] });
const transitData = () => ({ status: 'OK', routes: [{ properties: { totalTime: 1800, totalDistance: 4000 } }, { properties: { totalTime: 1201, totalDistance: 4500 } }] });
const response = (data = walkingData(), status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const mockFetch = async url => response(url.includes('kakaomobility') ? drivingData() : url.includes('publictraffic') ? transitData() : walkingData());
const setup = ({ fetchImpl = mockFetch, env = {}, now = () => NOW } = {}) => createRouteService({ fetchImpl, now, env: { KAKAO_REST_API_KEY: KEY, ...env } });

test('walking uses the new public API, geographic coordinates, server-only authorization and seconds to minutes', async () => {
  let request;
  const result = await setup({ fetchImpl: async (url, options) => { request = { url: new URL(url), ...options }; return response(); } })(call());
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.duration, 11);
  assert.equal(result.body.distance, 800);
  assert.equal(result.body.source, 'kakao');
  assert.equal(result.body.reason, 'walking-route');
  assert.equal(request.url.origin + request.url.pathname, 'https://dapi.kakao.com/v2/routing/walk');
  assert.equal(request.url.searchParams.get('start_x'), '126.978');
  assert.equal(request.url.searchParams.get('start_y'), '37.5665');
  assert.equal(request.headers.Authorization, 'KakaoAK ' + KEY);
  assert.equal(request.method, 'GET');
  assert.equal(request.body, undefined);
  assert.equal(request.redirect, 'error');
  assert.equal(request.url.toString().includes(KEY), false);
  assert.equal(JSON.stringify(result).includes(KEY), false);
});

test('bicycling uses public bicycle API and leaves the documented bicycle-road preference default', async () => {
  let url;
  const result = await setup({ fetchImpl: async value => { url = new URL(value); return response(); } })(call(input({ mode: 'bicycling' })));
  assert.equal(url.pathname, '/v2/routing/bicycle');
  assert.equal(url.searchParams.has('departure_time'), false);
  assert.equal(url.searchParams.has('route_mode'), false);
  assert.equal(result.body.status, 'ready');
  assert.equal(result.body.reason, 'bicycling-route');
});

test('future driving sends the planned departure as a KST minute and does not require an undocumented echo', async () => {
  let url;
  const result = await setup({ env: { KAKAO_FUTURE_DRIVING_ENABLED: 'true' }, fetchImpl: async value => { url = new URL(value); return response(drivingData()); } })(call(input({ mode: 'driving', departureAt: '2026-10-28T01:23:45Z' })));
  assert.equal(url.origin + url.pathname, 'https://apis-navi.kakaomobility.com/v1/future/directions');
  assert.equal(url.searchParams.get('departure_time'), '202610281023');
  assert.equal(url.searchParams.get('origin'), '126.978,37.5665');
  assert.equal(url.searchParams.get('summary'), 'true');
  assert.equal(result.body.reason, 'predicted-traffic');
  assert.equal(result.body.status, 'ready');
  assert.equal(result.body.duration, 20);
  assert.equal(result.body.departureAt, '2026-10-28T01:23:45.000Z');
});

test('past driving uses current traffic with estimated status; current driving is ready', async () => {
  const past = input({ mode: 'driving', departureAt: '2026-10-26T01:00:00Z' });
  const request = upstreamRequest(past, NOW);
  assert.equal(new URL(request.url).pathname, '/v1/directions');
  assert.equal(new URL(request.url).searchParams.has('departure_time'), false);
  const result = await setup()(call(past));
  assert.equal(result.body.status, 'estimated');
  assert.equal(result.body.reason, 'current-traffic');
  assert.equal((await setup()(call(input({ mode: 'driving' })))).body.status, 'ready');
});

test('driving switches to future only beyond the one-minute tolerance', () => {
  assert.equal(upstreamRequest(input({ mode: 'driving', departureAt: new Date(NOW + 60_000).toISOString() }), NOW, { futureDrivingEnabled: true }).kind, 'driving-current');
  assert.equal(upstreamRequest(input({ mode: 'driving', departureAt: new Date(NOW + 60_001).toISOString() }), NOW, { futureDrivingEnabled: true }).kind, 'driving-future');
});

test('future trips use explicitly estimated current traffic by default, before any API attempt fails', async () => {
  for (const enabled of [undefined, '', 'false']) {
    let url, calls = 0;
    const result = await setup({ env: { KAKAO_FUTURE_DRIVING_ENABLED: enabled }, fetchImpl: async value => {
      url = new URL(value); calls++; return response(drivingData());
    } })(call(input({ mode: 'driving', departureAt: '2026-10-28T01:00:00Z' })));
    assert.equal(url.pathname, '/v1/directions');
    assert.equal(url.searchParams.has('departure_time'), false);
    assert.equal(result.body.status, 'estimated');
    assert.equal(result.body.reason, 'current-traffic');
    assert.equal(calls, 1);
  }
});

test('future API flag accepts only explicit true or false strings', async () => {
  let calls = 0;
  for (const value of ['TRUE', '1', 'yes', ' false ', true, false]) {
    const result = await setup({ env: { KAKAO_FUTURE_DRIVING_ENABLED: value }, fetchImpl: async () => { calls++; return response(); } })(call());
    assert.equal(result.statusCode, 503);
    assert.equal(result.body.reason, 'server-configuration');
  }
  assert.equal(calls, 0);
});

test('transit selects the quickest valid route and is always estimated without claiming future timetables', async () => {
  let url;
  const result = await setup({ fetchImpl: async value => { url = new URL(value); return response(transitData()); } })(call(input({ mode: 'transit', departureAt: '2026-10-28T01:00:00Z' })));
  assert.equal(url.pathname, '/v2/routing/publictraffic');
  assert.equal(url.searchParams.has('departure_time'), false);
  assert.equal(result.body.duration, 21);
  assert.equal(result.body.distance, 4500);
  assert.equal(result.body.status, 'estimated');
  assert.equal(result.body.reason, 'current-schedule');
  assert.equal((await setup()(call(input({ mode: 'transit' })))).body.status, 'estimated');
});

test('documented non-success route codes never become a fabricated duration', async () => {
  for (const status of ['SAME_POINT', 'START_LINK_NOT_FOUND', 'END_LINK_NOT_FOUND', 'TOO_MANY_SEARCH_LINK', 'TOO_FAR_AWAY', 'ROUTE_RESULT_NOT_FOUND']) {
    const result = await setup({ fetchImpl: async () => response({ status }) })(call());
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.reason, 'no-route');
    assert.equal(result.body.duration, null);
  }
  for (const result_code of [1, 101, 102, 103, 104, 105, 106, 107]) {
    assert.equal((await setup({ fetchImpl: async () => response({ routes: [{ result_code }] }) })(call(input({ mode: 'driving' })))).body.reason, 'no-route');
  }
  for (const status of ['STARTNODES_NULL', 'ENDNODES_NULL', 'EQUAL_POINTS', 'NO_RESULTS']) {
    assert.equal((await setup({ fetchImpl: async () => response({ status }) })(call(input({ mode: 'transit' })))).body.reason, 'no-route');
  }
});

test('unknown provider statuses and malformed/negative/zero summaries are not accepted', async () => {
  for (const data of [{}, { error: KEY }, { status: 'NEW_ERROR' }, walkingData({ totalTime: -1 }),
    walkingData({ totalTime: '600' }), walkingData({ totalDistance: -1 }), walkingData({ totalTime: 0 }),
    walkingData({ totalTime: 0, totalDistance: 0 })]) {
    const result = await setup({ fetchImpl: async () => response(data) })(call());
    assert.equal(result.body.status, 'unavailable');
    assert.equal(result.body.duration, null);
    assert.equal(JSON.stringify(result).includes(KEY), false);
  }
  for (const data of [{ routes: [] }, { routes: [{ result_code: 9999 }] }, drivingData({ duration: Infinity })]) {
    assert.equal((await setup({ fetchImpl: async () => response(data) })(call(input({ mode: 'driving' })))).body.status, 'unavailable');
  }
  const transit = await setup({ fetchImpl: async () => response({ status: 'OK', routes: [{ properties: { totalTime: -5, totalDistance: 200 } }] }) })(call(input({ mode: 'transit' })));
  assert.equal(transit.body.reason, 'invalid-response');
});

test('failed future driving is not retried through a different endpoint', async () => {
  let calls = 0;
  const result = await setup({ env: { KAKAO_FUTURE_DRIVING_ENABLED: 'true' }, fetchImpl: async () => { calls++; return response({ message: KEY }, 403); } })(call(input({ mode: 'driving', departureAt: '2026-10-28T01:00:00Z' })));
  assert.equal(result.body.reason, 'authentication');
  assert.equal(calls, 1);
});

test('Kakao quota code -10 remains a quota error even when HTTP is 400 or 200', async () => {
  for (const status of [400, 200]) {
    const result = await setup({ fetchImpl: async () => response({ code: -10, msg: KEY }, status) })(call());
    assert.equal(result.statusCode, 429);
    assert.equal(result.body.reason, 'quota');
    assert.equal(JSON.stringify(result).includes(KEY), false);
  }
});

test('invalid modes, coordinates, extra upstream fields and invalid dates are rejected without network calls', async () => {
  let calls = 0;
  const service = setup({ fetchImpl: async () => { calls++; return response(); } });
  for (const body of [null, [], input({ mode: 'train' }), input({ origin: { lat: '37', lng: 127 } }),
    input({ origin: { lat: 91, lng: 127 } }), input({ destination: { lat: 37, lng: Infinity } }),
    input({ origin: { lat: 37, lng: 127, url: 'https://example.com' } }), input({ url: 'https://example.com' }),
    input({ departureAt: '2026-02-30T12:00:00Z' }), input({ departureAt: '2026-10-27 12:00:00' }),
    input({ departureAt: '2026-10-27T25:00:00Z' }), input({ departureAt: '2026-10-27T12:00:00+99:00' }),
    input({ departureAt: null }), input({ departureAt: '' })]) assert.equal((await service(call(body))).statusCode, 400);
  assert.equal(calls, 0);
  assert.ok(validateBody(input({ departureAt: '2028-02-29T12:00:00+09:00' })));
});

test('method, content type, malformed JSON and oversized bodies fail before upstream', async () => {
  const service = setup({ fetchImpl: () => { throw new Error('Unexpected call'); } });
  assert.equal((await service(call(input(), { method: 'GET' }))).statusCode, 405);
  assert.equal((await service(call(input(), { headers: { 'content-type': 'text/plain' } }))).statusCode, 415);
  assert.equal((await service(call('{'))).statusCode, 400);
  assert.equal((await service(call(' '.repeat(2049)))).statusCode, 413);
});

test('missing Kakao key cannot use a legacy TMAP key; invalid or above-free safeguards fail closed', async () => {
  const missing = await setup({ env: { KAKAO_REST_API_KEY: '', TMAP_API_KEY: KEY } })(call());
  assert.equal(missing.statusCode, 503);
  assert.equal(missing.body.reason, 'not-configured');
  for (const limit of ['unlimited', '901', '0']) {
    assert.equal((await setup({ env: { ROUTE_UPSTREAM_DAILY_LIMIT: limit } })(call())).body.reason, 'server-configuration');
  }
});

test('upstream errors, JSON and network exceptions are redacted; abort timeout is bounded', async () => {
  for (const [status, reason] of [[401, 'authentication'], [403, 'authentication'], [429, 'quota'], [400, 'upstream-error'], [500, 'upstream-error']]) {
    const result = await setup({ fetchImpl: async () => response({ error: KEY + ' private coordinates' }, status) })(call());
    assert.equal(result.body.reason, reason);
    assert.equal(JSON.stringify(result).includes(KEY), false);
  }
  const network = await setup({ fetchImpl: async () => { throw new Error(KEY); } })(call());
  assert.equal(network.body.reason, 'network');
  assert.equal(JSON.stringify(network).includes(KEY), false);
  assert.equal((await setup({ fetchImpl: async () => new Response('not-json') })(call())).body.reason, 'invalid-response');
  const timed = await setup({ env: { ROUTE_UPSTREAM_TIMEOUT_MS: '100' }, fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error(KEY)), { once: true });
  }) })(call());
  assert.equal(timed.statusCode, 504);
  assert.equal(timed.body.reason, 'timeout');
});

test('oversized response body is rejected and cancelled without reading raw content', async () => {
  let cancelled = false;
  const result = await setup({ fetchImpl: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { 'content-length': String(5 * 1024 * 1024) } }) })(call());
  assert.equal(result.body.reason, 'invalid-response');
  assert.equal(cancelled, true);
});

test('timeout while reading an upstream error body is still reported as timeout', async () => {
  const result = await setup({ env: { ROUTE_UPSTREAM_TIMEOUT_MS: '100' }, fetchImpl: async (_url, { signal }) => {
    const body = new ReadableStream({ start(controller) {
      signal.addEventListener('abort', () => controller.error(new Error(KEY)), { once: true });
    } });
    return new Response(body, { status: 500 });
  } })(call());
  assert.equal(result.statusCode, 504);
  assert.equal(result.body.reason, 'timeout');
  assert.equal(JSON.stringify(result).includes(KEY), false);
});

test('completed responses are not cached, even when legacy cache settings are supplied', async () => {
  let calls = 0;
  const service = setup({ env: { ROUTE_CACHE_TTL_SECONDS: '300' }, fetchImpl: async () => { calls++; return response(); } });
  await service(call()); await service(call());
  assert.equal(calls, 2);
});

test('only concurrent identical requests share work, preserving per-request CORS headers', async () => {
  let resolve, calls = 0;
  const wait = new Promise(r => { resolve = r; });
  const service = setup({ env: { ROUTE_ALLOWED_ORIGINS: 'https://one.example,https://two.example' }, fetchImpl: async () => { calls++; await wait; return response(); } });
  const first = service(call(input(), { headers: { 'content-type': 'application/json', origin: 'https://one.example' } }));
  const second = service(call(input(), { headers: { 'content-type': 'application/json', origin: 'https://two.example' } }));
  resolve();
  const results = await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.equal(results[0].headers['Access-Control-Allow-Origin'], 'https://one.example');
  assert.equal(results[1].headers['Access-Control-Allow-Origin'], 'https://two.example');
  await service(call());
  assert.equal(calls, 2);
});

test('synchronous fetch failures do not leave stale in-flight operations', async () => {
  let calls = 0;
  const service = setup({ fetchImpl: () => { calls++; throw new Error(KEY); } });
  await service(call()); await service(call());
  assert.equal(calls, 2);
});

test('per-IP and concurrent safeguards reject excess requests', async () => {
  const limited = setup({ env: { ROUTE_RATE_LIMIT_PER_MINUTE: '1' } });
  await limited(call());
  assert.equal((await limited(call())).body.reason, 'rate-limit');
  let resolve;
  const wait = new Promise(r => { resolve = r; });
  const concurrent = setup({ env: { ROUTE_MAX_CONCURRENT: '1' }, fetchImpl: async () => { await wait; return response(); } });
  const pending = concurrent(call());
  assert.equal((await concurrent(call(input({ mode: 'driving' })))).body.reason, 'busy');
  resolve(); await pending;
});

test('daily safeguards are per API and rolling 24 hours, counting failures too', async () => {
  let clock = NOW;
  const services = createKakaoService({ now: () => clock, env: { KAKAO_REST_API_KEY: KEY, ROUTE_UPSTREAM_DAILY_LIMIT: '1', KAKAO_FUTURE_DRIVING_ENABLED: 'true' },
    fetchImpl: async () => response({ code: -5 }, 403) });
  for (const body of [input(), input({ mode: 'bicycling' }), input({ mode: 'transit' }), input({ mode: 'driving' }), input({ mode: 'driving', departureAt: '2026-10-30T00:00:00Z' })]) {
    assert.equal((await services.route(call(body))).body.reason, 'authentication');
    assert.equal((await services.route(call(body))).body.reason, 'daily-limit');
  }
  assert.equal((await services.places(call({ query: '강릉역' }))).body.reason, 'authentication');
  assert.equal((await services.places(call({ query: '부산역' }))).body.reason, 'daily-limit');
  clock += 12 * 60 * 60 * 1000;
  assert.equal((await services.route(call())).body.reason, 'daily-limit');
  clock += 12 * 60 * 60 * 1000;
  assert.equal((await services.route(call())).body.reason, 'authentication');
});

test('unlisted web origins fail and native callers need no browser Origin', async () => {
  const service = setup();
  assert.equal((await service(call(input(), { headers: { 'content-type': 'application/json', origin: 'https://evil.example' } }))).statusCode, 403);
  assert.equal((await service(call())).statusCode, 200);
  assert.equal((await service(call(undefined, { method: 'OPTIONS' }))).statusCode, 204);
});

test('HTTP parser bounds streamed and pre-parsed request bodies', async () => {
  const req = Readable.from(['a'.repeat(1024), 'b'.repeat(1025)]);
  req.headers = {};
  await assert.rejects(readRequestBody(req), /request-too-large/);
  assert.deepEqual(await readRequestBody({ body: input(), headers: {} }), input());
  await assert.rejects(readRequestBody({ body: input(), headers: { 'content-length': '9999' } }), /request-too-large/);
});

test('client IP headers are ignored unless the local proxy is explicitly trusted', () => {
  const req = { socket: { remoteAddress: '127.0.0.1' }, headers: {
    'x-real-ip': '192.0.2.1', 'x-forwarded-for': '192.0.2.2', 'x-vercel-forwarded-for': '192.0.2.3',
  } };
  for (const value of [undefined, '', 'false', 'TRUE', '1', true]) {
    assert.equal(resolveClientIp(req, { ROUTE_TRUST_LOCAL_PROXY: value }), '127.0.0.1');
  }
});

test('explicitly trusted loopback proxies can supply one valid IPv4 or IPv6 X-Real-IP', () => {
  for (const remoteAddress of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
    for (const realIp of ['192.0.2.1', '2001:db8::1']) {
      const req = { socket: { remoteAddress }, headers: { 'x-real-ip': realIp, 'x-forwarded-for': '192.0.2.99' } };
      assert.equal(resolveClientIp(req, { ROUTE_TRUST_LOCAL_PROXY: 'true' }), realIp);
    }
  }
});

test('trusted local proxies cannot supply malformed, multiple or alternate forwarded IP headers', () => {
  for (const realIp of [undefined, '', 'invalid', '999.1.1.1', '192.0.2.1:443', '[2001:db8::1]',
    '192.0.2.1, 192.0.2.2', '192.0.2.1 192.0.2.2', ' 192.0.2.1 ', ['192.0.2.1'], 123]) {
    const req = { socket: { remoteAddress: '127.0.0.1' }, headers: {
      'x-real-ip': realIp, 'x-forwarded-for': '192.0.2.2', 'x-vercel-forwarded-for': '192.0.2.3',
    } };
    assert.equal(resolveClientIp(req, { ROUTE_TRUST_LOCAL_PROXY: 'true' }), '127.0.0.1');
  }
});

test('non-loopback sockets never gain X-Real-IP trust from the local proxy flag', () => {
  for (const remoteAddress of ['192.0.2.10', '10.0.0.1', '127.0.0.2', '::ffff:10.0.0.1', undefined]) {
    const req = { socket: { remoteAddress }, headers: { 'x-real-ip': '192.0.2.1' } };
    assert.equal(resolveClientIp(req, { ROUTE_TRUST_LOCAL_PROXY: 'true' }), remoteAddress ?? 'unknown');
  }
});

test('Vercel keeps using its platform forwarded header independently of the local proxy flag', () => {
  const req = { socket: { remoteAddress: '192.0.2.10' }, headers: {
    'x-vercel-forwarded-for': '192.0.2.1, 192.0.2.2', 'x-real-ip': '192.0.2.3',
  } };
  assert.equal(resolveClientIp(req, { VERCEL: '1', ROUTE_TRUST_LOCAL_PROXY: 'true' }), '192.0.2.1');
  delete req.headers['x-vercel-forwarded-for'];
  assert.equal(resolveClientIp(req, { VERCEL: '1', ROUTE_TRUST_LOCAL_PROXY: 'true' }), '192.0.2.10');
});

test('Node HTTP handler returns the same normalized result and no-store headers', async () => {
  const server = createServer(createHandler(setup()));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/route`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input()) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).source, 'kakao');
  } finally { server.closeAllConnections(); server.close(); }
});
