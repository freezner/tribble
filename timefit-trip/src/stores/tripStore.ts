import { create } from 'zustand';
import { Trip, PlaceWithDuration, TransportMode, TravelEstimate, TravelLeg, TripSummary } from '../types';
import { calculateTripSummary, departureAtForLeg, getTripLegs, isLegStale, isResolvedLeg, isValidDate, localDateString, routeInputSignature } from '../utils/timeCalculator';
import { saveTrip, saveDraft, loadLibrary, getTrip, deleteTrip as deleteStoredTrip, clearTrips } from '../utils/storage';
import { calculateDistance } from '../services/googleApi';

interface ScheduleUpdate { date?: string; startTimeMinutes?: number; totalAvailableTime?: number; bufferMinutes?: number; }
interface TripStore {
  currentTrip: Trip | null;
  savedTrips: Trip[];
  drafts: Trip[];
  initialized: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isPersistingDraft: boolean;
  draftSaveError: string | null;
  isDirty: boolean;
  error: string | null;
  summary: TripSummary | null;
  initialize: () => Promise<void>;
  createTrip: (name: string) => void;
  resumeDraft: (tripId?: string) => Promise<void>;
  loadTrip: (tripId: string) => Promise<void>;
  loadAllTrips: () => Promise<void>;
  saveCurrentTrip: () => Promise<void>;
  flushDrafts: () => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  clearAllTrips: () => Promise<void>;
  addPlace: (place: PlaceWithDuration) => void;
  removePlace: (placeId: string) => void;
  updatePlace: (placeId: string, updates: Partial<PlaceWithDuration>) => void;
  reorderPlaces: (startIndex: number, endIndex: number) => void;
  setTripName: (name: string) => void;
  setTotalAvailableTime: (minutes: number) => void;
  setTransportMode: (mode: TransportMode) => void;
  setSchedule: (updates: ScheduleUpdate) => void;
  setLegMode: (legId: string, mode: TransportMode) => void;
  setStayDuration: (placeId: string, minutes: number) => void;
  setManualTravelTime: (legId: string, minutes: number) => void;
  retryLeg: (legId: string) => void;
  refreshExpiredRoutes: () => Promise<void>;
  recalculateTravelTimes: () => Promise<void>;
  updateSummary: () => void;
  clearError: () => void;
}

