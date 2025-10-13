import React, { useEffect, useRef, useState } from 'react';
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
import { TripShareCard } from '../components';
import { shareTripAsImage } from '../utils/shareTrip';

interface Props {
  onSelectTrip?: (tripId: string) => void;
  onCreateNew?: () => void;
}

export const SavedTripsScreen: React.FC<Props> = ({ onSelectTrip, onCreateNew }) => {
  const { savedTrips, loadAllTrips, deleteTrip, loadTrip, createTrip } = useTripStore();
  const shareViewRef = useRef<View>(null);
  const [shareTrip, setShareTrip] = useState<Trip | null>(null);

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

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={(e) => {
              e.stopPropagation();
              handleShareTrip(item);
            }}
          >
            <Text style={styles.shareButtonText}>📤</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteTrip(item.id);
            }}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleCreateNew = () => {
    createTrip('새 여행');
    onCreateNew?.();
  };

  const handleShareTrip = async (trip: Trip) => {
    try {
      setShareTrip(trip);
      // 다음 렌더링 사이클에서 캡처 (ref가 업데이트된 후)
      setTimeout(async () => {
        await shareTripAsImage(shareViewRef, trip.name);
        setShareTrip(null);
      }, 100);
    } catch (error) {
      console.error('공유 실패:', error);
      setShareTrip(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>저장된 여행</Text>
        <TouchableOpacity style={styles.newButton} onPress={handleCreateNew}>
          <Text style={styles.newButtonText}>+ 새 여행</Text>
        </TouchableOpacity>
      </View>

      {savedTrips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            저장된 여행이 없습니다.{'\n'}
            우측 상단 "+ 새 여행" 버튼을 눌러{'\n'}
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

      {/* 공유용 숨겨진 뷰 */}
      {shareTrip && (
        <View style={styles.hiddenShareView}>
          <View ref={shareViewRef} collapsable={false}>
            <TripShareCard trip={shareTrip} />
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  newButton: {
    backgroundColor: DUOLINGO_COLORS.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  newButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  shareButton: {
    padding: 8,
  },
  shareButtonText: {
    fontSize: 20,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  hiddenShareView: {
    position: 'absolute',
    left: -9999,
    top: -9999,
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


