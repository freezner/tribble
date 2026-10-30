// 상수 정의

// Public client configuration: this value remains visible in the app bundle.
export const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export const DEFAULT_STAY_DURATION = 60; // 기본 체류 시간 (분)
export const MIN_STAY_DURATION = 0; // 출발지·귀환지는 체류 없이 사용할 수 있습니다
export const MAX_STAY_DURATION = 480; // 최대 체류 시간 (8시간)

export const DEFAULT_TRIP_DURATION = 480; // 기본 여행 시간 (8시간)

export const TRANSPORT_MODES = [
  { value: 'driving', label: '자동차', icon: '🚗' },
  { value: 'walking', label: '도보', icon: '🚶' },
  { value: 'transit', label: '대중교통', icon: '🚌' },
  { value: 'bicycling', label: '자전거', icon: '🚴' },
] as const;

export const COLORS = {
  primary: '#cb311c',
  secondary: '#F5A623',
  success: '#7ED321',
  warning: '#F5A623',
  danger: '#D0021B',
  background: '#FFFFFF',
  backgroundDark: '#F5F5F5',
  text: '#333333',
  textLight: '#999999',
  border: '#E0E0E0',
};

export const DUOLINGO_COLORS = {
  green: '#58CC02',
  lightGreen: '#89E219',
  darkGreen: '#43A000',
  red: '#cb311c',
  yellow: '#FFC800',
  blue: '#1CB0F6',
  purple: '#CE82FF',
  gray: '#777777',
  lightGray: '#E5E5E5',
};


