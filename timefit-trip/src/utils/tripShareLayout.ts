import { Trip, PlaceWithDuration, TimelineEntry, TripSummary } from '../types';
import { calculateTimeline, calculateTripSummary, isResolvedLeg } from './timeCalculator';

export type TripShareFormat = 'feed' | 'story'
  | 'instagram-feed' | 'instagram-story' | 'facebook-feed' | 'facebook-story' | 'x-post' | 'tiktok-photo';

interface ShareCardDimensions { width: number; height: number; }
interface ShareCardConfig {
  canvas: ShareCardDimensions;
  export: ShareCardDimensions;
  stopsPerPage: number;
  insets: { top: number; right: number; bottom: number; left: number };
  stopHeight: number;
}

/** Canvas, pagination, image export, and overlay-safe content use the same preset. */
export const SHARE_CARD_CONFIGS = {
  feed: { canvas: { width: 360, height: 450 }, export: { width: 1080, height: 1350 }, stopsPerPage: 3,
    insets: { top: 16, right: 16, bottom: 16, left: 16 }, stopHeight: 58 },
  story: { canvas: { width: 360, height: 640 }, export: { width: 1080, height: 1920 }, stopsPerPage: 5,
    insets: { top: 16, right: 16, bottom: 16, left: 16 }, stopHeight: 72 },
  'instagram-feed': { canvas: { width: 360, height: 480 }, export: { width: 1080, height: 1440 }, stopsPerPage: 3,
    insets: { top: 16, right: 16, bottom: 16, left: 16 }, stopHeight: 68 },
  'instagram-story': { canvas: { width: 360, height: 640 }, export: { width: 1080, height: 1920 }, stopsPerPage: 4,
    insets: { top: 40, right: 16, bottom: 64, left: 16 }, stopHeight: 72 },
  'facebook-feed': { canvas: { width: 360, height: 450 }, export: { width: 1440, height: 1800 }, stopsPerPage: 3,
    insets: { top: 16, right: 16, bottom: 16, left: 16 }, stopHeight: 58 },
  'facebook-story': { canvas: { width: 360, height: 640 }, export: { width: 1080, height: 1920 }, stopsPerPage: 4,
    insets: { top: 40, right: 16, bottom: 64, left: 16 }, stopHeight: 72 },
  'x-post': { canvas: { width: 400, height: 400 }, export: { width: 1200, height: 1200 }, stopsPerPage: 2,
    insets: { top: 16, right: 16, bottom: 16, left: 16 }, stopHeight: 58 },
  'tiktok-photo': { canvas: { width: 360, height: 640 }, export: { width: 1080, height: 1920 }, stopsPerPage: 4,
    insets: { top: 40, right: 40, bottom: 64, left: 16 }, stopHeight: 72 },
} as const satisfies Record<TripShareFormat, ShareCardConfig>;

const presetDimensions = (field: 'canvas' | 'export'): Record<TripShareFormat, ShareCardDimensions> =>
  Object.fromEntries(Object.entries(SHARE_CARD_CONFIGS).map(([format, config]) => [format, config[field]])) as Record<TripShareFormat, ShareCardDimensions>;

export const SHARE_CARD_DIMENSIONS = presetDimensions('canvas');
export const SHARE_CARD_EXPORT_DIMENSIONS = presetDimensions('export');

export const normalizeTripShareFormat = (format: unknown): TripShareFormat =>
  typeof format === 'string' && Object.prototype.hasOwnProperty.call(SHARE_CARD_CONFIGS, format) ? format as TripShareFormat : 'feed';

export interface TripShareStop {
  place: PlaceWithDuration;
  globalIndex: number;
  timeline: TimelineEntry;
  isFirst: boolean;
  isLast: boolean;
}

export interface TripSharePage {
  format: TripShareFormat;
  pageIndex: number;
  pageCount: number;
  startIndex: number;
  endIndex: number;
  stops: TripShareStop[];
  summary: TripSummary;
  hasManualTimes: boolean;
}

export const getTripSharePageCount = (trip: Trip, format: TripShareFormat): number =>
  Math.max(1, Math.ceil(trip.places.length / SHARE_CARD_CONFIGS[normalizeTripShareFormat(format)].stopsPerPage));

/** Page slicing never resets the trip's timeline, totals, numbering, or endpoints. */
export function getTripSharePage(trip: Trip, format: TripShareFormat = 'feed', requestedPage = 0): TripSharePage {
  const safeFormat = normalizeTripShareFormat(format);
  const { stopsPerPage } = SHARE_CARD_CONFIGS[safeFormat];
  const pageCount = getTripSharePageCount(trip, safeFormat);
  const numericPage = typeof requestedPage === 'number' && !Number.isNaN(requestedPage) ? Math.trunc(requestedPage) : 0;
  const pageIndex = Math.min(pageCount - 1, Math.max(0, numericPage));
  const startIndex = pageIndex * stopsPerPage;
  const endIndex = Math.min(trip.places.length, startIndex + stopsPerPage);
  const timeline = calculateTimeline(trip);
  return {
    format: safeFormat, pageIndex, pageCount, startIndex, endIndex,
    summary: calculateTripSummary(trip),
    hasManualTimes: timeline.some(entry => entry.leg?.source === 'manual' && isResolvedLeg(entry.leg)),
    stops: trip.places.slice(startIndex, endIndex).map((place, index) => {
      const globalIndex = startIndex + index;
      return { place, globalIndex, timeline: timeline[globalIndex], isFirst: globalIndex === 0, isLast: globalIndex === trip.places.length - 1 };
    }),
  };
}
