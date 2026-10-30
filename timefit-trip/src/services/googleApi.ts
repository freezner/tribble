import axios from 'axios';
import { GOOGLE_API_KEY } from '../constants';
import { GooglePlaceAutocomplete, GooglePlaceDetails, RouteStep, TransportMode, TravelEstimate } from '../types';
import { calculateKoreanRoute, usesKoreanRouting } from './koreanRouting';

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';
const DIRECTIONS_API_BASE = 'https://maps.googleapis.com/maps/api/directions';
const DISTANCE_MATRIX_API_BASE = 'https://maps.googleapis.com/maps/api/distancematrix';
export const REQUEST_TIMEOUT_MS = 10000;

export type GoogleApiErrorCode = 'no-route' | 'place-not-found' | 'provider-coverage' | 'auth' | 'quota' | 'network' | 'timeout' | 'invalid-request' | 'unknown' | 'missing-key' | 'cancelled';

export class GoogleApiError extends Error {
  constructor(public readonly code: GoogleApiErrorCode) {
    super(code);
    this.name = 'GoogleApiError';
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  language?: string;
}

interface Coordinate {
  lat: number;
  lng: number;
  placeId?: string;
  countryCode?: string;
}

const statusError = (status: unknown): GoogleApiError => {
  if (status === 'REQUEST_DENIED') return new GoogleApiError('auth');
  if (status === 'OVER_QUERY_LIMIT' || status === 'OVER_DAILY_LIMIT') return new GoogleApiError('quota');
  if (status === 'ZERO_RESULTS') return new GoogleApiError('no-route');
  if (status === 'NOT_FOUND') return new GoogleApiError('place-not-found');
  if (status === 'INVALID_REQUEST' || status === 'MAX_ROUTE_LENGTH_EXCEEDED' || status === 'MAX_ELEMENTS_EXCEEDED') {
    return new GoogleApiError('invalid-request');
  }
  return new GoogleApiError('unknown');
};

const requestError = (error: unknown): GoogleApiError => {
  if (error instanceof GoogleApiError) return error;
  if (axios.isCancel(error)) return new GoogleApiError('cancelled');
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return new GoogleApiError('timeout');
    if (error.response?.status === 401 || error.response?.status === 403) return new GoogleApiError('auth');
    if (error.response?.status === 429) return new GoogleApiError('quota');
    if (error.response?.status === 400) return new GoogleApiError('invalid-request');
    return new GoogleApiError('network');
  }
  return new GoogleApiError('unknown');
};

const assertKey = () => {
  if (!GOOGLE_API_KEY.trim()) throw new GoogleApiError('missing-key');
};

const isCoordinate = (point: Coordinate) => Number.isFinite(point.lat) && Number.isFinite(point.lng)
  && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;

const isNonnegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const countryCodeOf = (value: unknown): string | undefined =>
  typeof value === 'string' && /^[a-z]{2}$/i.test(value) ? value.toUpperCase() : undefined;

const googleRoutePoint = (point: Coordinate): string => point.placeId && !point.placeId.startsWith('kakao:')
  ? `place_id:${point.placeId}` : `${point.lat},${point.lng}`;

/** Great-circle distance only; this does not establish that a route exists. */
export const calculateStraightDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180)
    * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
};

/** Searches distinguish an empty result from an operational failure. */
export const searchPlaces = async (input: string, options: RequestOptions = {}): Promise<GooglePlaceAutocomplete[]> => {
  if (input.trim().length < 2) return [];
  try {
    assertKey();
    const response = await axios.get(`${PLACES_API_BASE}/autocomplete/json`, {
      timeout: REQUEST_TIMEOUT_MS,
      signal: options.signal,
      params: { input: input.trim(), key: GOOGLE_API_KEY, language: options.language || 'ko' },
    });
    if (response.data.status === 'ZERO_RESULTS') return [];
    if (response.data.status !== 'OK') throw statusError(response.data.status);
    if (!Array.isArray(response.data.predictions)) throw new GoogleApiError('unknown');
    return response.data.predictions.filter((item: GooglePlaceAutocomplete) =>
      item && typeof item.place_id === 'string' && typeof item.structured_formatting?.main_text === 'string');
  } catch (error) {
    throw requestError(error);
  }
};

export const getPlaceDetails = async (placeId: string, options: RequestOptions = {}): Promise<GooglePlaceDetails> => {
  try {
    assertKey();
    if (!placeId) throw new GoogleApiError('invalid-request');
    const response = await axios.get(`${PLACES_API_BASE}/details/json`, {
      timeout: REQUEST_TIMEOUT_MS,
      signal: options.signal,
      params: {
        place_id: placeId, key: GOOGLE_API_KEY,
        fields: 'place_id,name,formatted_address,geometry,address_components', language: options.language || 'ko',
      },
    });
    if (response.data.status !== 'OK') throw statusError(response.data.status);
    const result = response.data.result;
    if (!result || typeof result.place_id !== 'string' || typeof result.name !== 'string'
      || !result.geometry?.location || !isCoordinate(result.geometry.location)) {
      throw new GoogleApiError('unknown');
    }
    const country = Array.isArray(result.address_components) ? result.address_components.find(
      (component: { types?: unknown }) => Array.isArray(component?.types) && component.types.includes('country'),
    ) : undefined;
    return { ...result, formatted_address: result.formatted_address || '', countryCode: countryCodeOf(country?.short_name) };
  } catch (error) {
    throw requestError(error);
  }
};

