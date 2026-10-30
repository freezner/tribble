// 기본 타입 정의

export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string; // Google Place ID or a namespaced provider ID (for example kakao:123)
  countryCode?: string; // ISO 3166-1 alpha-2, when provided by the place service
}

export interface PlaceWithDuration extends Place {
  stayDuration: number; // 체류 시간 (분)
  travelTimeToNext?: number; // 다음 장소까지 이동 시간 (분)
  travelDistance?: number; // 다음 장소까지 거리 (미터)
  transportModeToNext?: TransportMode; // 다음 장소까지 이동 수단
}

export type TransportMode = 'driving' | 'walking' | 'transit' | 'bicycling';
export type TravelSource = 'google' | 'tmap' | 'kakao' | 'straight-line' | 'manual' | 'none';
export type TravelStatus = 'pending' | 'ready' | 'estimated' | 'unavailable';

export interface TravelEstimate {
  status: Exclude<TravelStatus, 'pending'>;
  duration: number | null;
  distance: number | null;
  source: TravelSource;
  reason?: string;
  calculatedAt: string;
  departureAt?: string;
}

export interface TravelLeg {
  id: string;
  fromPlaceId: string;
  toPlaceId: string;
  mode: TransportMode;
  status: TravelStatus;
  duration: number | null;
  distance: number | null;
  source?: TravelSource;
  reason?: string;
  calculatedAt?: string;
  departureAt: string | null;
}

export interface Trip {
  id: string;
  name: string;
  places: PlaceWithDuration[];
  totalAvailableTime: number;
  transportMode: TransportMode;
  /** First creation/automatic draft save; preserved when the trip is edited or saved again. */
  createdAt: Date;
  /** Last user edit; automatic route refreshes do not change this timestamp. */
  updatedAt: Date;
  date: string;
  startTimeMinutes: number;
  bufferMinutes: number;
  legs: TravelLeg[];
  revision: number;
  schemaVersion: 2;
}

export interface TripSummary {
  totalStayTime: number;
  totalTravelTime: number | null;
  totalTime: number | null;
  availableTime: number;
  isOverTime: boolean | null;
  remainingTime: number | null;
  bufferTime: number;
  estimatedLegCount: number;
  unresolvedLegCount: number;
  status: 'empty' | TravelStatus;
  endTimeMinutes: number | null;
}

export interface TimelineEntry {
  placeId: string;
  arrivalTimeMinutes: number | null;
  departureTimeMinutes: number | null;
  leg: TravelLeg | null;
}

export interface RouteStep {
  startLocation: {
    lat: number;
    lng: number;
  };
  endLocation: {
    lat: number;
    lng: number;
  };
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  polyline: string;
}

export interface GooglePlaceAutocomplete {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
  countryCode?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}


