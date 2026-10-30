import { TimelineEntry, TravelLeg, Trip, TripSummary } from '../types';

export const localDateString = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

export const legId = (from: string, to: string): string =>
  `leg:${encodeURIComponent(from)}:${encodeURIComponent(to)}`;

export const TMAP_RESULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Never use provider-cached TMAP durations at or beyond their maximum lifetime. */
export const isTmapResultExpired = (leg: TravelLeg, now = Date.now()): boolean => {
  if (leg.source !== 'tmap' || (leg.status !== 'ready' && leg.status !== 'estimated')) return false;
  const calculatedAt = leg.calculatedAt ? Date.parse(leg.calculatedAt) : NaN;
  return !Number.isFinite(calculatedAt) || now - calculatedAt >= TMAP_RESULT_MAX_AGE_MS || calculatedAt > now + 60_000;
};

export const isResolvedLeg = (leg?: TravelLeg | null, now = Date.now()): boolean =>
  !!leg && (leg.status === 'ready' || leg.status === 'estimated') &&
  typeof leg.duration === 'number' && Number.isFinite(leg.duration) && leg.duration >= 0 && !isTmapResultExpired(leg, now);

export const ROUTE_FRESHNESS_MS = 15 * 60 * 1000;

/** Current traffic expires after 15 minutes; Kakao walking/cycling results live only in this session. */
export const isLegStale = (leg: TravelLeg, now = Date.now()): boolean => {
  if (isTmapResultExpired(leg, now)) return true;
  if (!isResolvedLeg(leg, now) || leg.source === 'manual' || leg.reason === 'legacy-unverified') return false;
  if (leg.source === 'kakao' && (leg.mode === 'walking' || leg.mode === 'bicycling')) return false;
  const calculatedAt = leg.calculatedAt ? Date.parse(leg.calculatedAt) : NaN;
  return !Number.isFinite(calculatedAt) || now - calculatedAt >= ROUTE_FRESHNESS_MS || calculatedAt > now + 60_000;
};

/** Only real adjacent visits participate in calculations. Orphaned legacy edges cannot count. */
export const getTripLegs = (trip: Trip): TravelLeg[] => trip.places.slice(0, -1).map((place, index) => {
  const next = trip.places[index + 1];
  return trip.legs.find(leg => leg.fromPlaceId === place.id && leg.toPlaceId === next.id) || {
    id: legId(place.id, next.id), fromPlaceId: place.id, toPlaceId: next.id,
    mode: trip.transportMode, status: 'pending', duration: null, distance: null, departureAt: null,
  };
});

export const calculateTripSummary = (trip: Trip): TripSummary => {
  const legs = getTripLegs(trip);
  const totalStayTime = trip.places.reduce((sum, place) => sum + place.stayDuration, 0);
  const unresolved = legs.filter(leg => !isResolvedLeg(leg));
  const totalTravelTime = unresolved.length ? null : legs.reduce((sum, leg) => sum + (leg.duration ?? 0), 0);
  const bufferTime = trip.places.length ? trip.bufferMinutes : 0;
  const totalTime = totalTravelTime === null ? null : totalStayTime + totalTravelTime + bufferTime;
  const remainingTime = totalTime === null ? null : trip.totalAvailableTime - totalTime;
  const estimatedLegCount = legs.filter(leg => leg.status === 'estimated').length;
  const status: TripSummary['status'] = !trip.places.length ? 'empty'
    : unresolved.some(leg => leg.status === 'pending') ? 'pending'
    : unresolved.length ? 'unavailable' : estimatedLegCount ? 'estimated' : 'ready';
  return { totalStayTime, totalTravelTime, totalTime, availableTime: trip.totalAvailableTime,
    isOverTime: remainingTime === null ? null : remainingTime < 0, remainingTime, bufferTime,
    estimatedLegCount, unresolvedLegCount: unresolved.length, status,
    endTimeMinutes: totalTime === null ? null : trip.startTimeMinutes + totalTime };
};

export const calculateTimeline = (trip: Trip): TimelineEntry[] => {
  const legs = getTripLegs(trip);
  let arrival: number | null = trip.startTimeMinutes;
  return trip.places.map((place, index) => {
    const departure: number | null = arrival === null ? null : arrival + place.stayDuration;
    const leg = legs[index] || null;
    const entry = { placeId: place.id, arrivalTimeMinutes: arrival, departureTimeMinutes: departure, leg };
    arrival = departure === null || !isResolvedLeg(leg) ? null : departure + leg!.duration!;
    return entry;
  });
};

/** Domestic plans use the destination country's clock even on a device currently abroad. */
export const usesKoreanTimeZone = (trip: Trip): boolean => trip.places.length > 0
  && trip.places.every(place => place.countryCode?.toUpperCase() === 'KR');

export const departureAtForLeg = (trip: Trip, index: number): string | null => {
  const minutes = calculateTimeline(trip)[index]?.departureTimeMinutes;
  if (minutes === null || minutes === undefined || !isValidDate(trip.date)) return null;
  const [year, month, day] = trip.date.split('-').map(Number);
  if (usesKoreanTimeZone(trip)) return new Date(Date.UTC(year, month - 1, day, 0, minutes - 9 * 60)).toISOString();
  return new Date(year, month - 1, day, 0, minutes).toISOString();
};

/** Name/labels do not affect route requests; every temporal or geographic input does. */
export const routeInputSignature = (trip: Trip): string => JSON.stringify({
  date: trip.date, start: trip.startTimeMinutes,
  places: trip.places.map(p => [p.id, p.latitude, p.longitude, p.placeId, p.countryCode, p.stayDuration]),
  legs: getTripLegs(trip).map(l => [l.fromPlaceId, l.toPlaceId, l.mode, l.source === 'manual' ? l.duration : null]),
});

export const formatMinutes = (minutes: number | null, translations?: { hours: string; minutes: string; unknown?: string }): string => {
  if (minutes === null || !Number.isFinite(minutes)) return translations?.unknown || '미정';
  const rounded = Math.round(Math.abs(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  const sign = minutes < 0 ? '-' : '';
  const hoursText = translations?.hours || '시간';
  const minutesText = translations?.minutes || '분';
  return hours === 0 ? `${sign}${mins}${minutesText}`
    : `${sign}${hours}${hoursText}${mins ? ` ${mins}${minutesText}` : ''}`;
};

export const formatClock = (minutes: number | null, translations?: { unknown: string; nextDay: string }): string => {
  if (minutes === null || !Number.isFinite(minutes)) return translations?.unknown || '미정';
  const rounded = Math.round(minutes);
  const days = Math.floor(rounded / 1440);
  const time = ((rounded % 1440) + 1440) % 1440;
  const clock = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
  return days ? `${translations?.nextDay || '다음날'}${days > 1 ? ` (+${days - 1})` : ''} ${clock}` : clock;
};

export const hoursToMinutes = (hours: number): number => Math.floor(hours * 60);
export const minutesToHours = (minutes: number): number => Number((minutes / 60).toFixed(1));
