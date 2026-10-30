import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlaceWithDuration, TransportMode, TravelLeg, Trip } from '../types';
import { departureAtForLeg, isTmapResultExpired, isValidDate, legId, localDateString, routeInputSignature } from './timeCalculator';

export const LIBRARY_KEY = 'tribble:library:v2';
const LEGACY_TRIPS_KEY = 'trips';
const LEGACY_ACTIVE_KEY = 'activeTrip';
const MODES: TransportMode[] = ['driving', 'walking', 'transit', 'bicycling'];

export interface TripLibrary {
  version: 2;
  savedTrips: Trip[];
  drafts: Trip[];
  activeTripId: string | null;
}

let ioQueue: Promise<unknown> = Promise.resolve();
const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = ioQueue.then(operation, operation);
  ioQueue = result.then(() => undefined, () => undefined);
  return result;
};
const validNumber = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const timestamp = (value: unknown): Date => {
  const date = new Date(value as string);
  return Number.isFinite(date.getTime()) ? date : new Date();
};
const modeOf = (value: unknown, fallback: TransportMode = 'driving'): TransportMode =>
  MODES.includes(value as TransportMode) ? value as TransportMode : fallback;

const expireTmapResults = (trip: Trip): Trip => ({ ...trip, legs: trip.legs.map(leg => isTmapResultExpired(leg)
  ? { ...leg, status: 'pending', duration: null, distance: null, reason: 'stale', calculatedAt: undefined, departureAt: null }
  : leg) });

/** Keep user input and failures, but never persist Kakao automatic route results. */
const withoutKakaoResults = (trip: Trip): Trip => ({ ...trip, legs: trip.legs.map(leg => leg.source !== 'kakao' ? leg
  : { ...leg, duration: null, distance: null,
    ...((leg.status === 'ready' || leg.status === 'estimated')
      ? { status: 'unavailable' as const, reason: 'stale', calculatedAt: undefined } : {}) }) });
const forStorage = (trip: Trip): Trip => withoutKakaoResults(expireTmapResults(trip));
const hasStoredProviderResults = (leg: TravelLeg): boolean => isTmapResultExpired(leg)
  || (leg.source === 'kakao' && (leg.status === 'ready' || leg.status === 'estimated' || leg.duration != null || leg.distance != null));