/** A real route, a clearly marked estimate, or an unresolved leg. */
export const calculateDistance = async (
  origin: Coordinate,
  destination: Coordinate,
  mode: TransportMode = 'walking',
  departureAt?: string | Date,
): Promise<TravelEstimate> => {
  const date = departureAt ? new Date(departureAt) : undefined;
  const validDate = !date || Number.isFinite(date.getTime());
  const metadata = {
    calculatedAt: new Date().toISOString(),
    ...(date && validDate ? { departureAt: date.toISOString() } : {}),
  };
  const unavailable = (reason: string): TravelEstimate => ({
    status: 'unavailable', duration: null, distance: null, source: 'none', reason, ...metadata,
  });
  // Coverage metadata explains an actual empty response; it never prevents a request
  // or replaces a successful route. Coordinates and region bias do not establish country.
  const routeFailure = (status: unknown): TravelEstimate => unavailable(
    status === 'ZERO_RESULTS' && countryCodeOf(origin.countryCode) === 'KR'
      && countryCodeOf(destination.countryCode) === 'KR' && ['driving', 'walking', 'bicycling'].includes(mode)
      ? 'provider-coverage' : statusError(status).code,
  );
  if (!isCoordinate(origin) || !isCoordinate(destination) || !validDate
    || !['driving', 'walking', 'transit', 'bicycling'].includes(mode)) {
    return unavailable('invalid-request');
  }

  // Korea needs a provider with domestic road and pedestrian coverage. Old drafts
  // can lack country metadata; the routing selector also handles those coordinates.
  if (usesKoreanRouting(origin, destination, mode)) {
    return calculateKoreanRoute(origin, destination, mode, metadata.departureAt);
  }

  try {
    assertKey();
    // Driving only accepts present/future departures. Walking/cycling have no
    // time-dependent duration in this API.
    const pastDriving = mode === 'driving' && !!date && date.getTime() < Date.now();
    const usesDeparture = !!date && (mode === 'transit' || (mode === 'driving' && !pastDriving));
    const response = await axios.get(`${DISTANCE_MATRIX_API_BASE}/json`, {
      timeout: REQUEST_TIMEOUT_MS,
      params: {
        origins: googleRoutePoint(origin),
        destinations: googleRoutePoint(destination),
        mode, key: GOOGLE_API_KEY, language: 'ko', region: 'kr',
        ...(usesDeparture && date ? { departure_time: Math.floor(date.getTime() / 1000) } : {}),
      },
    });
    if (response.data.status !== 'OK') return routeFailure(response.data.status);
    const element = response.data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') return routeFailure(element?.status);
    const trafficDuration = element.duration_in_traffic?.value;
    const hasTraffic = mode === 'driving' && usesDeparture && isNonnegativeNumber(trafficDuration);
    const seconds = hasTraffic ? trafficDuration : element.duration?.value;
    if (!isNonnegativeNumber(seconds) || !isNonnegativeNumber(element.distance?.value)) return unavailable('unknown');
    const reason = pastDriving ? 'past-departure'
      : mode === 'driving' && !hasTraffic ? 'traffic-unavailable' : undefined;
    return {
      status: reason ? 'estimated' : 'ready', duration: Math.ceil(seconds / 60),
      distance: element.distance.value, source: 'google', ...(reason ? { reason } : {}), ...metadata,
    };
  } catch (error) {
    const failure = requestError(error);
    return unavailable(failure.code);
  }
};

/** Optional route geometry, not currently used by the planner. */
export const getDirections = async (
  waypoints: Array<{ lat: number; lng: number }>, mode: TransportMode = 'driving',
): Promise<RouteStep[] | null> => {
  if (waypoints.length < 2 || !waypoints.every(isCoordinate)) return null;
  try {
    assertKey();
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediate = waypoints.slice(1, -1);
    const response = await axios.get(`${DIRECTIONS_API_BASE}/json`, {
      timeout: REQUEST_TIMEOUT_MS,
      params: {
        origin: `${origin.lat},${origin.lng}`, destination: `${destination.lat},${destination.lng}`,
        mode, key: GOOGLE_API_KEY, language: 'ko',
        ...(intermediate.length ? { waypoints: intermediate.map(p => `${p.lat},${p.lng}`).join('|') } : {}),
      },
    });
    if (response.data.status !== 'OK') return null;
    const route = response.data.routes?.[0];
    if (!route) return null;
    return route.legs.flatMap((leg: any) => leg.steps.map((step: any) => ({
      startLocation: step.start_location, endLocation: step.end_location,
      distance: step.distance, duration: step.duration, polyline: step.polyline.points,
    })));
  } catch {
    return null;
  }
};
