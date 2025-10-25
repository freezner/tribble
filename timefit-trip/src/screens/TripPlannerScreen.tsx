import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTripStore } from '../stores/tripStore';
import { TripSummaryCard, PlaceCard, PlaceSearchInput, TransportModePicker, TravelBadge, TripNameDialog, TripShareCard } from '../components';
import { DEFAULT_STAY_DURATION } from '../constants';
import { DUOLINGO_COLORS } from '../constants';
import { TransportMode } from '../types';
import { shareTripAsImage } from '../utils/shareTrip';
import { useTranslation } from 'react-i18next';

interface Props {
  onBack?: () => void;
}

export const TripPlannerScreen: React.FC<Props> = ({ onBack }) => {
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
    setTripName,
  } = useTripStore();
  
  const [isSaving, setIsSaving] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<any>(null);
  const [showTransportPicker, setShowTransportPicker] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [isAddingNewPlace, setIsAddingNewPlace] = useState(false);
  
  const shareViewRef = useRef<View>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!currentTrip) {
      createTrip(t('newTrip'));
    }
  }, [createTrip, currentTrip]);

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
      setIsAddingNewPlace(true);
      setShowTransportPicker(true);
    } else {
      addPlace(newPlace);
      // Alert.alert('성공', `${placeData.name}이(가) 추가되었습니다!`);
    }
  };

  const handleTransportModeSelect = async (mode: TransportMode) => {
    if (pendingPlace && currentTrip) {
      // 새 장소 추가 모드인 경우
      if (isAddingNewPlace) {
        // 이전 장소에 이동 수단 설정
        const lastPlace = currentTrip.places[currentTrip.places.length - 1];
        updatePlace(lastPlace.id, { transportModeToNext: mode });
        
        // 새 장소 추가
        addPlace(pendingPlace);
        // Alert.alert('성공', `${pendingPlace.name}이(가) 추가되었습니다!`);
        setPendingPlace(null);
        setIsAddingNewPlace(false);
      } 
      // 이동 수단 변경 모드인 경우 (기존 장소)
      else {
        updatePlace(pendingPlace.id, { transportModeToNext: mode });
        await recalculateTravelTimes();
        Alert.alert(t('complete'), t('resetTravelTime'));
        setPendingPlace(null);
      }
    }
  };

  const handleSaveTrip = () => {
    if (!currentTrip || currentTrip.places.length === 0) {
      Alert.alert(t('alert'), t('noPlacesToSave'));
      return;
    }
    setShowNameDialog(true);
  };

  const handleSaveTripWithName = async (tripName: string) => {
    if (!currentTrip) return;

    setIsSaving(true);
    setShowNameDialog(false);

    try {
      // 여정 이름 업데이트
      setTripName(tripName);
      
      // 여정 저장
      await saveCurrentTrip();
      
      Alert.alert(t('saveComplete'), t('tripSavedSuccess', { tripName }));
      console.log('여행 저장 완료:', tripName);
    } catch (error) {
      console.error('저장 실패:', error);
      Alert.alert(t('error'), t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareTrip = async () => {
    if (!currentTrip || currentTrip.places.length === 0) {
      Alert.alert(t('alert'), t('noPlacesToShare'));
      return;
    }

    try {
      await shareTripAsImage(shareViewRef, currentTrip.name);
    } catch (error) {
      console.error('공유 실패:', error);
    }
  };

  if (!currentTrip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('creatingTrip')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons
              name="arrow-back"
              size={25}
              color={DUOLINGO_COLORS.gray}
            />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{currentTrip.name}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.shareButton} 
            onPress={handleShareTrip}
          >
            <MaterialIcons 
              name="ios-share" 
              size={25} 
              color={DUOLINGO_COLORS.blue}
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
            onPress={handleSaveTrip}
            disabled={isSaving}
          >
            <MaterialIcons
              name={isSaving ? "autorenew" : "check"}
              size={25}
              color={DUOLINGO_COLORS.green}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* 장소 검색 */}
        <PlaceSearchInput onPlaceSelected={handleAddPlace} />

        {/* 이동 시간 계산 중 표시 */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('calculatingTravelTime')}</Text>
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
              {t('startPlanningTrip')}
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
                    onEdit={() => {
                      // 기존 편집 기능 (체류 시간 수정 등)
                    }}
                    onUpdateName={(newName) => {
                      updatePlace(place.id, { name: newName });
                    }}
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
                        setIsAddingNewPlace(false);
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
          setIsAddingNewPlace(false);
        }}
      />

      {/* 여정 이름 입력 다이얼로그 */}
      <TripNameDialog
        visible={showNameDialog}
        initialName={currentTrip?.name}
        onSave={handleSaveTripWithName}
        onCancel={() => setShowNameDialog(false)}
      />

      {/* 공유용 숨겨진 뷰 */}
      <View style={styles.hiddenShareView}>
        <View ref={shareViewRef} collapsable={false}>
          <TripShareCard trip={currentTrip} />
        </View>
      </View>
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
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#333',
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
  hiddenShareView: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
});


