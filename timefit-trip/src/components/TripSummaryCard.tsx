import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TripSummary } from '../types';
import { formatMinutes } from '../utils/timeCalculator';
import { DUOLINGO_COLORS } from '../constants';

interface Props {
  summary: TripSummary;
}

export const TripSummaryCard: React.FC<Props> = ({ summary }) => {
  const { t } = useTranslation();
  const {
    totalStayTime,
    totalTravelTime,
    totalTime,
    availableTime,
    isOverTime,
    remainingTime,
  } = summary;

  const progressPercentage = Math.min((totalTime / availableTime) * 100, 100);
  const progressColor = isOverTime ? DUOLINGO_COLORS.red : DUOLINGO_COLORS.green;

  return (
    <View style={styles.container}>
      {/* 진행 바 */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${progressPercentage}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>

      {/* 시간 정보 */}
      <View style={styles.timeInfoContainer}>

        <View style={styles.timeRow}>
          <Text style={styles.label}>{t('travelTime')}</Text>
          <Text style={styles.value}>{formatMinutes(totalTravelTime, { hours: t('hours'), minutes: t('minutes') })}</Text>
        </View>

      </View>

      {/* 남은/초과 시간 */}
      <View style={[styles.remainingContainer, isOverTime && styles.overTimeContainer]}>
        <Text style={[styles.remainingText, isOverTime && styles.overTimeText]}>
          {t('totalTime')}: {formatMinutes(totalTime, { hours: t('hours'), minutes: t('minutes') })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: DUOLINGO_COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  timeInfoContainer: {
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: DUOLINGO_COLORS.lightGray,
    marginTop: 8,
    paddingTop: 12,
  },
  label: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: DUOLINGO_COLORS.green,
  },
  overTime: {
    color: DUOLINGO_COLORS.red,
  },
  remainingContainer: {
    backgroundColor: DUOLINGO_COLORS.red,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  overTimeContainer: {
    backgroundColor: DUOLINGO_COLORS.red,
  },
  remainingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  overTimeText: {
    color: '#fff',
  },
});


