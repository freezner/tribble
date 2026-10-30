import { createHash, randomBytes } from 'node:crypto';

export const MAX_BODY_BYTES = 2048;
const MAX_UPSTREAM_BYTES = 4 * 1024 * 1024;
const MINUTE = 60_000;
const DAY = 86_400_000;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

function coordinate(value) {
  return plainObject(value) && Object.keys(value).length === 2 && own(value, 'lat') && own(value, 'lng')
    && typeof value.lat === 'number' && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90
    && typeof value.lng === 'number' && Number.isFinite(value.lng) && Math.abs(value.lng) <= 180;
}

function isoDate(value) {
  if (typeof value !== 'string' || value.length > 35) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, , zone] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  const calendar = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));
  if (parts[0] < 1970 || calendar.getUTCFullYear() !== parts[0] || calendar.getUTCMonth() + 1 !== parts[1]
    || calendar.getUTCDate() !== parts[2] || calendar.getUTCHours() !== parts[3]
    || calendar.getUTCMinutes() !== parts[4] || calendar.getUTCSeconds() !== parts[5]) return null;
  if (zone !== 'Z' && (Number(zone.slice(1, 3)) > 14 || Number(zone.slice(4)) > 59
    || (Number(zone.slice(1, 3)) === 14 && Number(zone.slice(4)) !== 0))) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function validateBody(input) {
  if (!plainObject(input) || Object.keys(input).some(key => !['origin', 'destination', 'mode', 'departureAt'].includes(key))
    || !coordinate(input.origin) || !coordinate(input.destination)
    || !['walking', 'driving', 'transit', 'bicycling'].includes(input.mode)
    || (own(input, 'departureAt') && isoDate(input.departureAt) === null)) return null;
  return {
    origin: { lat: input.origin.lat, lng: input.origin.lng },
    destination: { lat: input.destination.lat, lng: input.destination.lng },
    mode: input.mode,
    ...(own(input, 'departureAt') ? { departureAt: new Date(isoDate(input.departureAt)).toISOString() } : {}),
  };
}

export function validatePlacesBody(input) {
  if (!plainObject(input) || Object.keys(input).length !== 1 || !own(input, 'query')
    || typeof input.query !== 'string' || /[\u0000-\u001f\u007f]/.test(input.query)) return null;
  const query = input.query.trim();
  return Array.from(query).length >= 2 && Array.from(query).length <= 100 ? { query } : null;
}

export function unavailable(reason, timestamp, departureAt) {
  return { status: 'unavailable', duration: null, distance: null, source: 'none', reason,
    calculatedAt: new Date(timestamp).toISOString(), ...(departureAt ? { departureAt } : {}) };
}

const kstMinute = iso => new Date(Date.parse(iso) + 9 * 60 * MINUTE).toISOString().slice(0, 16).replace(/[-T:]/g, '');
const urlWithParams = (base, params) => base + '?' + new URLSearchParams(params).toString();

export function upstreamRequest(input, timestamp, { futureDrivingEnabled = false } = {}) {
  if (input.mode === 'driving') {
    const future = futureDrivingEnabled && input.departureAt && Date.parse(input.departureAt) > timestamp + MINUTE;
    return { kind: future ? 'driving-future' : 'driving-current', url: urlWithParams(
      'https://apis-navi.kakaomobility.com/v1/' + (future ? 'future/' : '') + 'directions', {
        origin: `${input.origin.lng},${input.origin.lat}`,
        destination: `${input.destination.lng},${input.destination.lat}`,
        summary: 'true', alternatives: 'false', priority: 'RECOMMEND',
        ...(future ? { departure_time: kstMinute(input.departureAt) } : {}),
      }) };
  }
  const path = { walking: 'walk', bicycling: 'bicycle', transit: 'publictraffic' }[input.mode];
  return { kind: input.mode, url: urlWithParams('https://dapi.kakao.com/v2/routing/' + path, {
    start_x: String(input.origin.lng), start_y: String(input.origin.lat),
    end_x: String(input.destination.lng), end_y: String(input.destination.lat),
    input_coord: 'WGS84', output_coord: 'WGS84',
  }) };
}