const MODES: TransportMode[] = ['driving', 'walking', 'transit', 'bicycling'];
const message = (error: unknown): string => error instanceof Error ? error.message : '여행 데이터를 처리하지 못했습니다. 다시 시도해 주세요.';
const assertMinutes = (value: number, min: number, max: number, label: string) => {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label}: ${min}~${max} 사이의 정수를 입력해 주세요.`);
};
const copyTrip = (trip: Trip): Trip => ({ ...trip, places: trip.places.map(place => ({ ...place })), legs: trip.legs.map(leg => ({ ...leg })) });
const replaceTrip = (trips: Trip[], trip: Trip): Trip[] => [...trips.filter(item => item.id !== trip.id), trip];
const sameUserInput = (a: Trip, b: Trip): boolean => a.revision === b.revision && a.name === b.name;
const needsRouteRefresh = (leg: TravelLeg): boolean => leg.source !== 'manual'
  && (isLegStale(leg) || (leg.source === 'straight-line' && (leg.status === 'ready' || leg.status === 'estimated')));
const invalidateRoutes = (trip: Trip, predicate: (leg: TravelLeg) => boolean, status: TravelLeg['status'] = 'pending'): Trip => {
  if (!trip.legs.some(predicate)) return trip;
  return { ...trip, legs: trip.legs.map(leg => predicate(leg)
    ? { ...leg, status, duration: null, distance: null, reason: 'stale', calculatedAt: undefined, departureAt: null }
    : leg) };
};
let calculationGeneration = 0;
let lifecycleGeneration = 0;
let tripSequence = 0;
let initialization: Promise<void> | null = null;

export const useTripStore = create<TripStore>((set, get) => {
  const draftWrites = new Set<Promise<void>>();
  const failedDrafts = new Map<string, string>();
  const deletingTripIds = new Set<string>();
  const routeRequests = new Map<string, Promise<TravelEstimate>>();
  let draftFlush: Promise<void> | null = null;
  const report = (error: unknown) => set({ error: message(error) });
  const withSessionResults = (stored: Trip): Trip => {
    const candidates = [get().currentTrip, ...get().drafts, ...get().savedTrips];
    const session = candidates.find(item => item?.id === stored.id && routeInputSignature(item) === routeInputSignature(stored));
    if (!session) return stored;
    // Disk deliberately omits Kakao results. A save/list refresh must not erase the current session's summary.
    return { ...stored, legs: stored.legs.map(leg => {
      const current = session.legs.find(item => item.id === leg.id);
      return current?.source === 'kakao' ? { ...current } : leg;
    }) };
  };
  const updateDraftSaveState = () => set({ isPersistingDraft: draftWrites.size > 0,
    draftSaveError: failedDrafts.values().next().value ?? null });
  const persist = (trip: Trip, routeResults = false, active = true): Promise<void> => {
    const operation = saveDraft(copyTrip(trip), active, routeResults).then(() => {
      const previousError = failedDrafts.get(trip.id);
      failedDrafts.delete(trip.id);
      if (previousError && get().error === previousError) set({ error: null });
    }, error => {
      failedDrafts.set(trip.id, message(error));
      report(error);
      throw error;
    }).finally(() => {
      draftWrites.delete(operation);
      updateDraftSaveState();
    });
    draftWrites.add(operation);
    updateDraftSaveState();
    return operation;
  };
  const publish = (trip: Trip, routeResults = false) => {
    const saved = get().savedTrips.find(item => item.id === trip.id);
    const savedTrips = routeResults ? get().savedTrips.map(item => item.id === trip.id && routeInputSignature(item) === routeInputSignature(trip)
      ? { ...item, legs: trip.legs } : item) : get().savedTrips;
    set({ currentTrip: trip, drafts: replaceTrip(get().drafts, trip), summary: calculateTripSummary(trip),
      savedTrips, isDirty: !saved || !sameUserInput(saved, trip) });
    void persist(trip, routeResults).catch(() => {});
  };
  const change = (transform: (trip: Trip) => Trip, recalculate = false) => {
    const current = get().currentTrip;
    if (!current) return;
    const trip = transform(copyTrip(current));
    trip.revision = current.revision + 1;
    trip.updatedAt = new Date();
    trip.legs = getTripLegs(trip);
    publish(trip);
    if (recalculate) void get().recalculateTravelTimes();
  };
  const activate = (trip: Trip) => {
    ++calculationGeneration;
    ++lifecycleGeneration;
    const active = copyTrip(trip);
    const hasExpiredResults = active.legs.some(needsRouteRefresh);
    active.legs = invalidateRoutes(active, needsRouteRefresh).legs;
    publish(active, hasExpiredResults);
    set({ isLoading: false, error: null });
    if (getTripLegs(active).some(leg => leg.status === 'pending' || leg.reason === 'stale' || leg.reason === 'previous-leg-unresolved'
      || (leg.source !== 'manual' && leg.status === 'unavailable'
        && (leg.reason === 'provider-coverage' || leg.reason === 'no-route')))) {
      void get().recalculateTravelTimes();
    }
  };
  const patchLeg = (id: string, patch: Partial<TravelLeg>) => {
    const trip = get().currentTrip;
    if (!trip) return;
    // Provider refreshes change route results, not the user's last edit time.
    const next = { ...trip, legs: trip.legs.map(leg => leg.id === id ? { ...leg, ...patch } : leg) };
    publish(next, true);
  };

  return {
    currentTrip: null, savedTrips: [], drafts: [], initialized: false, isLoading: false,
    isSaving: false, isPersistingDraft: false, draftSaveError: null, isDirty: false, error: null, summary: null,
    initialize: async () => {
      if (get().initialized) return;
      if (initialization) return initialization;
      const lifecycle = lifecycleGeneration;
      initialization = (async () => {
        try {
          const library = await loadLibrary();
          set({ savedTrips: library.savedTrips, drafts: library.drafts, initialized: true, error: null });
          if (lifecycle !== lifecycleGeneration) return;
          const active = library.drafts.find(trip => trip.id === library.activeTripId) ||
            [...library.drafts].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
          if (active) activate(active);
        } catch (error) { report(error); throw error; }
        finally { initialization = null; }
      })();
      return initialization;
    },
    createTrip: (name) => {
      const now = new Date();
      activate({ id: `${now.getTime()}-${++tripSequence}`, name: name.trim() || '새 여행', places: [],
        totalAvailableTime: 300, transportMode: 'walking', createdAt: now, updatedAt: now,
        date: localDateString(now), startTimeMinutes: 13 * 60, bufferMinutes: 30,
        legs: [], revision: 0, schemaVersion: 2 });
    },
    resumeDraft: async (tripId) => {
      const trip = tripId ? get().drafts.find(item => item.id === tripId)
        : [...get().drafts].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
      if (trip) activate(trip);
      else if (tripId) await get().loadTrip(tripId);
    },
    loadTrip: async (tripId) => {
      const lifecycle = ++lifecycleGeneration;
      ++calculationGeneration;
      set({ isLoading: false });
      try {
        const trip = await getTrip(tripId);
        if (lifecycle !== lifecycleGeneration) return;
        if (!trip) throw new Error('이 여행을 찾을 수 없습니다.');
        activate(trip);
      } catch (error) { report(error); throw error; }
    },
    loadAllTrips: async () => {
      try {
        const library = await loadLibrary();
        // Do not replace a newer in-memory draft while its write is queued.
        const drafts = library.drafts.map(stored => {
          const current = get().drafts.find(item => item.id === stored.id);
          return current && current.revision >= stored.revision ? current : stored;
        });
        get().drafts.forEach(current => { if (!drafts.some(item => item.id === current.id)) drafts.push(current); });
        set({ savedTrips: library.savedTrips.map(withSessionResults), drafts });
      } catch (error) { report(error); throw error; }
    },
    flushDrafts: () => {
      if (draftFlush) return draftFlush;
      draftFlush = (async () => {
        try {
          const activeId = get().currentTrip?.id;
          // Enqueue the complete batch before yielding, so a subsequent deletion stays last.
          const retries = get().drafts.filter(trip => !deletingTripIds.has(trip.id))
            .map(trip => persist(trip, true, trip.id === activeId));
          await Promise.allSettled(retries);
          // Include edits queued while this barrier was waiting for storage.
          while (draftWrites.size) await Promise.allSettled([...draftWrites]);
          if (failedDrafts.size) throw new Error(failedDrafts.values().next().value);
        } finally { draftFlush = null; }
      })();
      return draftFlush;
    },
    saveCurrentTrip: async () => {
      const current = get().currentTrip;
      if (!current) return;
      const snapshot = copyTrip(current);
      set({ isSaving: true, error: null });
      try {
        await saveTrip(snapshot);
        const library = await loadLibrary();
        const active = get().currentTrip;
        const saved = active && library.savedTrips.find(item => item.id === active.id);
        set({ savedTrips: library.savedTrips.map(withSessionResults), isDirty: !!active && (!saved || !sameUserInput(saved, active)) });
        const draft = get().drafts.find(item => item.id === snapshot.id);
        if (!draft || draft.revision <= snapshot.revision) failedDrafts.delete(snapshot.id);
        updateDraftSaveState();
      } catch (error) { report(error); throw error; }
      finally { set({ isSaving: false }); }
    },
    deleteTrip: async (tripId) => {
      deletingTripIds.add(tripId);
      const wasCurrent = get().currentTrip?.id === tripId;
      const previous = get().currentTrip;
      if (wasCurrent) {
        ++calculationGeneration;
        ++lifecycleGeneration;
        set({ currentTrip: null, summary: null, isLoading: false, isDirty: false });
      }
      try {
        await deleteStoredTrip(tripId);
        failedDrafts.delete(tripId);
        updateDraftSaveState();
        set({ savedTrips: get().savedTrips.filter(trip => trip.id !== tripId), drafts: get().drafts.filter(trip => trip.id !== tripId) });
      } catch (error) {
        if (wasCurrent && previous && !get().currentTrip) activate(previous);
        report(error); throw error;
      } finally { deletingTripIds.delete(tripId); }
    },
    clearAllTrips: async () => {
      ++calculationGeneration;
      ++lifecycleGeneration;
      const previous = get().currentTrip;
      const removedIds = new Set([...get().savedTrips, ...get().drafts].map(trip => trip.id));
      removedIds.forEach(id => deletingTripIds.add(id));
      set({ currentTrip: null, summary: null, isLoading: false, isDirty: false });
      try {
        await clearTrips();
        removedIds.forEach(id => failedDrafts.delete(id));
        updateDraftSaveState();
        // A user may start a new trip while the deletion is being persisted.
        set({ savedTrips: get().savedTrips.filter(trip => !removedIds.has(trip.id)), drafts: get().drafts.filter(trip => !removedIds.has(trip.id)) });
      } catch (error) {
        if (previous && !get().currentTrip) activate(previous);
        report(error); throw error;
      } finally { removedIds.forEach(id => deletingTripIds.delete(id)); }
    },
    addPlace: (place) => {
      assertMinutes(place.stayDuration, 0, 1440, '체류 시간');
      if (!Number.isFinite(place.latitude) || Math.abs(place.latitude) > 90 || !Number.isFinite(place.longitude) || Math.abs(place.longitude) > 180) throw new Error('장소 좌표가 올바르지 않습니다.');
      if (get().currentTrip?.places.some(item => item.id === place.id)) throw new Error('같은 방문 ID를 추가할 수 없습니다.');
      const { travelTimeToNext, travelDistance, transportModeToNext, ...visit } = place;
      change(trip => ({ ...trip, places: [...trip.places, visit] }), true);
    },
    removePlace: (placeId) => change(trip => ({ ...trip, places: trip.places.filter(place => place.id !== placeId) }), true),
    updatePlace: (placeId, updates) => {
      if (updates.stayDuration !== undefined) assertMinutes(updates.stayDuration, 0, 1440, '체류 시간');
      if (updates.name !== undefined && !updates.name.trim()) throw new Error('장소 이름을 입력해 주세요.');
      if (updates.latitude !== undefined && (!Number.isFinite(updates.latitude) || Math.abs(updates.latitude) > 90)) throw new Error('장소 좌표가 올바르지 않습니다.');
      if (updates.longitude !== undefined && (!Number.isFinite(updates.longitude) || Math.abs(updates.longitude) > 180)) throw new Error('장소 좌표가 올바르지 않습니다.');
      const endpointChanged = updates.latitude !== undefined || updates.longitude !== undefined || updates.placeId !== undefined;
      const countryChanged = Object.prototype.hasOwnProperty.call(updates, 'countryCode');
      const routeChanged = updates.stayDuration !== undefined || endpointChanged || countryChanged;
      change(trip => ({ ...trip, places: trip.places.map(place => place.id === placeId ? { ...place, ...updates, id: place.id } : place),
        legs: trip.legs.map(leg => (leg.fromPlaceId === placeId || leg.toPlaceId === placeId)
          && (endpointChanged || (countryChanged && leg.source !== 'manual'))
          ? { ...leg, status: 'pending', duration: null, distance: null, source: undefined, reason: undefined, calculatedAt: undefined, departureAt: null }
          : leg) }), routeChanged);
    },
    reorderPlaces: (startIndex, endIndex) => {
      const trip = get().currentTrip;
      if (!trip || startIndex === endIndex) return;
      if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex) || Math.min(startIndex, endIndex) < 0 || Math.max(startIndex, endIndex) >= trip.places.length) return;
      change(current => { const places = [...current.places]; const [place] = places.splice(startIndex, 1); places.splice(endIndex, 0, place); return { ...current, places }; }, true);
    },
    setTripName: (name) => {
      if (!name.trim()) throw new Error('여행 이름을 입력해 주세요.');
      change(trip => ({ ...trip, name: name.trim() }));
    },
    setTotalAvailableTime: (minutes) => get().setSchedule({ totalAvailableTime: minutes }),
    setSchedule: (updates) => {
      if (updates.date !== undefined && !isValidDate(updates.date)) throw new Error('날짜를 YYYY-MM-DD 형식으로 정확히 입력해 주세요.');
      if (updates.startTimeMinutes !== undefined) assertMinutes(updates.startTimeMinutes, 0, 1439, '출발 시각');
      if (updates.totalAvailableTime !== undefined) assertMinutes(updates.totalAvailableTime, 15, 1440, '가능 시간');
      if (updates.bufferMinutes !== undefined) assertMinutes(updates.bufferMinutes, 0, 240, '여유 시간');
      change(trip => ({ ...trip, ...updates }), updates.date !== undefined || updates.startTimeMinutes !== undefined);
    },
    setTransportMode: (mode) => {
      if (!MODES.includes(mode)) throw new Error('이동 수단이 올바르지 않습니다.');
      change(trip => ({ ...trip, transportMode: mode, legs: trip.legs.map(leg => ({ ...leg, mode, status: 'pending', duration: null, distance: null, source: undefined, departureAt: null })) }), true);
    },
    setLegMode: (id, mode) => {
      if (!MODES.includes(mode)) throw new Error('이동 수단이 올바르지 않습니다.');
      change(trip => ({ ...trip, legs: trip.legs.map(leg => leg.id === id && leg.mode !== mode ? { ...leg, mode, status: 'pending', duration: null, distance: null, source: undefined, reason: undefined, departureAt: null } : leg) }), true);
    },
    setStayDuration: (placeId, minutes) => get().updatePlace(placeId, { stayDuration: minutes }),
    setManualTravelTime: (id, minutes) => {
      assertMinutes(minutes, 0, 1440, '이동 시간');
      change(trip => ({ ...trip, legs: trip.legs.map(leg => leg.id === id ? { ...leg, status: 'estimated', duration: minutes, distance: null, source: 'manual', reason: 'manual', calculatedAt: new Date().toISOString() } : leg) }), true);
    },
    retryLeg: (id) => change(trip => ({ ...trip, legs: trip.legs.map(leg => leg.id === id ? { ...leg, status: 'pending', duration: null, distance: null, source: undefined, reason: undefined, departureAt: null } : leg) }), true),
    refreshExpiredRoutes: async () => {
      // Mark stale values as requiring a retry. Foreground timers must not generate paid route requests.
      const state = get();
      const savedTrips = state.savedTrips.map(trip => invalidateRoutes(trip, needsRouteRefresh, 'unavailable'));
      const drafts = state.drafts.map(trip => invalidateRoutes(trip, needsRouteRefresh, 'unavailable'));
      if (savedTrips.some((trip, index) => trip !== state.savedTrips[index])
        || drafts.some((trip, index) => trip !== state.drafts[index])) set({ savedTrips, drafts });
      if (!state.currentTrip) return;
      const current = invalidateRoutes(state.currentTrip, needsRouteRefresh, 'unavailable');
      // Clear every stale duration together; explicit retry or resume will revalidate it.
      if (current !== state.currentTrip) publish(current, true);
    },
    recalculateTravelTimes: async () => {
      const generation = ++calculationGeneration;
      const initial = get().currentTrip;
      if (!initial || initial.places.length < 2) { set({ isLoading: false }); get().updateSummary(); return; }
      const tripId = initial.id;
      set({ isLoading: true });
      try {
        for (let index = 0; index < initial.places.length - 1; index++) {
          if (generation !== calculationGeneration || get().currentTrip?.id !== tripId) return;
          const trip = get().currentTrip!;
          const leg = trip.legs[index];
          if (!leg) continue;
          const departureAt = departureAtForLeg(trip, index);
          if (leg.source === 'manual' && isResolvedLeg(leg)) { if (leg.departureAt !== departureAt) patchLeg(leg.id, { departureAt }); continue; }
          const timeIndependent = leg.mode === 'walking' || leg.mode === 'bicycling';
          if (isResolvedLeg(leg) && !isLegStale(leg) && (timeIndependent || leg.departureAt === departureAt)) {
            if (leg.departureAt !== departureAt) patchLeg(leg.id, { departureAt });
            continue;
          }
          if (departureAt === null) {
            patchLeg(leg.id, { status: 'unavailable', duration: null, distance: null, source: 'none', reason: 'previous-leg-unresolved', departureAt: null });
            continue;
          }
          const from = trip.places[index];
          const to = trip.places[index + 1];
          patchLeg(leg.id, { status: 'pending', duration: null, distance: null, source: undefined, reason: undefined, departureAt });
          const origin = { lat: from.latitude, lng: from.longitude, placeId: from.placeId, countryCode: from.countryCode };
          const destination = { lat: to.latitude, lng: to.longitude, placeId: to.placeId, countryCode: to.countryCode };
          const requestKey = JSON.stringify([origin, destination, leg.mode, timeIndependent ? null : departureAt]);
          let request = routeRequests.get(requestKey);
          if (!request) {
            request = calculateDistance(origin, destination, leg.mode, departureAt).finally(() => {
              if (routeRequests.get(requestKey) === request) routeRequests.delete(requestKey);
            });
            routeRequests.set(requestKey, request);
          }
          const result = await request;
          if (generation !== calculationGeneration || get().currentTrip?.id !== tripId) return;
          // Merge only the edge; never overwrite edits or replace the selected trip with the request snapshot.
          const resolved = result && (result.status === 'ready' || result.status === 'estimated') && typeof result.duration === 'number' && Number.isFinite(result.duration) && result.duration >= 0;
          patchLeg(leg.id, result ? { ...result, status: resolved ? result.status : 'unavailable', duration: resolved ? Math.ceil(result.duration!) : null, departureAt }
            : { status: 'unavailable', duration: null, distance: null, source: 'none', reason: 'unknown', departureAt });
        }
      } catch (error) {
        if (generation === calculationGeneration && get().currentTrip?.id === tripId) {
          const current = get().currentTrip!;
          publish({ ...current, legs: current.legs.map(leg => leg.status === 'pending' ? { ...leg, status: 'unavailable', duration: null, distance: null, reason: 'unknown' } : leg) }, true);
          report(error);
        }
      } finally { if (generation === calculationGeneration) set({ isLoading: false }); }
    },
    updateSummary: () => set({ summary: get().currentTrip ? calculateTripSummary(get().currentTrip!) : null }),
    clearError: () => set({ error: null }),
  };
});
