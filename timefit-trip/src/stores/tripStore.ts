import { create } from 'zustand';
import { Trip, PlaceWithDuration, TransportMode, TripSummary } from '../types';
import { calculateTripSummary } from '../utils/timeCalculator';
import { saveTrip, getAllTrips, deleteTrip as deleteStoredTrip } from '../utils/storage';
import { calculateDistance } from '../services/googleApi';
import { DEFAULT_TRIP_DURATION } from '../constants';

interface TripStore {
  // 상태
  currentTrip: Trip | null;
  savedTrips: Trip[];
  isLoading: boolean;
  
  // 계산된 값
  summary: TripSummary | null;
  
  // 액션
  createTrip: (name: string) => void;
  loadTrip: (tripId: string) => Promise<void>;
  loadAllTrips: () => Promise<void>;
  saveCurrentTrip: () => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  
  // 장소 관리
  addPlace: (place: PlaceWithDuration) => void;
  removePlace: (placeId: string) => void;
  updatePlace: (placeId: string, updates: Partial<PlaceWithDuration>) => void;
  reorderPlaces: (startIndex: number, endIndex: number) => void;
  
  // 설정
  setTotalAvailableTime: (minutes: number) => void;
  setTransportMode: (mode: TransportMode) => void;
  
  // 이동 시간 재계산
  recalculateTravelTimes: () => Promise<void>;
  
  // 요약 업데이트
  updateSummary: () => void;
}

export const useTripStore = create<TripStore>((set, get) => ({
  currentTrip: null,
  savedTrips: [],
  isLoading: false,
  summary: null,
  
  createTrip: (name: string) => {
    const newTrip: Trip = {
      id: Date.now().toString(),
      name,
      places: [],
      totalAvailableTime: DEFAULT_TRIP_DURATION,
      transportMode: 'driving',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    set({ currentTrip: newTrip });
    get().updateSummary();
  },
  
  loadTrip: async (tripId: string) => {
    const trips = await getAllTrips();
    const trip = trips.find((t) => t.id === tripId);
    
    if (trip) {
      set({ currentTrip: trip });
      get().updateSummary();
    }
  },
  
  loadAllTrips: async () => {
    const trips = await getAllTrips();
    set({ savedTrips: trips });
  },
  
  saveCurrentTrip: async () => {
    const { currentTrip } = get();
    if (currentTrip) {
      const updatedTrip = {
        ...currentTrip,
        updatedAt: new Date(),
      };
      await saveTrip(updatedTrip);
      set({ currentTrip: updatedTrip });
      await get().loadAllTrips();
    }
  },
  
  deleteTrip: async (tripId: string) => {
    await deleteStoredTrip(tripId);
    await get().loadAllTrips();
    
    const { currentTrip } = get();
    if (currentTrip?.id === tripId) {
      set({ currentTrip: null, summary: null });
    }
  },
  
  addPlace: (place: PlaceWithDuration) => {
    const { currentTrip } = get();
    if (!currentTrip) return;
    
    const updatedTrip = {
      ...currentTrip,
      places: [...currentTrip.places, place],
    };
    
    set({ currentTrip: updatedTrip });
    get().recalculateTravelTimes();
  },
  
  removePlace: (placeId: string) => {
    const { currentTrip } = get();
    if (!currentTrip) return;
    
    const updatedTrip = {
      ...currentTrip,
      places: currentTrip.places.filter((p) => p.id !== placeId),
    };
    
    set({ currentTrip: updatedTrip });
    get().recalculateTravelTimes();
  },
  
  updatePlace: (placeId: string, updates: Partial<PlaceWithDuration>) => {
    const { currentTrip } = get();
    if (!currentTrip) return;
    
    const updatedTrip = {
      ...currentTrip,
      places: currentTrip.places.map((p) =>
        p.id === placeId ? { ...p, ...updates } : p
      ),
    };
    
    set({ currentTrip: updatedTrip });
    get().updateSummary();
  },
  
  reorderPlaces: (startIndex: number, endIndex: number) => {
    const { currentTrip } = get();
    if (!currentTrip) return;
    
    const places = Array.from(currentTrip.places);
    const [removed] = places.splice(startIndex, 1);
    places.splice(endIndex, 0, removed);
    
    const updatedTrip = {
      ...currentTrip,
      places,
    };
    
    set({ currentTrip: updatedTrip });
    get().recalculateTravelTimes();
  },
  
  setTotalAvailableTime: (minutes: number) => {
    const { currentTrip } = get();
    if (!currentTrip) return;
    
    set({
      currentTrip: {
        ...currentTrip,
        totalAvailableTime: minutes,
      },
    });
    get().updateSummary();
  },
  
  setTransportMode: (mode: TransportMode) => {
    const { currentTrip } = get();
    if (!currentTrip) return;
    
    set({
      currentTrip: {
        ...currentTrip,
        transportMode: mode,
      },
    });
    get().recalculateTravelTimes();
  },
  
  recalculateTravelTimes: async () => {
    const { currentTrip } = get();
    if (!currentTrip || currentTrip.places.length < 2) {
      console.log('이동 시간 계산 생략: 장소가 2개 미만');
      get().updateSummary();
      return;
    }
    
    console.log(`이동 시간 계산 시작: ${currentTrip.places.length}개 장소, 교통수단: ${currentTrip.transportMode}`);
    set({ isLoading: true });
    
    const updatedPlaces = [...currentTrip.places];
    
    // 각 장소 간 이동 시간 계산
    for (let i = 0; i < updatedPlaces.length - 1; i++) {
      const current = updatedPlaces[i];
      const next = updatedPlaces[i + 1];
      
      // 각 장소의 이동 수단 또는 기본 이동 수단 사용
      const transportMode = current.transportModeToNext || currentTrip.transportMode;
      
      console.log(`[${i + 1}/${updatedPlaces.length - 1}] 이동 시간 계산: ${current.name} → ${next.name} (${transportMode})`);
      
      const result = await calculateDistance(
        { lat: current.latitude, lng: current.longitude, placeId: current.placeId },
        { lat: next.latitude, lng: next.longitude, placeId: next.placeId },
        transportMode
      );
      
      if (result) {
        updatedPlaces[i] = {
          ...current,
          travelTimeToNext: result.duration,
          travelDistance: result.distance,
        };
        console.log(`✅ 계산 완료: ${result.duration}분, ${result.distance}m`);
      } else {
        console.error(`❌ 계산 실패: ${current.name} → ${next.name}`);
      }
    }
    
    console.log('이동 시간 계산 종료');
    
    set({
      currentTrip: {
        ...currentTrip,
        places: updatedPlaces,
      },
      isLoading: false,
    });
    
    get().updateSummary();
  },
  
  updateSummary: () => {
    const { currentTrip } = get();
    if (!currentTrip) {
      set({ summary: null });
      return;
    }
    
    const summary = calculateTripSummary(
      currentTrip.places,
      currentTrip.totalAvailableTime
    );
    
    set({ summary });
  },
}));


