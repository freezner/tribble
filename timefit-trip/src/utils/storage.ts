import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip } from '../types';

const TRIPS_KEY = 'trips';
const ACTIVE_TRIP_KEY = 'activeTrip';

/**
 * 모든 여정을 가져옵니다
 */
export const getAllTrips = async (): Promise<Trip[]> => {
  try {
    const tripsJson = await AsyncStorage.getItem(TRIPS_KEY);
    return tripsJson ? JSON.parse(tripsJson) : [];
  } catch (error) {
    console.error('Error getting trips:', error);
    return [];
  }
};

/**
 * 여정을 저장합니다
 */
export const saveTrip = async (trip: Trip): Promise<void> => {
  try {
    const trips = await getAllTrips();
    const existingIndex = trips.findIndex((t) => t.id === trip.id);
    
    if (existingIndex >= 0) {
      trips[existingIndex] = trip;
    } else {
      trips.push(trip);
    }
    
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  } catch (error) {
    console.error('Error saving trip:', error);
  }
};

/**
 * 여정을 삭제합니다
 */
export const deleteTrip = async (tripId: string): Promise<void> => {
  try {
    const trips = await getAllTrips();
    const filteredTrips = trips.filter((t) => t.id !== tripId);
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(filteredTrips));
  } catch (error) {
    console.error('Error deleting trip:', error);
  }
};

/**
 * 특정 여정을 가져옵니다
 */
export const getTrip = async (tripId: string): Promise<Trip | null> => {
  try {
    const trips = await getAllTrips();
    return trips.find((t) => t.id === tripId) || null;
  } catch (error) {
    console.error('Error getting trip:', error);
    return null;
  }
};

/**
 * 현재 활성 여정 ID를 설정합니다
 */
export const setActiveTripId = async (tripId: string): Promise<void> => {
  await AsyncStorage.setItem(ACTIVE_TRIP_KEY, tripId);
};

/**
 * 현재 활성 여정 ID를 가져옵니다
 */
export const getActiveTripId = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(ACTIVE_TRIP_KEY);
};


