import { PlaceWithDuration, TripSummary } from '../types';

/**
 * 여정의 총 시간을 계산합니다
 */
export const calculateTripSummary = (
  places: PlaceWithDuration[],
  availableTime: number
): TripSummary => {
  // const totalStayTime = places.reduce((sum, place) => sum + place.stayDuration, 0);
  const totalStayTime = 0;
  const totalTravelTime = places.reduce(
    (sum, place) => sum + (place.travelTimeToNext || 0),
    0
  );
  const totalTime = totalStayTime + totalTravelTime;
  const remainingTime = availableTime - totalTime;
  const isOverTime = remainingTime < 0;

  return {
    totalStayTime,
    totalTravelTime,
    totalTime,
    availableTime,
    isOverTime,
    remainingTime,
  };
};

/**
 * 분을 시간:분 형식으로 변환합니다
 */
export const formatMinutes = (
  minutes: number, 
  translations?: { hours: string; minutes: string }
): string => {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? '-' : '';
  
  // 번역이 제공되지 않으면 기본 한국어 사용
  const hoursText = translations?.hours || '시간';
  const minutesText = translations?.minutes || '분';
  
  if (hours === 0) {
    return `${sign}${mins}${minutesText}`;
  }
  
  return `${sign}${hours}${hoursText} ${mins > 0 ? `${mins}${minutesText}` : ''}`.trim();
};

/**
 * 시간을 분으로 변환합니다
 */
export const hoursToMinutes = (hours: number): number => {
  return Math.floor(hours * 60);
};

/**
 * 분을 시간으로 변환합니다
 */
export const minutesToHours = (minutes: number): number => {
  return Number((minutes / 60).toFixed(1));
};


