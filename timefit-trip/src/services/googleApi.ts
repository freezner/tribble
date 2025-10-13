import axios from 'axios';
import { GOOGLE_API_KEY } from '../constants';
import { GooglePlaceAutocomplete, GooglePlaceDetails, RouteStep, TransportMode } from '../types';

const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';
const DIRECTIONS_API_BASE = 'https://maps.googleapis.com/maps/api/directions';
const DISTANCE_MATRIX_API_BASE = 'https://maps.googleapis.com/maps/api/distancematrix';

/**
 * 두 좌표 간 직선 거리를 계산 (Haversine formula)
 */
const calculateStraightDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // 거리 (미터)
};

/**
 * 직선 거리를 기반으로 이동 시간 추정
 */
const estimateTravelTime = (
  distance: number,
  mode: TransportMode
): { duration: number; distance: number } => {
  // 실제 도로 거리는 직선 거리의 약 1.3배로 추정
  const actualDistance = Math.round(distance * 1.3);
  
  // 교통 수단별 평균 속도 (km/h)
  const speeds = {
    driving: 30, // 도심 평균
    walking: 5,
    transit: 25,
    bicycling: 15,
  };
  
  const speedKmh = speeds[mode];
  const durationMinutes = Math.ceil((actualDistance / 1000 / speedKmh) * 60);
  
  return {
    duration: durationMinutes,
    distance: actualDistance,
  };
};

/**
 * 장소 자동완성 검색
 */
export const searchPlaces = async (input: string): Promise<GooglePlaceAutocomplete[]> => {
  try {
    console.log('Google Places API 호출:', input);
    const response = await axios.get(`${PLACES_API_BASE}/autocomplete/json`, {
      params: {
        input,
        key: GOOGLE_API_KEY,
        language: 'ko',
      },
    });

    console.log('Google Places API 응답:', response.data);
    
    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API 오류:', response.data.status, response.data.error_message);
    }

    return response.data.predictions || [];
  } catch (error) {
    console.error('Error searching places:', error);
    if (axios.isAxiosError(error)) {
      console.error('API 오류 상세:', error.response?.data);
    }
    return [];
  }
};

/**
 * 장소 상세 정보 조회
 */
export const getPlaceDetails = async (placeId: string): Promise<GooglePlaceDetails | null> => {
  try {
    console.log('Google Place Details API 호출:', placeId);
    const response = await axios.get(`${PLACES_API_BASE}/details/json`, {
      params: {
        place_id: placeId,
        key: GOOGLE_API_KEY,
        fields: 'place_id,name,formatted_address,geometry',
        language: 'ko',
      },
    });

    console.log('Google Place Details API 응답:', response.data);
    
    if (response.data.status !== 'OK') {
      console.error('Google Place Details API 오류:', response.data.status, response.data.error_message);
    }

    return response.data.result || null;
  } catch (error) {
    console.error('Error getting place details:', error);
    if (axios.isAxiosError(error)) {
      console.error('API 오류 상세:', error.response?.data);
    }
    return null;
  }
};

/**
 * 두 지점 간 이동 시간 및 거리 계산
 */