/** Hydrate dates, validate input and preserve legacy data without claiming verified routing. */
export const migrateTrip = (raw: any): Trip => {
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string' || !Array.isArray(raw.places)) {
    throw new Error('저장된 여행 형식이 올바르지 않습니다. 기존 데이터는 보존되었습니다.');
  }
  const ids = new Set<string>();
  const places: PlaceWithDuration[] = raw.places.map((place: any) => {
    if (!place || typeof place.id !== 'string' || ids.has(place.id) || typeof place.name !== 'string' ||
      !validNumber(place.latitude, -90, 90) || !validNumber(place.longitude, -180, 180)) {
      throw new Error('저장된 장소 형식이 올바르지 않습니다. 기존 데이터는 보존되었습니다.');
    }
    ids.add(place.id);
    return { id: place.id, name: place.name, address: typeof place.address === 'string' ? place.address : '',
      latitude: place.latitude, longitude: place.longitude,
      ...(typeof place.placeId === 'string' ? { placeId: place.placeId } : {}),
      ...(typeof place.countryCode === 'string' && /^[a-z]{2}$/i.test(place.countryCode) ? { countryCode: place.countryCode.toUpperCase() } : {}),
      stayDuration: validNumber(place.stayDuration, 0, 1440) ? Math.round(place.stayDuration) : 60 };
  });
  const trip: Trip = {
    id: raw.id, name: raw.name, places, totalAvailableTime: validNumber(raw.totalAvailableTime, 15, 1440) ? Math.round(raw.totalAvailableTime) : 480,
    transportMode: modeOf(raw.transportMode), createdAt: timestamp(raw.createdAt), updatedAt: timestamp(raw.updatedAt),
    date: typeof raw.date === 'string' && isValidDate(raw.date) ? raw.date : localDateString(),
    startTimeMinutes: validNumber(raw.startTimeMinutes, 0, 1439) ? Math.round(raw.startTimeMinutes) : 13 * 60,
    bufferMinutes: validNumber(raw.bufferMinutes, 0, 240) ? Math.round(raw.bufferMinutes) : 0,
    revision: validNumber(raw.revision) ? Math.floor(raw.revision) : 0, schemaVersion: 2, legs: [],
  };
  trip.legs = places.slice(0, -1).map((place, index): TravelLeg => {
    const next = places[index + 1];
    const existing = Array.isArray(raw.legs) ? raw.legs.find((leg: any) => leg.fromPlaceId === place.id && leg.toPlaceId === next.id) : null;
    const legacy = raw.places[index];
    const leg: TravelLeg = { id: legId(place.id, next.id), fromPlaceId: place.id, toPlaceId: next.id,
      mode: modeOf(existing?.mode || legacy.transportModeToNext, trip.transportMode), status: 'pending',
      duration: null, distance: null, departureAt: null };
    if (existing) {
      const status = ['pending', 'ready', 'estimated', 'unavailable'].includes(existing.status) ? existing.status : 'unavailable';
      const resolved = (status === 'ready' || status === 'estimated') && validNumber(existing.duration);
      Object.assign(leg, { status: resolved ? status : status === 'pending' ? 'pending' : 'unavailable',
        duration: resolved ? Math.round(existing.duration) : null,
        distance: validNumber(existing.distance) ? existing.distance : null,
        source: ['google', 'tmap', 'kakao', 'straight-line', 'manual', 'none'].includes(existing.source) ? existing.source : 'none',
        reason: typeof existing.reason === 'string' ? existing.reason : undefined,
        calculatedAt: typeof existing.calculatedAt === 'string' ? existing.calculatedAt : undefined,
        departureAt: typeof existing.departureAt === 'string' ? existing.departureAt : null });
    } else if (validNumber(legacy.travelTimeToNext)) {
      Object.assign(leg, { status: 'estimated', duration: Math.round(legacy.travelTimeToNext),
        distance: validNumber(legacy.travelDistance) ? legacy.travelDistance : null,
        source: 'none', reason: 'legacy-unverified' });
    }
    return leg;
  });
  if (!Array.isArray(raw.legs)) trip.legs.forEach((leg, index) => { leg.departureAt = departureAtForLeg(trip, index); });
  return forStorage(trip);
};

const readLibrary = async (): Promise<TripLibrary> => {
  const stored = await AsyncStorage.getItem(LIBRARY_KEY);
  if (stored !== null) {
    const parsed = JSON.parse(stored);
    if (parsed?.version !== 2 || !Array.isArray(parsed.savedTrips) || !Array.isArray(parsed.drafts)) {
      throw new Error('저장소 형식이 지원되지 않습니다. 기존 데이터는 보존되었습니다.');
    }
    const library: TripLibrary = { version: 2, savedTrips: parsed.savedTrips.map(migrateTrip), drafts: parsed.drafts.map(migrateTrip),
      activeTripId: typeof parsed.activeTripId === 'string' ? parsed.activeTripId : null };
    if ([...parsed.savedTrips, ...parsed.drafts].some(trip => Array.isArray(trip.legs) && trip.legs.some(hasStoredProviderResults))) {
      await writeLibrary(library);
    }
    return library;
  }
  const legacy = await AsyncStorage.getItem(LEGACY_TRIPS_KEY);
  const parsed = legacy === null ? [] : JSON.parse(legacy);
  if (!Array.isArray(parsed)) throw new Error('저장된 여행 목록을 읽을 수 없습니다. 기존 데이터는 보존되었습니다.');
  const activeTripId = await AsyncStorage.getItem(LEGACY_ACTIVE_KEY);
  const savedTrips = parsed.map(migrateTrip);
  const active = savedTrips.find(trip => trip.id === activeTripId);
  const library: TripLibrary = { version: 2, savedTrips, drafts: active ? [active] : [], activeTripId: active?.id || null };
  await writeLibrary(library);
  // Keep legacy keys intact as a recovery copy until a deliberate migration policy removes them.
  return library;
};
const writeLibrary = (library: TripLibrary): Promise<void> => AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify({ ...library,
  savedTrips: library.savedTrips.map(forStorage), drafts: library.drafts.map(forStorage) }));
