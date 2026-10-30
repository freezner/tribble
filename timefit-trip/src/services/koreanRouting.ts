import axios from 'axios';
import { TransportMode, TravelEstimate } from '../types';
import { getMapsApiUrl } from './mapsProxy';

export interface RouteCoordinate { lat: number; lng: number; countryCode?: string; }

// A conservative mainland footprint for legacy trips, not a country boundary.
// A single rectangle also contains Tsushima and northern Kyushu. Ambiguous
// border/offshore points therefore need explicit country metadata for Kakao.
const LEGACY_MAINLAND: ReadonlyArray<readonly [number, number]> = [
  [125.8, 34.1], [127.3, 34.1], [128.7, 34.65], [129.25, 35.0],
  [129.65, 35.5], [129.5, 36.6], [129.15, 37.8], [128.4, 38.6], [128.15, 38.25],
  [127.5, 38.28], [127.1, 38.18], [126.65, 37.75], [126.1, 37.5], [125.8, 36.2],
];

const inKoreanServiceArea = ({ lat, lng }: RouteCoordinate): boolean => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const within = (south: number, north: number, west: number, east: number) =>
    lat >= south && lat <= north && lng >= west && lng <= east;
  if (within(33.1, 33.6, 126.1, 126.98) // Jeju and nearby islands
    || within(37.44, 37.56, 130.79, 130.93) // Ulleungdo
    || within(37.23, 37.25, 131.85, 131.88)) return true; // Dokdo

  let inside = false;
  for (let i = 0, j = LEGACY_MAINLAND.length - 1; i < LEGACY_MAINLAND.length; j = i++) {
    const [x, y] = LEGACY_MAINLAND[i];
    const [previousX, previousY] = LEGACY_MAINLAND[j];
    if ((y > lat) !== (previousY > lat)
      && lng < ((previousX - x) * (lat - y)) / (previousY - y) + x) inside = !inside;
  }
  return inside;
};

/** Provider selection hint for old drafts without country metadata, not proof that a route exists. */
export const usesKoreanRouting = (from: RouteCoordinate, to: RouteCoordinate, mode: TransportMode) =>
  ['walking', 'driving', 'transit', 'bicycling'].includes(mode) && [from, to].every(point => {
    const country = point.countryCode?.toUpperCase();
    return country ? country === 'KR' : inKoreanServiceArea(point);
  });

const reasons = new Set(['no-route', 'place-not-found', 'provider-coverage', 'auth', 'quota',
  'network', 'timeout', 'invalid-request', 'unknown', 'not-configured', 'current-traffic', 'past-departure',
  'departure-out-of-range', 'traffic-unavailable', 'predicted-traffic', 'walking-route', 'bicycling-route', 'current-schedule']);
const normalizedReason = (reason: unknown): string | undefined => {
  if (typeof reason !== 'string') return undefined;
  if (reasons.has(reason)) return reason;
  if (reason === 'authentication') return 'auth';
  if (['rate-limit', 'daily-limit', 'busy'].includes(reason)) return 'quota';
  if (reason === 'server-configuration') return 'not-configured';
  if (['invalid-response', 'upstream-error', 'departure-time-mismatch'].includes(reason)) return 'unknown';
  return undefined;
};

export const calculateKoreanRoute = async (
  origin: RouteCoordinate, destination: RouteCoordinate, mode: TransportMode, departureAt?: string,
): Promise<TravelEstimate> => {
  const metadata = { calculatedAt: new Date().toISOString(), ...(departureAt ? { departureAt } : {}) };
  const unavailable = (reason: string): TravelEstimate => ({
    status: 'unavailable', duration: null, distance: null, source: 'none', reason, ...metadata,
  });
  // Only this public endpoint goes into the app. KAKAO_REST_API_KEY stays on the server.
  const endpoint = getMapsApiUrl('route');
  if (!endpoint) return unavailable('not-configured');
  try {
    const response = await axios.post(endpoint, {
      origin: { lat: origin.lat, lng: origin.lng }, destination: { lat: destination.lat, lng: destination.lng },
      mode, ...(departureAt ? { departureAt } : {}),
    }, { timeout: 15000, headers: { 'Content-Type': 'application/json' } });
    const data = response.data;
    if (data?.status === 'unavailable') return unavailable(normalizedReason(data.reason) ?? 'unknown');
    if (!data || !['ready', 'estimated'].includes(data.status) || data.source !== 'kakao'
      || typeof data.duration !== 'number' || !Number.isFinite(data.duration) || data.duration < 0
      || typeof data.distance !== 'number' || !Number.isFinite(data.distance) || data.distance < 0
      || typeof data.calculatedAt !== 'string' || !Number.isFinite(Date.parse(data.calculatedAt))) {
      return unavailable('unknown');
    }
    // Do not accept or persist arbitrary provider payloads, credentials or route geometry.
    return {
      status: data.status, duration: Math.ceil(data.duration), distance: data.distance, source: 'kakao',
      ...(reasons.has(data.reason) ? { reason: data.reason } : {}),
      ...metadata, calculatedAt: data.calculatedAt,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const reason = normalizedReason(error.response?.data?.reason);
      if (reason) return unavailable(reason);
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return unavailable('timeout');
      if (error.response?.status === 429) return unavailable('quota');
      if (error.response?.status === 401 || error.response?.status === 403) return unavailable('auth');
      return unavailable('network');
    }
    return unavailable('unknown');
  }
};
