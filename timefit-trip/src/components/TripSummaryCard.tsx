import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TripSummary } from '../types';
import { formatMinutes, formatClock } from '../utils/timeCalculator';
import { colors, radii, typography } from '../constants/theme';

interface Props { summary: TripSummary; }

export const TripSummaryCard: React.FC<Props> = ({ summary }) => {
  const { t } = useTranslation();
  const format = (minutes: number) => formatMinutes(minutes, { hours: t('hours'), minutes: t('minutes') });
  const known = summary.totalTime !== null && summary.remainingTime !== null && summary.status !== 'empty';
  const over = known && summary.remainingTime! < 0;
  const exact = known && summary.remainingTime === 0;
  const denominator = Math.max(summary.availableTime, summary.totalTime ?? 0, 1);
  const percentage = (minutes: number): `${number}%` => `${minutes / denominator * 100}%`;
  const clock = formatClock(summary.endTimeMinutes, { unknown: t('timeUnknown', { defaultValue: '계산 후 표시' }), nextDay: t('nextDay', { defaultValue: '다음 날' }) });
  const statusText = summary.status === 'pending' ? t('routePending', { defaultValue: '이동 시간 계산 중' })
    : summary.status === 'unavailable' ? t('routeUnavailable', { defaultValue: '이동 시간을 확인해 주세요' })
    : summary.status === 'estimated' ? t('routeEstimated', { defaultValue: '추정 이동 시간 포함' })
    : t('routeReady', { defaultValue: '경로 기준 예상 시간' });

  if (summary.status === 'empty') {
    return <View style={[styles.container, styles.neutral]}><Text style={styles.emptyText}>{t('emptySummary', { defaultValue: '장소를 추가하면 시간을 계산해요' })}</Text></View>;
  }

  return (
    <View style={[styles.container, !known && styles.neutral, over && styles.overContainer]} accessibilityLiveRegion="polite">
      <Text style={styles.eyebrow}>{known ? (over ? t('expectedOvertime', { defaultValue: '예상 초과 시간' }) : t('expectedRemaining', { defaultValue: '예상 남는 시간' })) : t('totalTime')}</Text>
      {known ? (
        <Text style={[styles.result, over && styles.overText]}>{format(Math.abs(summary.remainingTime!))}</Text>
      ) : (
        <View style={styles.pendingResult}>
          {summary.status === 'pending' ? <ActivityIndicator color={colors.primary} /> : <MaterialIcons name="info-outline" size={22} color={colors.warning} />}
          <Text style={styles.pendingText}>{statusText}</Text>
        </View>
      )}
      {known && <Text style={styles.finish}>{t('expectedFinishAt', { time: clock, defaultValue: '{{time}} 종료 예상' })} · {t('totalTime')} {format(summary.totalTime!)}</Text>}
      {known && (
        <View style={styles.bar} accessible accessibilityLabel={t('totalTime') + ' ' + format(summary.totalTime!) + ' / ' + t('availableTime') + ' ' + format(summary.availableTime)}>
          <View style={[styles.staySegment, { width: percentage(summary.totalStayTime) }]} />
          <View style={[styles.travelSegment, { width: percentage(summary.totalTravelTime ?? 0) }]} />
          <View style={[styles.bufferSegment, { width: percentage(summary.bufferTime) }]} />
        </View>
      )}
      <View style={styles.breakdown}>
        <Text style={styles.detail}>{t('stayDuration')} {format(summary.totalStayTime)}</Text>
        <Text style={styles.detail}>{t('travelTime')} {summary.totalTravelTime === null ? '—' : format(summary.totalTravelTime)}</Text>
      </View>
      <Text style={styles.buffer}>{t('bufferTime', { defaultValue: '이동·대기 여유' })} {format(summary.bufferTime)} · {t('bufferIncluded', { defaultValue: '계획에 포함' })}</Text>
      {known && (
        <View style={styles.statusRow}>
          <MaterialIcons name={summary.status === 'estimated' ? 'info-outline' : 'schedule'} size={14} color={colors.textSecondary} />
          <Text style={styles.status}>{statusText}</Text>
        </View>
      )}
      {exact && <Text style={styles.caution}>{t('fitExactlyHint', { defaultValue: '지연에 대비한 여유를 더 확보해 보세요' })}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: colors.primarySoft, borderRadius: radii.xl, padding: 20 },
  neutral: { backgroundColor: colors.surfaceMuted },
  overContainer: { backgroundColor: colors.dangerSoft },
  eyebrow: { ...typography.label, color: colors.textSecondary },
  result: { color: colors.text, fontSize: 32, lineHeight: 42, fontWeight: '600', marginTop: 3, fontVariant: ['tabular-nums'] },
  overText: { color: colors.danger },
  finish: { ...typography.caption, color: colors.text, marginTop: 4 },
  bar: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', marginTop: 17, marginBottom: 11 },
  staySegment: { backgroundColor: colors.primary, height: '100%' },
  travelSegment: { backgroundColor: colors.textSecondary, height: '100%' },
  bufferSegment: { backgroundColor: '#BDB4A8', height: '100%' },
  breakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  detail: { ...typography.caption, color: colors.textSecondary },
  buffer: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 13 },
  status: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 },
  pendingResult: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 11, marginBottom: 14 },
  pendingText: { ...typography.body, color: colors.text, fontWeight: '500', flex: 1 },
  emptyText: { ...typography.label, color: colors.textSecondary },
  caution: { ...typography.caption, color: colors.warning, marginTop: 8 },
});