export const calculateDistance = async (
  origin: { lat: number; lng: number; placeId?: string },
  destination: { lat: number; lng: number; placeId?: string },
  mode: TransportMode = 'driving'
): Promise<{ duration: number; distance: number } | null> => {
  try {
    // place_id를 우선 사용, 없으면 좌표 사용
    const originParam = origin.placeId ? `place_id:${origin.placeId}` : `${origin.lat},${origin.lng}`;
    const destParam = destination.placeId ? `place_id:${destination.placeId}` : `${destination.lat},${destination.lng}`;
    
    console.log('Distance Matrix API 호출:', { 
      origin: originParam, 
      destination: destParam, 
      mode 
    });
    
    const response = await axios.get(`${DISTANCE_MATRIX_API_BASE}/json`, {
      params: {
        origins: originParam,
        destinations: destParam,
        mode,
        key: GOOGLE_API_KEY,
        language: 'ko',
        region: 'kr',  // 한국 지역 최적화
      },
    });

    console.log('Distance Matrix API 응답:', JSON.stringify(response.data, null, 2));

    const element = response.data.rows?.[0]?.elements?.[0];
    console.log('Element 상세:', JSON.stringify(element, null, 2));
    
    if (element && element.status === 'OK') {
      const result = {
        duration: Math.ceil(element.duration.value / 60), // 초를 분으로 변환
        distance: element.distance.value, // 미터
      };
      console.log('✅ 이동 시간 계산 완료:', `${result.duration}분, ${result.distance}m`);
      return result;
    }

    if (response.data.status !== 'OK') {
      console.error('❌ Distance Matrix API 오류:', response.data.status, response.data.error_message);
    }
    
    if (element) {
      if (element.status !== 'OK') {
        console.error('❌ Distance Matrix 요소 오류:', element.status);
        
        // ZERO_RESULTS인 경우 교통 수단을 변경해서 재시도
        if (element.status === 'ZERO_RESULTS') {
          // place_id에서 좌표로 재시도
          if (origin.placeId || destination.placeId) {
            console.log('🔄 좌표로 재시도...');
            return calculateDistance(
              { lat: origin.lat, lng: origin.lng },
              { lat: destination.lat, lng: destination.lng },
              mode
            );
          }
          // 이미 좌표인 경우, walking으로 재시도
          else if (mode === 'driving') {
            console.log('🔄 교통수단을 transit으로 변경하여 재시도...');
            return calculateDistance(origin, destination, 'transit');
          }
          // transit도 실패한 경우, 직선 거리로 추정
          else if (mode === 'transit') {
            console.log('🔄 교통수단을 walking으로 변경하여 재시도...');
            return calculateDistance(origin, destination, 'walking');
          }
          // walking도 실패한 경우, 직선 거리로 추정
          else {
            console.log('⚠️ API 실패, 직선 거리로 추정...');
            const straightDistance = calculateStraightDistance(
              origin.lat,
              origin.lng,
              destination.lat,
              destination.lng
            );
            const estimated = estimateTravelTime(straightDistance, mode);
            console.log(`📏 추정 결과: ${estimated.duration}분, ${estimated.distance}m (직선거리 기반)`);
            return estimated;
          }
        }
      }
    } else {
      console.error('❌ Element가 없습니다');
    }

    // 최후의 수단: 직선 거리로 추정
    console.log('⚠️ 모든 시도 실패, 직선 거리로 추정...');
    const straightDistance = calculateStraightDistance(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );
    const estimated = estimateTravelTime(straightDistance, mode);
    console.log(`📏 추정 결과: ${estimated.duration}분, ${estimated.distance}m`);
    return estimated;
  } catch (error) {
    console.error('Error calculating distance:', error);
    if (axios.isAxiosError(error)) {
      console.error('API 오류 상세:', error.response?.data);
    }
    
    // 오류 발생 시에도 추정치 반환
    console.log('⚠️ API 오류 발생, 직선 거리로 추정...');
    const straightDistance = calculateStraightDistance(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );
    const estimated = estimateTravelTime(straightDistance, mode);
    console.log(`📏 추정 결과: ${estimated.duration}분, ${estimated.distance}m`);
    return estimated;
  }
};

/**
 * 경로 정보 조회
 */
export const getDirections = async (
  waypoints: Array<{ lat: number; lng: number }>,
  mode: TransportMode = 'driving'
): Promise<RouteStep[] | null> => {
  try {
    if (waypoints.length < 2) {
      return null;
    }

    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediate = waypoints.slice(1, -1);

    const params: any = {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode,
      key: GOOGLE_API_KEY,
      language: 'ko',
    };

    if (intermediate.length > 0) {
      params.waypoints = intermediate
        .map((wp) => `${wp.lat},${wp.lng}`)
        .join('|');
    }

    const response = await axios.get(`${DIRECTIONS_API_BASE}/json`, { params });

    const route = response.data.routes?.[0];
    if (!route) {
      return null;
    }

    const steps: RouteStep[] = [];
    route.legs.forEach((leg: any) => {
      leg.steps.forEach((step: any) => {
        steps.push({
          startLocation: step.start_location,
          endLocation: step.end_location,
          distance: step.distance,
          duration: step.duration,
          polyline: step.polyline.points,
        });
      });
    });

    return steps;
  } catch (error) {
    console.error('Error getting directions:', error);
    return null;
  }
};