export function placesRequest(input) {
  return { kind: 'places', url: urlWithParams('https://dapi.kakao.com/v2/local/search/keyword.json', {
    query: input.query, size: '15', page: '1', sort: 'accuracy',
  }) };
}

async function readJsonLimited(response) {
  const advertised = Number(response.headers.get('content-length'));
  if (Number.isFinite(advertised) && advertised > MAX_UPSTREAM_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw new Error('invalid-response');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('invalid-response');
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_UPSTREAM_BYTES) throw new Error('invalid-response');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const noWalkingRoute = new Set(['SAME_POINT', 'START_LINK_NOT_FOUND', 'END_LINK_NOT_FOUND',
  'TOO_MANY_SEARCH_LINK', 'TOO_FAR_AWAY', 'ROUTE_RESULT_NOT_FOUND']);
const noTransitRoute = new Set(['STARTNODES_NULL', 'ENDNODES_NULL', 'EQUAL_POINTS', 'NO_RESULTS']);
const noDrivingRoute = new Set([1, 101, 102, 103, 104, 105, 106, 107]);
const providerError = payload => !plainObject(payload) || own(payload, 'error') || own(payload, 'error_type')
  || (own(payload, 'code') && payload.code !== 0);
const errorReason = payload => payload?.code === -10 ? 'quota'
  : [-401, -3, -5].includes(payload?.code) ? 'authentication' : 'upstream-error';

function validSummary(seconds, distance, input) {
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0
    && typeof distance === 'number' && Number.isFinite(distance) && distance >= 0
    && !(seconds === 0 && distance > 0)
    && !(seconds === 0 && distance === 0 && (input.origin.lat !== input.destination.lat || input.origin.lng !== input.destination.lng));
}

export function parseRoute(payload, request, input, timestamp) {
  const fail = reason => unavailable(reason, timestamp, input.departureAt);
  if (providerError(payload)) return fail(errorReason(payload));
  let seconds, distance;
  if (request.kind.startsWith('driving-')) {
    if (!Array.isArray(payload.routes) || !payload.routes.length) return fail('invalid-response');
    const route = payload.routes.find(value => value?.result_code === 0);
    if (!route) return fail(payload.routes.every(value => noDrivingRoute.has(value?.result_code)) ? 'no-route' : 'upstream-error');
    seconds = route.summary?.duration;
    distance = route.summary?.distance;
  } else if (request.kind === 'transit') {
    if (payload.status !== 'OK') return fail(noTransitRoute.has(payload.status) ? 'no-route' : 'upstream-error');
    if (!Array.isArray(payload.routes) || !payload.routes.length) return fail('invalid-response');
    // No departure-time parameter exists. Choose the quickest valid returned route, not a future timetable.
    const summaries = payload.routes.map(route => route?.properties)
      .filter(summary => validSummary(summary?.totalTime, summary?.totalDistance, input));
    if (!summaries.length) return fail('invalid-response');
    const summary = summaries.reduce((best, value) => value.totalTime < best.totalTime ? value : best);
    seconds = summary.totalTime;
    distance = summary.totalDistance;
  } else {
    if (payload.status !== 'OK') return fail(noWalkingRoute.has(payload.status) ? 'no-route' : 'upstream-error');
    seconds = payload.route?.properties?.totalTime;
    distance = payload.route?.properties?.totalDistance;
  }
  if (!validSummary(seconds, distance, input)) return fail('invalid-response');
  const differentTrafficTime = request.kind === 'driving-current' && input.departureAt
    && Math.abs(Date.parse(input.departureAt) - timestamp) > MINUTE;
  const reasons = { 'driving-current': 'current-traffic', 'driving-future': 'predicted-traffic',
    walking: 'walking-route', bicycling: 'bicycling-route', transit: 'current-schedule' };
  return { status: differentTrafficTime || request.kind === 'transit' ? 'estimated' : 'ready', duration: Math.ceil(seconds / 60),
    distance, source: 'kakao', reason: reasons[request.kind], calculatedAt: new Date(timestamp).toISOString(),
    ...(input.departureAt ? { departureAt: input.departureAt } : {}) };
}

export function parsePlaces(payload) {
  if (providerError(payload)) throw new Error(errorReason(payload));
  if (!Array.isArray(payload.documents) || payload.documents.length > 15) throw new Error('invalid-response');
  const places = [], ids = new Set();
  const decimal = value => typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : NaN;
  for (const value of payload.documents) {
    const latitude = decimal(value?.y), longitude = decimal(value?.x);
    if (typeof value?.id !== 'string' || !/^\d{1,30}$/.test(value.id)
      || typeof value.place_name !== 'string' || !value.place_name.trim() || value.place_name.length > 200
      || typeof value.address_name !== 'string' || value.address_name.length > 500
      || typeof value.road_address_name !== 'string' || value.road_address_name.length > 500
      || !Number.isFinite(latitude) || Math.abs(latitude) > 90
      || !Number.isFinite(longitude) || Math.abs(longitude) > 180) continue;
    const id = 'kakao:' + value.id;
    if (ids.has(id)) continue;
    ids.add(id);
    places.push({ id, name: value.place_name.trim(), address: value.road_address_name.trim() || value.address_name.trim(),
      latitude, longitude, countryCode: 'KR' });
  }
  if (payload.documents.length && !places.length) throw new Error('invalid-response');
  return { places };
}

function config(env) {
  const boolean = key => {
    if (env[key] === undefined || env[key] === '' || env[key] === 'false') return false;
    if (env[key] === 'true') return true;
    throw new Error('invalid-config');
  };
  const integer = (key, fallback, min, max) => {
    if (env[key] === undefined || env[key] === '') return fallback;
    if (!/^\d+$/.test(env[key])) throw new Error('invalid-config');
    const value = Number(env[key]);
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error('invalid-config');
    return value;
  };
  return {
    key: env.KAKAO_REST_API_KEY?.trim(),
    futureDrivingEnabled: boolean('KAKAO_FUTURE_DRIVING_ENABLED'),
    timeout: integer('ROUTE_UPSTREAM_TIMEOUT_MS', 8000, 100, 10000),
    perMinute: integer('ROUTE_RATE_LIMIT_PER_MINUTE', 30, 1, 300),
    dailyLimit: integer('ROUTE_UPSTREAM_DAILY_LIMIT', 900, 1, 900),
    concurrency: integer('ROUTE_MAX_CONCURRENT', 4, 1, 20),
    origins: new Set((env.ROUTE_ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean)),
  };
}

export function createKakaoService({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  // No completed response cache: only live operations and non-content rate counters are retained.
  const inFlight = new Map(), clients = new Map(), attempts = new Map();
  const salt = randomBytes(16).toString('hex');
  const digest = value => createHash('sha256').update(salt + value).digest('hex');
  let active = 0;

  async function handle(endpoint, { method = 'POST', headers = {}, body, clientIp = 'unknown' } = {}) {
    const timestamp = now();
    const responseHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    const reply = (statusCode, result, extra = {}) => ({ statusCode, headers: { ...responseHeaders, ...extra }, body: result });
    const failure = (status, reason, departureAt, extra) => reply(status, endpoint === 'places'
      ? { places: [], reason, calculatedAt: new Date(timestamp).toISOString() }
      : unavailable(reason, timestamp, departureAt), extra);
    let settings;
    try { settings = config(env); } catch { return failure(503, 'server-configuration'); }
    const origin = headers.origin;
    if (origin) {
      if (typeof origin !== 'string' || !settings.origins.has(origin)) return failure(403, 'origin-not-allowed');
      responseHeaders['Access-Control-Allow-Origin'] = origin;
      responseHeaders.Vary = 'Origin';
    }
    if (method === 'OPTIONS') return reply(204, null, { 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    if (method !== 'POST') return failure(405, 'method-not-allowed', undefined, { Allow: 'POST, OPTIONS' });
    if (typeof headers['content-type'] !== 'string' || headers['content-type'].split(';')[0].trim().toLowerCase() !== 'application/json') return failure(415, 'invalid-content-type');
    let input;
    try {
      const serialized = typeof body === 'string' ? body : Buffer.isBuffer(body) ? body.toString('utf8') : JSON.stringify(body);
      if (typeof serialized !== 'string' || Buffer.byteLength(serialized) > MAX_BODY_BYTES) return failure(413, 'request-too-large');
      input = (endpoint === 'places' ? validatePlacesBody : validateBody)(JSON.parse(serialized));
    } catch { return failure(400, 'invalid-request'); }
    if (!input) return failure(400, 'invalid-request');
    if (!settings.key) return failure(503, 'not-configured', input.departureAt);

    for (const [key, value] of clients) if (value.until <= timestamp) clients.delete(key);
    const clientKey = digest(String(clientIp));
    let client = clients.get(clientKey);
    if (!client) {
      if (clients.size >= 10000) return failure(429, 'rate-limit', input.departureAt, { 'Retry-After': '60' });
      client = { count: 0, until: timestamp + MINUTE };
      clients.set(clientKey, client);
    }
    if (++client.count > settings.perMinute) return failure(429, 'rate-limit', input.departureAt,
      { 'Retry-After': String(Math.max(1, Math.ceil((client.until - timestamp) / 1000))) });

    const request = endpoint === 'places' ? placesRequest(input) : upstreamRequest(input, timestamp, settings);
    const requestKey = digest(JSON.stringify([request.kind, input]));
    if (inFlight.has(requestKey)) {
      const shared = await inFlight.get(requestKey);
      return reply(shared.statusCode, shared.body, shared.headers['Retry-After'] ? { 'Retry-After': shared.headers['Retry-After'] } : {});
    }
    // Rolling 24 hours avoids a reset-time mismatch with the provider. This is not a global billing cap.
    const recent = (attempts.get(request.kind) ?? []).filter(value => value > timestamp - DAY);
    attempts.set(request.kind, recent);
    if (recent.length >= settings.dailyLimit) return failure(429, 'daily-limit', input.departureAt,
      { 'Retry-After': String(Math.max(1, Math.ceil((recent[0] + DAY - timestamp) / 1000))) });
    if (active >= settings.concurrency) return failure(429, 'busy', input.departureAt, { 'Retry-After': '2' });
    recent.push(timestamp);
    active++;

    const operation = Promise.resolve().then(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), settings.timeout);
      try {
        const response = await fetchImpl(request.url, { method: 'GET',
          headers: { Accept: 'application/json', Authorization: 'KakaoAK ' + settings.key },
          signal: controller.signal, redirect: 'error' });
        if (!response.ok) {
          // Some Kakao quota failures use HTTP 400/code -10. Inspect only bounded JSON, never reflect it.
          let errorPayload;
          try { errorPayload = await readJsonLimited(response); } catch { /* Status still identifies standard HTTP errors. */ }
          if (controller.signal.aborted) throw new Error('timeout');
          if (response.status === 401 || response.status === 403 || errorReason(errorPayload) === 'authentication') return failure(502, 'authentication', input.departureAt);
          if (response.status === 429 || errorReason(errorPayload) === 'quota') return failure(429, 'quota', input.departureAt, { 'Retry-After': '60' });
          return failure(502, 'upstream-error', input.departureAt);
        }
        const payload = await readJsonLimited(response);
        if (endpoint === 'places') return reply(200, parsePlaces(payload));
        const result = parseRoute(payload, request, input, now());
        if (result.reason === 'quota') return reply(429, result, { 'Retry-After': '60' });
        return reply(result.status === 'unavailable' && result.reason !== 'no-route' ? 502 : 200, result);
      } catch (error) {
        const reason = controller.signal.aborted ? 'timeout' : error instanceof SyntaxError || error?.message === 'invalid-response'
          ? 'invalid-response' : ['upstream-error', 'authentication', 'quota'].includes(error?.message) ? error.message : 'network';
        return failure(controller.signal.aborted ? 504 : reason === 'quota' ? 429 : 502, reason, input.departureAt,
          reason === 'quota' ? { 'Retry-After': '60' } : {});
      } finally {
        clearTimeout(timer);
        active--;
        inFlight.delete(requestKey);
      }
    });
    inFlight.set(requestKey, operation);
    return operation;
  }
  return { route: args => handle('route', args), places: args => handle('places', args) };
}

export const createRouteService = options => createKakaoService(options).route;
export const createPlacesService = options => createKakaoService(options).places;

