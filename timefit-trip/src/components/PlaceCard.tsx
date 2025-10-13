import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PlaceWithDuration } from '../types';
import { formatMinutes } from '../utils/timeCalculator';
import { DUOLINGO_COLORS } from '../constants';

interface Props {
  place: PlaceWithDuration;
  index: number;
  onRemove: () => void;
  onUpdateDuration: (duration: number) => void;
}

export const PlaceCard: React.FC<Props> = ({
  place,
  index,
  onRemove,
  onUpdateDuration,
}) => {
  return (
    <View style={styles.container}>
      {/* 순서 번호 */}
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>

      {/* 장소 정보 */}
      <View style={styles.contentContainer}>
        <Text style={styles.placeName} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.placeAddress} numberOfLines={1}>
          {place.address}
        </Text>

        {/* 체류 시간 */}
        <View style={styles.durationContainer}>
          <Text style={styles.durationLabel}>체류 시간:</Text>
          <Text style={styles.durationValue}>
            {formatMinutes(place.stayDuration)}
          </Text>
        </View>

      </View>

      {/* 삭제 버튼 */}
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DUOLINGO_COLORS.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indexText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 12,
    color: DUOLINGO_COLORS.gray,
    marginBottom: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  durationLabel: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
    marginRight: 6,
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: DUOLINGO_COLORS.green,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DUOLINGO_COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});


