import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useTripStore } from '../stores/tripStore';
import { TripSummaryCard, PlaceCard, PlaceSearchInput, TransportModePicker, TravelBadge } from '../components';
import { DEFAULT_STAY_DURATION } from '../constants';
import { DUOLINGO_COLORS } from '../constants';
import { TransportMode } from '../types';

export const TripPlannerScreen: React.FC = () => {
  const {
    currentTrip,
    summary,
    isLoading,
    addPlace,
    removePlace,
    updatePlace,
    saveCurrentTrip,
    createTrip,
    recalculateTravelTimes,
  } = useTripStore();
  
  const [isSaving, setIsSaving] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<any>(null);
  const [showTransportPicker, setShowTransportPicker] = useState(false);

  useEffect(() => {
    if (!currentTrip) {
      createTrip('새 여행');
    }
  }, []);

  const handleAddPlace = (placeData: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    placeId: string;
  }) => {
    console.log('장소 추가:', placeData.name);
    
    const newPlace = {
      id: Date.now().toString(),
      name: placeData.name,
      address: placeData.address,
      latitude: placeData.latitude,
      longitude: placeData.longitude,
      placeId: placeData.placeId,
      stayDuration: DEFAULT_STAY_DURATION,
    };

    // 첫 번째 장소가 아니면 이동 수단 선택
    if (currentTrip && currentTrip.places.length > 0) {
      setPendingPlace(newPlace);
      setShowTransportPicker(true);
    } else {
      addPlace(newPlace);
      Alert.alert('성공', `${placeData.name}이(가) 추가되었습니다! ✅`);
    }
  };

  const handleTransportModeSelect = async (mode: TransportMode) => {
    if (pendingPlace && currentTrip) {
      // 이동 수단 변경 모드인 경우 (기존 장소)
      if (pendingPlace.id) {
        updatePlace(pendingPlace.id, { transportModeToNext: mode });
        await recalculateTravelTimes();
        Alert.alert('완료', '이동 시간이 재계산되었습니다! ✅');
        setPendingPlace(null);
      } 
      // 새 장소 추가 모드인 경우
      else {
        // 이전 장소에 이동 수단 설정
        const lastPlace = currentTrip.places[currentTrip.places.length - 1];
        updatePlace(lastPlace.id, { transportModeToNext: mode });
        
        // 새 장소 추가
        addPlace(pendingPlace);
        Alert.alert('성공', `${pendingPlace.name}이(가) 추가되었습니다! ✅`);
        setPendingPlace(null);
      }
    }
  };

  const handleSaveTrip = async () => {
    if (!currentTrip || currentTrip.places.length === 0) {
      Alert.alert('알림', '저장할 장소가 없습니다. 먼저 장소를 추가해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      await saveCurrentTrip();
      Alert.alert('저장 완료', '여행이 성공적으로 저장되었습니다! 🎉');
      console.log('여행 저장 완료:', currentTrip.name);
    } catch (error) {
      console.error('저장 실패:', error);
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentTrip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>여행을 생성하는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{currentTrip.name}</Text>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSaveTrip}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? '저장 중...' : '저장'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* 장소 검색 */}
        <PlaceSearchInput onPlaceSelected={handleAddPlace} />

        {/* 이동 시간 계산 중 표시 */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🚗 이동 시간 계산 중...</Text>
          </View>
        )}

        {/* 요약 카드 */}
        {summary && currentTrip.places.length > 0 && (
          <TripSummaryCard summary={summary} />
        )}

        {/* 장소 리스트 */}
        {currentTrip.places.length === 0 ? (
          <View style={styles.emptyPlacesContainer}>
            <Text style={styles.emptyPlacesText}>
              장소를 추가해서 여행 계획을 시작하세요! 🗺️
            </Text>
          </View>
        ) : (
          <View style={styles.placesList}>
            {currentTrip.places.map((place, index) => {
              const nextPlace = currentTrip.places[index + 1];
              const hasNextPlace = index < currentTrip.places.length - 1;
              
              return (
                <React.Fragment key={place.id}>
                  <PlaceCard
                    place={place}
                    index={index}
                    onRemove={() => removePlace(place.id)}
                    onUpdateDuration={(duration) =>
                      updatePlace(place.id, { stayDuration: duration })
                    }
                  />
                  
                  {/* 다음 장소가 있으면 이동 뱃지 표시 */}
                  {hasNextPlace && place.travelTimeToNext !== undefined && (
                    <TravelBadge
                      transportMode={place.transportModeToNext || currentTrip.transportMode}
                      travelTime={place.travelTimeToNext}
                      travelDistance={place.travelDistance}
                      onPress={() => {
                        // 이동 수단 변경 모달 표시를 위해 state 설정
                        setPendingPlace({ ...place, nextPlaceName: nextPlace?.name });
                        setShowTransportPicker(true);
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* 하단 여백 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 이동 수단 선택 모달 */}
      <TransportModePicker
        visible={showTransportPicker}
        selectedMode={
          pendingPlace?.transportModeToNext || 
          currentTrip?.transportMode || 
          'driving'
        }
        destinationName={pendingPlace?.nextPlaceName || pendingPlace?.name}
        onSelect={handleTransportModeSelect}
        onClose={() => {
          setShowTransportPicker(false);
          setPendingPlace(null);
        }}
      />
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
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: DUOLINGO_COLORS.lightGray,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  saveButton: {
    backgroundColor: DUOLINGO_COLORS.green,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    backgroundColor: DUOLINGO_COLORS.gray,
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: DUOLINGO_COLORS.gray,
  },
  emptyPlacesContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyPlacesText: {
    fontSize: 16,
    color: DUOLINGO_COLORS.gray,
    textAlign: 'center',
  },
  placesList: {
    paddingVertical: 8,
  },
  bottomSpacer: {
    height: 40,
  },
  loadingContainer: {
    backgroundColor: DUOLINGO_COLORS.blue,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});


