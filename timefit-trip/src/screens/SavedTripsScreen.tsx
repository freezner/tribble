import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../stores/tripStore';
import { Trip } from '../types';
import { colors } from '../constants/theme';
import { calculateTripSummary, formatMinutes, localDateString } from '../utils/timeCalculator';
import { clockInputValue } from '../utils/scheduleInput';

interface Props { onSelectTrip?: (tripId: string) => void; onCreateNew?: () => void; }

const formatUpdatedAt = (date: Date): string =>
  `${localDateString(date)} ${clockInputValue(date.getHours() * 60 + date.getMinutes())}`;

export const SavedTripsScreen: React.FC<Props> = ({ onSelectTrip, onCreateNew }) => {
  const { t } = useTranslation();
  const { savedTrips, drafts, currentTrip, loadTrip, resumeDraft, deleteTrip, flushDrafts, error } = useTripStore();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');
  const { unfinished, completed } = useMemo(() => {
    const savedById = new Map(savedTrips.map(trip => [trip.id, trip]));
    const draftById = new Map(drafts.map(trip => [trip.id, trip]));
    if (currentTrip) draftById.set(currentTrip.id, currentTrip);
    const unfinished: Trip[] = [];
    for (const draft of draftById.values()) {
      const saved = savedById.get(draft.id);
      if (!saved || draft.revision > saved.revision || (draft.revision === saved.revision && draft.name !== saved.name)) {
        unfinished.push(draft);
        savedById.delete(draft.id);
      }
    }
    const recentFirst = (a: Trip, b: Trip) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    return { unfinished: unfinished.sort(recentFirst), completed: Array.from(savedById.values()).sort(recentFirst) };
  }, [savedTrips, drafts, currentTrip]);
  const continueTrip = unfinished.find(trip => trip.id === currentTrip?.id) ?? unfinished[0];
  const hasTrips = unfinished.length + completed.length > 0;
  const sections = [
    ...(unfinished.length ? [{ key: 'drafts', title: t('planner.draftListTitle', { defaultValue: '작성 중인 초안' }), isDraft: true, data: unfinished }] : []),
    ...(completed.length ? [{ key: 'saved', title: t('planner.savedListTitle', { defaultValue: '저장한 여행' }), isDraft: false, data: completed }] : []),
  ];

  const openTrip = async (trip: Trip, draft: boolean) => {
    if (busyId) return;
    setBusyId(trip.id);
    setLocalError('');
    try {
      await flushDrafts();
      if (draft) await resumeDraft(trip.id);
      else await loadTrip(trip.id);
      onSelectTrip?.(trip.id);
    } catch { setLocalError(t('planner.openError', { defaultValue: '여행을 불러오지 못했어요' })); }
    finally { setBusyId(null); }
  };

  const confirmDelete = (trip: Trip) => {
    Alert.alert(t('planner.deleteTripTitle', { defaultValue: '이 여행을 삭제할까요?' }), t('planner.deleteTripBody', { defaultValue: '“{{name}}”의 저장본과 초안이 함께 삭제됩니다.', name: trip.name }), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
        setBusyId(trip.id);
        try { await deleteTrip(trip.id); setLocalError(''); }
        catch { setLocalError(t('planner.deleteFailed', { defaultValue: '삭제하지 못했어요. 다시 시도해 주세요.' })); }
        finally { setBusyId(null); }
      } },
    ]);
  };

  const renderTrip = ({ item, section }: { item: Trip; section: { isDraft: boolean } }) => {
    const summary = calculateTripSummary(item);
    const draft = section.isDraft;
    return <View style={styles.tripCard}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={draft ? t('planner.resumeTrip', { defaultValue: '{{name}} 이어서 계획하기', name: item.name }) : t('planner.openTrip', { defaultValue: '{{name}} 열기', name: item.name })} disabled={!!busyId} onPress={() => void openTrip(item, draft)} style={styles.tripMain}>
        <View style={styles.tripTop}>
          <Text style={styles.tripDate}>{t('planner.firstSavedDate', { date: localDateString(item.createdAt) })}</Text>
          <Text style={[styles.state, draft && styles.draft]}>{draft ? t('planner.draft', { defaultValue: '초안' }) : t('planner.savedState', { defaultValue: '저장됨' })}</Text>
        </View>
        <Text style={styles.tripName} numberOfLines={2}>{item.name}</Text>
        {item.places.length > 0 && <Text style={styles.placePreview} numberOfLines={1}>{item.places.map(place => place.name).join(' → ')}</Text>}
        <Text style={styles.tripSchedule}>{t('planner.travelDate', { date: item.date })}</Text>
        <Text style={styles.tripMeta}>{clockInputValue(item.startTimeMinutes)} — {clockInputValue(item.startTimeMinutes + item.totalAvailableTime)} · {t('planner.placeCount', { defaultValue: '{{count}}곳', count: item.places.length })}</Text>
        <View style={styles.tripBottom}>
          <View style={styles.flex}>
            <Text style={[styles.total, summary.isOverTime === true && styles.over]}>{item.places.length === 0 ? t('planner.emptyDraft', { defaultValue: '아직 장소를 추가하지 않았어요' }) : summary.totalTime === null ? t('planner.needsRoute', { defaultValue: '이동 시간 확인 필요' }) : t('planner.totalDuration', { defaultValue: '총 {{duration}}', duration: formatMinutes(summary.totalTime, { hours: t('hours'), minutes: t('minutes') }) })}</Text>
            {summary.estimatedLegCount > 0 && <Text style={styles.estimate}>{t('planner.includesEstimate', { defaultValue: '추정·직접 입력 시간 포함' })}</Text>}
            {draft && <Text style={styles.resumeText}>{t('planner.resumeDraft', { defaultValue: '이어서 작성' })}</Text>}
          </View>
          {busyId === item.id ? <ActivityIndicator color={colors.primary} /> : <MaterialIcons name="arrow-forward" size={21} color={colors.primary} />}
        </View>
        {item.updatedAt.getTime() > item.createdAt.getTime() && <Text style={styles.lastUpdated}>{t('planner.lastUpdatedAt', { date: formatUpdatedAt(item.updatedAt) })}</Text>}
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('planner.deleteNamedTrip', { defaultValue: '{{name}} 삭제', name: item.name })} disabled={!!busyId} onPress={() => confirmDelete(item)} style={styles.deleteButton}>
        <MaterialIcons name="delete-outline" size={20} color={colors.textSecondary} /><Text style={styles.deleteText}>{t('delete')}</Text>
      </TouchableOpacity>
    </View>;
  };

  return <SafeAreaView style={styles.container} edges={['top']}>
    <SectionList sections={sections} keyExtractor={trip => trip.id} renderItem={renderTrip} contentContainerStyle={styles.content} stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => <View style={styles.sectionHeader}><View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>{section.title}</Text><Text style={styles.sectionCount}>{section.data.length}</Text></View>{section.isDraft && <Text style={styles.sectionHint}>{t('planner.draftListHint', { defaultValue: '저장하지 않은 일정도 여기에서 이어서 완성할 수 있어요.' })}</Text>}</View>}
      ListHeaderComponent={<>
        <View style={styles.brandRow}><Text style={styles.brand}>tribble</Text><Text style={styles.brandNote}>{t('planner.brandNote', { defaultValue: '시간에 맞춘 여행' })}</Text></View>
        <View style={styles.headingRow}><Text style={styles.heading}>{t('planner.myTrips', { defaultValue: '내 여행' })}</Text>{hasTrips && <TouchableOpacity accessibilityRole="button" style={styles.newSmall} disabled={!!busyId} onPress={onCreateNew}><MaterialIcons name="add" size={20} color={colors.onPrimary} /><Text style={styles.newSmallText}>{t('planner.newTrip', { defaultValue: '새 여행' })}</Text></TouchableOpacity>}</View>
        {!!(localError || error) && <View style={styles.errorBanner}><Text style={styles.errorText}>{localError || t('planner.homeStorageError', { defaultValue: '일부 변경 내용을 저장하지 못했어요. 일정을 열어 다시 저장해 주세요.' })}</Text></View>}
        {hasTrips && <Text style={styles.subtitle}>{t('planner.homeSubtitle', { defaultValue: '저장한 여행과 이어서 작성할 초안을 모았어요.' })}</Text>}
        {continueTrip && <View style={styles.continueCard}>
          <View style={styles.continueHeading}><MaterialIcons name="history" size={22} color={colors.primary} /><Text style={styles.continueTitle}>{t('planner.continuePlanning', { defaultValue: '이어서 계획하기' })}</Text></View>
          <Text style={styles.continueDate}>{t('planner.firstSavedDate', { date: localDateString(continueTrip.createdAt) })}</Text>
          <Text style={styles.continueName} numberOfLines={2}>{continueTrip.name}</Text>
          {continueTrip.places.length > 0 && <Text style={styles.continueMeta} numberOfLines={1}>{continueTrip.places.map(place => place.name).join(' → ')}</Text>}
          <Text style={styles.continueMeta}>{t('planner.travelDate', { date: continueTrip.date })} · {t('planner.placeCount', { defaultValue: '{{count}}곳', count: continueTrip.places.length })}</Text>
          {continueTrip.updatedAt.getTime() > continueTrip.createdAt.getTime() && <Text style={styles.lastUpdated}>{t('planner.lastUpdatedAt', { date: formatUpdatedAt(continueTrip.updatedAt) })}</Text>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('planner.resumeTrip', { defaultValue: '{{name}} 이어서 계획하기', name: continueTrip.name })} disabled={!!busyId} onPress={() => void openTrip(continueTrip, true)} style={styles.continueButton}>
            <Text style={styles.continueButtonText}>{t('planner.resumeDraft', { defaultValue: '이어서 작성' })}</Text>{busyId === continueTrip.id ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <MaterialIcons name="arrow-forward" size={20} color={colors.onPrimary} />}
          </TouchableOpacity>
          <Text style={styles.continueHint}>{t('planner.draftRecoveryHint', { defaultValue: '초안은 이 기기에 보관돼요. 새 여행을 시작해도 이전 초안은 남아 있어요.' })}</Text>
        </View>}
      </>}
      ListEmptyComponent={<View style={styles.hero}>
        <View style={styles.heroIcon}><MaterialIcons name="schedule" size={37} color={colors.primary} /></View>
        <Text style={styles.heroTitle}>{t('planner.welcomeTitle', { defaultValue: '오늘, 몇 시간의\n여행을 떠날까요?' })}</Text>
        <Text style={styles.heroBody}>{t('planner.welcomeBody', { defaultValue: '가고 싶은 곳과 머무를 시간을 더하면,\n내 시간 안에 가능한 일정이 보여요.' })}</Text>
        <View style={styles.steps}><Text style={styles.step}>{t('planner.stepTime', { defaultValue: '시간 정하기' })}</Text><MaterialIcons name="chevron-right" size={16} color={colors.textSecondary} /><Text style={styles.step}>{t('planner.stepPlaces', { defaultValue: '장소 추가' })}</Text><MaterialIcons name="chevron-right" size={16} color={colors.textSecondary} /><Text style={styles.step}>{t('planner.stepCheck', { defaultValue: '여유 확인' })}</Text></View>
        <TouchableOpacity accessibilityRole="button" style={styles.startButton} onPress={onCreateNew}><Text style={styles.startText}>{t('planner.startTrip', { defaultValue: '첫 여행 만들기' })}</Text><MaterialIcons name="arrow-forward" size={20} color={colors.onPrimary} /></TouchableOpacity>
        <Text style={styles.localNote}>{t('planner.localNote', { defaultValue: '계정 없이 시작하고, 초안은 이 기기에 보관해요.' })}</Text>
      </View>}
    />
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 22, paddingBottom: 36, flexGrow: 1 },
  flex: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 25 },
  brand: { color: colors.primary, fontSize: 25, fontWeight: '700', letterSpacing: -1.2 },
  brandNote: { color: colors.textSecondary, fontSize: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heading: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.8 },
  newSmall: { flexDirection: 'row', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 13, minHeight: 44, borderRadius: 12, alignItems: 'center' },
  newSmallText: { color: colors.onPrimary, fontSize: 14, fontWeight: '600' },
  subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, marginTop: 12, marginBottom: 24 },
  continueCard: { backgroundColor: colors.primarySoft, borderRadius: 20, padding: 20, marginBottom: 12 },
  continueHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 16 },
  continueTitle: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  continueName: { color: colors.text, fontSize: 22, fontWeight: '600', lineHeight: 30 },
  continueDate: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
  continueMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },
  continueButton: { minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 18 },
  continueButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  continueHint: { color: colors.textSecondary, fontSize: 12, lineHeight: 19, marginTop: 12 },
  sectionHeader: { paddingTop: 20, paddingBottom: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  sectionCount: { color: colors.textSecondary, fontSize: 14 },
  sectionHint: { color: colors.textSecondary, fontSize: 12, lineHeight: 19, marginTop: 7 },
  resumeText: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 10 },
  errorBanner: { backgroundColor: colors.dangerSoft, padding: 14, borderRadius: 12, marginVertical: 14 },
  errorText: { color: colors.danger, lineHeight: 21, fontSize: 13 },
  tripCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, marginBottom: 16, backgroundColor: colors.surface, overflow: 'hidden' },
  tripMain: { padding: 20 },
  tripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 13 },
  tripDate: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  state: { color: colors.textSecondary, backgroundColor: colors.surfaceMuted, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, borderRadius: 6 },
  draft: { color: colors.primary, backgroundColor: colors.primarySoft },
  tripName: { color: colors.text, fontSize: 21, fontWeight: '600', lineHeight: 29, marginBottom: 8 },
  placePreview: { color: colors.text, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  tripMeta: { color: colors.textSecondary, fontSize: 13, fontVariant: ['tabular-nums'] },
  tripSchedule: { color: colors.textSecondary, fontSize: 13, marginBottom: 4 },
  lastUpdated: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 12, fontVariant: ['tabular-nums'] },
  tripBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 22, gap: 12 },
  total: { color: colors.text, fontSize: 16, fontWeight: '600' },
  over: { color: colors.danger },
  estimate: { color: colors.textSecondary, fontSize: 11, marginTop: 5 },
  deleteButton: { borderTopWidth: 1, borderTopColor: colors.border, minHeight: 44, alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row', gap: 6, paddingHorizontal: 20 },
  deleteText: { color: colors.textSecondary, fontSize: 12 },
  hero: { flex: 1, paddingVertical: 32 },
  heroIcon: { width: 72, height: 72, backgroundColor: colors.primarySoft, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  heroTitle: { color: colors.text, fontSize: 30, lineHeight: 41, letterSpacing: -1, fontWeight: '700', marginBottom: 18 },
  heroBody: { color: colors.textSecondary, fontSize: 15, lineHeight: 25 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 28, marginBottom: 32 },
  step: { color: colors.text, fontSize: 12 },
  startButton: { backgroundColor: colors.primary, borderRadius: 15, padding: 18, minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  startText: { color: colors.onPrimary, fontSize: 17, fontWeight: '600' },
  localNote: { fontSize: 12, lineHeight: 20, color: colors.textSecondary, marginTop: 14, textAlign: 'center' },
});
