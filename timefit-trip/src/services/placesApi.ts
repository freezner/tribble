import axios from 'axios';
import { getMapsApiUrl } from './mapsProxy';

export interface PlaceSearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  countryCode: 'KR';
}

export class PlaceSearchError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'PlaceSearchError';
  }
}

const errorCode = (reason: unknown): string | undefined => {
  if (typeof reason !== 'string') return undefined;
  if (['auth', 'quota', 'network', 'timeout', 'invalid-request', 'unknown'].includes(reason)) return reason;
  if (['not-configured', 'server-configuration', 'missing-key'].includes(reason)) return 'missing-key';
  if (reason === 'authentication') return 'auth';
  if (['rate-limit', 'daily-limit', 'busy'].includes(reason)) return 'quota';
  if (reason === 'request-too-large') return 'invalid-request';
  return undefined;
};

const normalizePlace = (value: unknown): PlaceSearchResult => {
  if (!value || typeof value !== 'object') throw new PlaceSearchError('unknown');
  const place = value as Record<string, unknown>;
  if (typeof place.id !== 'string' || !/^kakao:\d+$/.test(place.id)
    || typeof place.name !== 'string' || !place.name.trim()
    || typeof place.address !== 'string' || place.countryCode !== 'KR'
    || typeof place.latitude !== 'number' || !Number.isFinite(place.latitude) || Math.abs(place.latitude) > 90
    || typeof place.longitude !== 'number' || !Number.isFinite(place.longitude) || Math.abs(place.longitude) > 180) {
    throw new PlaceSearchError('unknown');
  }
  // Persist only the normalized fields needed by the planner, never raw provider data.
  return {
    id: place.id, name: place.name.trim(), address: place.address.trim(),
    latitude: place.latitude, longitude: place.longitude, countryCode: 'KR',
  };
};

export const searchPlaces = async (
  query: string, options: { signal?: AbortSignal } = {},
): Promise<PlaceSearchResult[]> => {
  if (options.signal?.aborted) throw new PlaceSearchError('cancelled');
  const text = query.trim();
  if ([...text].length > 100 || /[\u0000-\u001f\u007f]/.test(text)) throw new PlaceSearchError('invalid-request');
  if ([...text].length < 2) return [];
  const endpoint = getMapsApiUrl('places');
  if (!endpoint) throw new PlaceSearchError('missing-key');
  try {
    const response = await axios.post(endpoint, { query: text }, {
      timeout: 15000, signal: options.signal, headers: { 'Content-Type': 'application/json' },
    });
    if (options.signal?.aborted) throw new PlaceSearchError('cancelled');
    if (!response.data || !Array.isArray(response.data.places) || response.data.places.length > 15) {
      throw new PlaceSearchError(errorCode(response.data?.reason) ?? 'unknown');
    }
    const places = response.data.places.map(normalizePlace);
    const seen = new Set<string>();
    return places.filter((place: PlaceSearchResult) => {
      if (seen.has(place.id)) return false;
      seen.add(place.id);
      return true;
    });
  } catch (error) {
    if (options.signal?.aborted || axios.isCancel(error)) throw new PlaceSearchError('cancelled');
    if (error instanceof PlaceSearchError) throw error;
    if (axios.isAxiosError(error)) {
      if (error.code === 'ERR_CANCELED') throw new PlaceSearchError('cancelled');
      const reason = errorCode(error.response?.data?.reason);
      if (reason) throw new PlaceSearchError(reason);
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') throw new PlaceSearchError('timeout');
      if (error.response?.status === 429) throw new PlaceSearchError('quota');
      if (error.response?.status === 401 || error.response?.status === 403) throw new PlaceSearchError('auth');
      if (error.response?.status === 400) throw new PlaceSearchError('invalid-request');
      throw new PlaceSearchError(error.response ? 'unknown' : 'network');
    }
    throw new PlaceSearchError('unknown');
  }
};
