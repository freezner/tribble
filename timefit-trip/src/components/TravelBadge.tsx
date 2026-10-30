import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TravelLeg, TransportMode } from '../types';
import { formatMinutes, isTmapResultExpired } from '../utils/timeCalculator';
import { colors, radii, typography } from '../constants/theme';

interface Props { leg: TravelLeg; onPress?: () => void; onRetry?: () => void; }

const icons: Record<TransportMode, React.ComponentProps<typeof MaterialIcons>['name']> = {
  driving: 'directions-car', walking: 'directions-walk', transit: 'directions-transit', bicycling: 'directions-bike',
};

export const TravelBadge: React.FC<Props> = ({ leg, onPress, onRetry }) => {
  const { t } = useTranslation();
  const expired = isTmapResultExpired(leg);
  const status = expired ? 'unavailable' : leg.status;
  const resolved = (status === 'ready' || status === 'estimated') && leg.duration !== null;
  const duration = resolved ? formatMinutes(leg.duration, { hours: t('hours'), minutes: t('minutes') }) : null;
  const distance = resolved ? leg.distance : null;
  const timeText = status === 'pending' ? t('routePending', { defaultValue: '이동 시간 계산 중' })
    : status === 'unavailable' || duration === null ? t('routeUnavailableAction', { defaultValue: '이동 시간을 불러오지 못했어요' })
    : status === 'estimated' ? t('estimatedDuration', { duration, defaultValue: '약 {{duration}}' }) : duration;
  const contents = (
    <>
      {status === 'pending' ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <MaterialIcons name={icons[leg.mode]} size={18} color={colors.textSecondary} />}
      <View style={styles.details}>
        <Text style={[styles.travelText, status === 'unavailable' && styles.warning]}>{t(leg.mode)} · {timeText}</Text>
        {leg.source === 'tmap' && <Text style={styles.source}>{t('tmapAttribution')}{distance !== null ? ' · ' + (distance / 1000).toFixed(1) + ' km' : ''}</Text>}
        {leg.source === 'kakao' && <Text style={styles.source}>{t('kakaoAttribution')}{distance !== null ? ' · ' + (distance / 1000).toFixed(1) + ' km' : ''}</Text>}
        {leg.source === 'kakao' && status === 'estimated' && !!leg.reason && <Text style={styles.source}>{t('routeReason.' + leg.reason, { defaultValue: t('estimate') })}</Text>}
        {(leg.source === 'manual' || (status === 'estimated' && leg.source !== 'kakao')) && <Text style={styles.source}>{leg.source === 'manual' ? t('manualEntry', { defaultValue: '직접 입력' }) + ' · ' + t('estimate', { defaultValue: '추정' }) : t('estimate', { defaultValue: '추정' })}{distance !== null && distance > 0 ? ' · ' + (distance / 1000).toFixed(1) + ' km' : ''}</Text>}
        {status === 'unavailable' && (expired || leg.reason) && <Text style={styles.source}>{expired ? t('routeUnavailable', { defaultValue: '이동 시간을 확인해 주세요' }) : t('routeReason.' + leg.reason, { defaultValue: t('routeUnavailable', { defaultValue: '이동 시간을 확인해 주세요' }) })}</Text>}
      </View>
      {onPress && <MaterialIcons name="chevron-right" size={18} color={colors.textSecondary} />}
    </>
  );

  return (
    <View style={styles.container}>
      {onPress ? <Pressable accessibilityRole="button" accessibilityLabel={t('changeTransport', { defaultValue: '교통수단 변경' }) + ' · ' + t(leg.mode) + ' · ' + timeText} onPress={onPress} style={({ pressed }) => [styles.badge, pressed && styles.pressed]}>{contents}</Pressable>
        : <View style={styles.badge}>{contents}</View>}
      {status === 'unavailable' && onRetry && <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><MaterialIcons name="refresh" size={16} color={colors.primary} /><Text style={styles.retryText}>{t('retry', { defaultValue: '다시 계산' })}</Text></Pressable>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginLeft: 60, paddingVertical: 5 },
  badge: { flexDirection: 'row', minHeight: 44, alignItems: 'center', gap: 7, borderRadius: radii.sm, paddingVertical: 7, paddingHorizontal: 10 },
  details: { flex: 1, minWidth: 0 },
  travelText: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },
  source: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  warning: { color: colors.warning },
  pressed: { backgroundColor: colors.surfaceMuted },
  retry: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, gap: 5, paddingHorizontal: 10 },
  retryText: { ...typography.caption, color: colors.primary, fontWeight: '500' },
});