const replaceTrip = (trips: Trip[], trip: Trip): Trip[] => [...trips.filter(item => item.id !== trip.id), trip];

export const loadLibrary = (): Promise<TripLibrary> => serialize(readLibrary);
export const getAllTrips = (): Promise<Trip[]> => serialize(async () => (await readLibrary()).savedTrips);
export const getTrip = (tripId: string): Promise<Trip | null> => serialize(async () => {
  const library = await readLibrary();
  return library.drafts.find(t => t.id === tripId) || library.savedTrips.find(t => t.id === tripId) || null;
});

export const saveDraft = (trip: Trip, active = true, routeResults = false): Promise<void> => serialize(async () => {
  const library = await readLibrary();
  const existing = library.drafts.find(item => item.id === trip.id);
  if (!existing || existing.revision <= trip.revision) library.drafts = replaceTrip(library.drafts, trip);
  if (active) library.activeTripId = trip.id;
  if (routeResults) library.savedTrips = library.savedTrips.map(saved => saved.id === trip.id && routeInputSignature(saved) === routeInputSignature(trip)
    ? { ...saved, legs: trip.legs } : saved);
  await writeLibrary(library);
});

export const saveTrip = (trip: Trip): Promise<void> => serialize(async () => {
  const library = await readLibrary();
  const draft = library.drafts.find(item => item.id === trip.id);
  const saved = draft && routeInputSignature(draft) === routeInputSignature(trip)
    ? { ...trip, legs: draft.legs } : trip;
  library.savedTrips = replaceTrip(library.savedTrips, saved);
  if (!draft || draft.revision <= trip.revision) library.drafts = replaceTrip(library.drafts, saved);
  await writeLibrary(library);
});

export const deleteTrip = (tripId: string): Promise<void> => serialize(async () => {
  const library = await readLibrary();
  library.savedTrips = library.savedTrips.filter(trip => trip.id !== tripId);
  library.drafts = library.drafts.filter(trip => trip.id !== tripId);
  if (library.activeTripId === tripId) library.activeTripId = null;
  // Once deletion is explicit, do not retain a second, undeleted copy in legacy storage.
  // The authoritative v2 write is the final commit: cleanup failure must leave it unchanged.
  await AsyncStorage.removeItem(LEGACY_TRIPS_KEY);
  await AsyncStorage.removeItem(LEGACY_ACTIVE_KEY);
  await writeLibrary(library);
});

export const clearTrips = (): Promise<void> => serialize(async () => {
  // Validate existing storage first; a failed read must not silently erase it.
  await readLibrary();
  await AsyncStorage.removeItem(LEGACY_TRIPS_KEY);
  await AsyncStorage.removeItem(LEGACY_ACTIVE_KEY);
  await writeLibrary({ version: 2, savedTrips: [], drafts: [], activeTripId: null });
});

export const setActiveTripId = (tripId: string | null): Promise<void> => serialize(async () => {
  const library = await readLibrary();
  library.activeTripId = tripId;
  await writeLibrary(library);
});
export const getActiveTripId = (): Promise<string | null> => serialize(async () => (await readLibrary()).activeTripId);
export const flushStorage = (): Promise<void> => ioQueue.then(() => undefined);
