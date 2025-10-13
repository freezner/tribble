import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useTripStore } from '../stores/tripStore';
import { Trip } from '../types';
import { DUOLINGO_COLORS } from '../constants';
import { formatMinutes } from '../utils/timeCalculator';

interface Props {
  onSelectTrip?: (tripId: string) => void;
}

export const SavedTripsScreen: React.FC<Props> = ({ onSelectTrip }) => {
  const { savedTrips, loadAllTrips, deleteTrip, loadTrip } = useTripStore();

  useEffect(() => {
    loadAllTrips();
  }, []);

  const handleSelectTrip = (tripId: string) => {
    loadTrip(tripId);
    onSelectTrip?.(tripId);
  };

  const handleDeleteTrip = (tripId: string) => {
    deleteTrip(tripId);
  };

  const renderTripItem = ({ item }: { item: Trip }) => {
    const totalPlaces = item.places.length;
    const totalTime = item.places.reduce(
      (sum, place) => sum + place.stayDuration + (place.travelTimeToNext || 0),
      0
    );

    return (
      <TouchableOpacity
        style={styles.tripCard}
        onPress={() => handleSelectTrip(item.id)}
      >
        <View style={styles.tripCardContent}>
          <Text style={styles.tripName}>{item.name}</Text>
          <View style={styles.tripInfo}>
            <Text style={styles.tripInfoText}>
              📍 {totalPlaces}개 장소
            </Text>
            <Text style={styles.tripInfoText}>
              ⏱️ {formatMinutes(totalTime)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTrip(item.id)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>저장된 여행</Text>
      </View>

      {savedTrips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            저장된 여행이 없습니다.{'\n'}
            새로운 여행을 계획해보세요! ✈️
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: DUOLINGO_COLORS.lightGray,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  listContent: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripCardContent: {
    flex: 1,
  },
  tripName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tripInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  tripInfoText: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: DUOLINGO_COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
});


