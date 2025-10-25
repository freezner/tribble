import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trip, TripSummary } from '../types';
import { formatMinutes } from '../utils/timeCalculator';
import { calculateTripSummary } from '../utils/timeCalculator';
import { DUOLINGO_COLORS, TRANSPORT_MODES } from '../constants';

interface Props {
  trip: Trip;
}

export const TripShareCard: React.FC<Props> = ({ trip }) => {
  const summary = calculateTripSummary(trip.places, trip.totalAvailableTime);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.appName}>Tribble - 여정 공유</Text>
        <Text style={styles.tripName}>{trip.name}</Text>
      </View>

      {/* 요약 */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>총 소요</Text>
          <Text style={[styles.summaryValue, summary.isOverTime && styles.overTime]}>
            {formatMinutes(summary.totalTime)}
          </Text>
        </View>
        <View style={[styles.badge, summary.isOverTime ? styles.overTimeBadge : styles.onTimeBadge]}>
          <Text style={styles.badgeText}>
            {summary.isOverTime ? '⚠️ 시간 초과' : '✅ 여유 있음'}
          </Text>
        </View>
      </View>

      {/* 장소 목록 */}
      <View style={styles.placesContainer}>
        <Text style={styles.placesTitle}>이동 경로 ({trip.places.length}개의 장소)</Text>
        {trip.places.map((place, index) => {
          const transport = TRANSPORT_MODES.find(t => t.value === (place.transportModeToNext || trip.transportMode));
          const transportIcon = transport?.icon || '🚗';
          
          return (
            <View key={place.id}>

              {/* 이동 정보 */}
              {place.travelTimeToNext !== undefined && (
                <View style={styles.travelRow}>
                  <Text style={styles.arrow}>↓</Text>
                  <Text style={styles.travelInfo}>
                    {transportIcon} {formatMinutes(place.travelTimeToNext)}
                    {place.travelDistance && 
                      ` · ${(place.travelDistance / 1000).toFixed(1)}km`
                    }
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* 푸터 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tribble로 만든 여행 계획
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 24,
    width: 375,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: DUOLINGO_COLORS.red,
    paddingBottom: 16,
  },
  appName: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
    marginBottom: 8,
  },
  tripName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  summaryContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: DUOLINGO_COLORS.red,
  },
  overTime: {
    color: DUOLINGO_COLORS.red,
  },
  badge: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  onTimeBadge: {
    backgroundColor: DUOLINGO_COLORS.green,
  },
  overTimeBadge: {
    backgroundColor: DUOLINGO_COLORS.red,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  placesContainer: {
    marginBottom: 20,
  },
  placesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DUOLINGO_COLORS.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  placeNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  placeDetail: {
    fontSize: 12,
    color: DUOLINGO_COLORS.gray,
  },
  travelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14,
    marginBottom: 8,
  },
  arrow: {
    fontSize: 16,
    color: DUOLINGO_COLORS.gray,
    marginRight: 8,
  },
  travelInfo: {
    fontSize: 13,
    color: DUOLINGO_COLORS.gray,
    fontWeight: '500',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: DUOLINGO_COLORS.lightGray,
    paddingTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: DUOLINGO_COLORS.gray,
  },
});

