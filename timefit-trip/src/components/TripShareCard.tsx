import React from 'react';
import { View, Text, StyleSheet, TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trip } from '../types';
import { formatMinutes, formatClock, isResolvedLeg } from '../utils/timeCalculator';
import { getTripSharePage, SHARE_CARD_CONFIGS, TripShareFormat } from '../utils/tripShareLayout';
import { SocialProfile, SOCIAL_PLATFORM_NAMES } from '../utils/socialProfiles';
import { colors } from '../constants/theme';

interface Props {
  trip: Trip;
  format?: TripShareFormat;
  pageIndex?: number;
  profile?: SocialProfile;
  title?: string;
}

// Export artwork has a fixed canvas; device accessibility font scaling must not crop it.
const CardText: React.FC<TextProps> = props => <Text {...props} allowFontScaling={false} />;

export const TripShareCard: React.FC<Props> = ({ trip, format = 'feed', pageIndex = 0, profile, title }) => {
  const { t } = useTranslation();
  const page = getTripSharePage(trip, format, pageIndex);
  const config = SHARE_CARD_CONFIGS[page.format];
  const { summary } = page;
  const unresolved = t('social.unresolved', { defaultValue: '미계산' });
  const duration = (minutes: number | null) => formatMinutes(minutes, { hours: t('hours'), minutes: t('minutes'), unknown: unresolved });
  const clock = (minutes: number | null) => formatClock(minutes, { unknown: unresolved, nextDay: t('nextDay') });
  const isEmpty = trip.places.length === 0;
  const headline = isEmpty ? t('emptySummary')
    : summary.totalTime === null ? summary.status === 'pending'
      ? t('social.calculating', { defaultValue: '전체 시간 계산 중' })
      : t('social.checkRoute', { defaultValue: '이동 시간 확인 필요' })
    : summary.remainingTime === 0 ? t('fitsExactly')
    : summary.isOverTime ? t('social.over', { duration: duration(Math.abs(summary.remainingTime!)), defaultValue: '예상 {{duration}} 초과' })
    : t('social.spare', { duration: duration(summary.remainingTime), defaultValue: '예상 {{duration}} 여유' });
  const profileLabel = profile ? SOCIAL_PLATFORM_NAMES[profile.platform] + ' · @' + profile.handle.replace(/^@+/, '') : null;
  const cardTitle = title?.trim() || 'tribble';

  return (
    <View style={[styles.container, config.canvas, {
      paddingTop: config.insets.top, paddingRight: config.insets.right,
      paddingBottom: config.insets.bottom, paddingLeft: config.insets.left,
    }]}>
      <View style={styles.masthead}>
        <CardText numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit minimumFontScale={0.65} style={styles.brand}>{cardTitle}</CardText>
      </View>
      <CardText numberOfLines={2} ellipsizeMode="tail" style={styles.title}>{trip.name}</CardText>
      <View style={styles.conditions}>
        <CardText numberOfLines={1} style={styles.dateLabel}>{t('social.travelDateLabel', { defaultValue: '여행 일자' })}</CardText>
        <CardText numberOfLines={1} style={styles.date}>{trip.date}</CardText>
        <View style={styles.clockRow}>
          <CardText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.departureClock}>
            {t('social.departureTime', { defaultValue: '출발 시각' })} {clock(trip.startTimeMinutes)}
          </CardText>
          <CardText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.arrivalClock}>
            {t('social.targetArrivalTime', { defaultValue: '도착 시각' })} {clock(trip.startTimeMinutes + trip.totalAvailableTime)}
          </CardText>
        </View>
      </View>

      <View style={[styles.summary, (summary.isOverTime || summary.totalTime === null) && styles.summaryWarning]}>
        <View style={styles.summaryTop}>
          <CardText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.headline}>{headline}</CardText>
          <View style={styles.total}>
            <CardText numberOfLines={1} style={styles.totalLabel}>{t('social.total', { defaultValue: '총 소요' })}</CardText>
            <CardText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.totalValue}>{isEmpty ? '—' : duration(summary.totalTime)}</CardText>
          </View>
        </View>
        <CardText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={styles.buffer}>
          {t('bufferTime')} {duration(summary.bufferTime)} · {t('bufferIncluded')}
        </CardText>
      </View>

      <View style={styles.pageHeading}>
        <CardText numberOfLines={1} style={styles.pageRange}>{t('social.partialRoute', { count: trip.places.length, from: isEmpty ? 0 : page.startIndex + 1, to: page.endIndex, defaultValue: '전체 {{count}}곳 중 {{from}}–{{to}}' })}</CardText>
        <CardText style={styles.pageNumber}>{t('social.page', { current: page.pageIndex + 1, total: page.pageCount, defaultValue: '{{current}} / {{total}}' })}</CardText>
      </View>
      <View style={styles.timeline}>
        {isEmpty && <View style={styles.empty}><CardText numberOfLines={3} style={styles.emptyText}>{t('social.emptyRoute', { defaultValue: '장소를 추가해 나만의 동선을 만들어 보세요' })}</CardText></View>}
        {page.stops.map(({ place, globalIndex, timeline: entry, isFirst, isLast }) => {
          const leg = entry.leg;
          const resolved = isResolvedLeg(leg);
          const legText = !leg ? null : !resolved ? unresolved
            : (leg.status === 'estimated' ? t('estimatedDuration', { duration: duration(leg.duration) }) : duration(leg.duration))
              + (leg.source === 'manual' ? ' · ' + t('manualEntry') : leg.status === 'estimated' ? ' · ' + t('estimate') : '');
          return (
            <View key={place.id} style={[styles.stop, { height: config.stopHeight }]}>
              {!isLast && <View style={styles.connector} />}
              <View style={styles.stopMain}>
                <View style={styles.markerColumn}>
                  <View style={[styles.marker, (isFirst || isLast) && styles.endpointMarker]}><CardText style={[styles.markerNumber, (isFirst || isLast) && styles.endpointNumber]}>{globalIndex + 1}</CardText></View>
                  {(isFirst || isLast) && <CardText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.endpointLabel}>{isFirst ? t('departure') : t('arrival')}</CardText>}
                </View>
                <View style={styles.placeCopy}>
                  <CardText numberOfLines={1} ellipsizeMode="tail" style={styles.placeName}>{place.name}</CardText>
                  <CardText numberOfLines={1} style={styles.stay}>{t('social.stay', { defaultValue: '체류' })} {duration(place.stayDuration)}</CardText>
                </View>
                <View style={styles.arrival}>
                  <CardText numberOfLines={1} style={styles.arrivalLabel}>{t('arrival')}</CardText>
                  <CardText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.arrivalTime}>{clock(entry.arrivalTimeMinutes)}</CardText>
                </View>
              </View>
              {leg && <CardText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.travel, !resolved && styles.unresolved]}>↳ {t(leg.mode)} · {legText}</CardText>}
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <CardText numberOfLines={1} ellipsizeMode="tail" style={styles.profile}>{profileLabel || t('sharedWithTribble')}</CardText>
          {profileLabel && <CardText style={styles.footerBrand}>tribble</CardText>}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, overflow: 'hidden' },
  masthead: { height: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  brand: { flex: 1, minWidth: 0, color: colors.primary, fontSize: 20, lineHeight: 22, fontWeight: '700', letterSpacing: -0.8 },
  title: { color: colors.text, fontSize: 20, lineHeight: 22, fontWeight: '700', letterSpacing: -0.5, height: 44 },
  conditions: { height: 45, marginTop: 4 },
  dateLabel: { color: colors.textSecondary, fontSize: 10, lineHeight: 12, height: 12, fontWeight: '600', marginBottom: 2 },
  date: { color: colors.textSecondary, fontSize: 10, lineHeight: 14, height: 14, fontVariant: ['tabular-nums'] },
  clockRow: { height: 15, flexDirection: 'row', gap: 8, marginTop: 2 },
  departureClock: { flex: 1, minWidth: 0, color: colors.textSecondary, fontSize: 11, lineHeight: 15, fontVariant: ['tabular-nums'] },
  arrivalClock: { flex: 1.4, minWidth: 0, color: colors.textSecondary, fontSize: 11, lineHeight: 15, textAlign: 'right', fontVariant: ['tabular-nums'] },
  summary: { backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, height: 64, marginTop: 8 },
  summaryWarning: { backgroundColor: colors.warningSoft },
  summaryTop: { flexDirection: 'row', alignItems: 'center', height: 32, gap: 10 },
  headline: { flex: 1, color: colors.primary, fontSize: 17, lineHeight: 23, fontWeight: '700' },
  total: { width: 90, alignItems: 'flex-end' },
  totalLabel: { color: colors.textSecondary, fontSize: 9, lineHeight: 12 },
  totalValue: { color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  buffer: { color: colors.textSecondary, fontSize: 10, lineHeight: 14, marginTop: 2 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 5, height: 13 },
  pageRange: { flex: 1, color: colors.textSecondary, fontSize: 10, lineHeight: 13 },
  pageNumber: { color: colors.primary, fontSize: 10, lineHeight: 13, fontWeight: '600', marginLeft: 12 },
  timeline: { flex: 1, minHeight: 0 },
  stop: { paddingTop: 1 },
  stopMain: { flexDirection: 'row', alignItems: 'flex-start', height: 36 },
  markerColumn: { width: 34, alignItems: 'center', marginRight: 8 },
  marker: { width: 23, height: 23, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  markerNumber: { color: colors.text, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  endpointMarker: { backgroundColor: colors.primary, borderColor: colors.primary },
  endpointNumber: { color: colors.onPrimary },
  endpointLabel: { color: colors.primary, fontSize: 8, lineHeight: 10, maxWidth: 34, marginTop: 2 },
  connector: { position: 'absolute', left: 16, top: 36, bottom: 2, width: 1, backgroundColor: colors.border },
  placeCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  placeName: { color: colors.text, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  stay: { color: colors.textSecondary, fontSize: 10, lineHeight: 14, marginTop: 2 },
  arrival: { width: 73, alignItems: 'flex-end' },
  arrivalLabel: { color: colors.textSecondary, fontSize: 8, lineHeight: 11 },
  arrivalTime: { color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  travel: { marginLeft: 42, color: colors.textSecondary, fontSize: 10, lineHeight: 14, marginTop: 3 },
  unresolved: { color: colors.warning },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  footer: { height: 26, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 16 },
  profile: { flex: 1, color: colors.text, fontSize: 11, lineHeight: 16, fontWeight: '500' },
  footerBrand: { color: colors.primary, fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: -0.4 },
});
