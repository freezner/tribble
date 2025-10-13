// 기본 타입 정의

export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string; // Google Place ID
}

export interface PlaceWithDuration extends Place {
  stayDuration: number; // 체류 시간 (분)
  travelTimeToNext?: number; // 다음 장소까지 이동 시간 (분)
  travelDistance?: number; // 다음 장소까지 거리 (미터)
}

export interface Trip {
  id: string;
  name: string;
  places: PlaceWithDuration[];
  totalAvailableTime: number; // 가용 시간 (분)
  transportMode: TransportMode;
  createdAt: Date;
  updatedAt: Date;
}

export type TransportMode = 'driving' | 'walking' | 'transit' | 'bicycling';

export interface TripSummary {
  totalStayTime: number; // 총 체류 시간
  totalTravelTime: number; // 총 이동 시간
  totalTime: number; // 총 소요 시간
  availableTime: number; // 가용 시간
  isOverTime: boolean; // 시간 초과 여부
  remainingTime: number; // 남은/초과된 시간 (음수면 초과)
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
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}


