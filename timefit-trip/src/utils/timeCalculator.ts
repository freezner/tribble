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
export const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? '-' : '';
  
  if (hours === 0) {
    return `${sign}${mins}분`;
  }
  
  return `${sign}${hours}시간 ${mins > 0 ? `${mins}분` : ''}`.trim();
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


