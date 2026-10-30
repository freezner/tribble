import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PlaceCard, PlaceSearchInput, TransportModePicker, TravelBadge, TripNameDialog, TripSummaryCard } from '../components';
import { TripShareSheet } from '../components/TripShareSheet';
import { Trip } from '../types';
import { colors } from '../constants/theme';
import { DEFAULT_STAY_DURATION } from '../constants';
import { useTripStore } from '../stores/tripStore';
import { calculateTimeline, formatMinutes, isTmapResultExpired, usesKoreanTimeZone } from '../utils/timeCalculator';
import { clockInputValue, isValidLocalDate, parseClockInput } from '../utils/scheduleInput';

interface Props {
  onBack?: () => void;
  registerNavigationGuard?: (guard: ((proceed: () => void) => void) | null) => void;
}

export const TripPlannerScreen: React.FC<Props> = ({ onBack, registerNavigationGuard }) => {
  const store = useTripStore();
  const { currentTrip: trip, summary, isLoading, isDirty, isSaving, isPersistingDraft, draftSaveError, error } = store;
  const { t } = useTranslation();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [startInput, setStartInput] = useState('13:00');
  const [endInput, setEndInput] = useState('18:00');
  const [bufferInput, setBufferInput] = useState('30');
  const [scheduleError, setScheduleError] = useState('');
  const [nameOpen, setNameOpen] = useState(false);
  const [legId, setLegId] = useState<string | null>(null);
  const [shareTrip, setShareTrip] = useState<Trip | null>(null);
  const [notice, setNotice] = useState('');
  const leavePromptOpen = useRef(false);

  useEffect(() => {
    if (!trip) return;
    setDateInput(trip.date);
    setStartInput(clockInputValue(trip.startTimeMinutes));
    setEndInput(clockInputValue(trip.startTimeMinutes + trip.totalAvailableTime));
    setBufferInput(String(trip.bufferMinutes));
    setScheduleError('');
  }, [trip?.id, trip?.date, trip?.startTimeMinutes, trip?.totalAvailableTime, trip?.bufferMinutes]);

  useEffect(() => { setNotice(''); setLegId(null); setScheduleOpen(false); }, [trip?.id]);

  const scheduleDirty = !!trip && (dateInput.trim() !== trip.date || parseClockInput(startInput) !== trip.startTimeMinutes || parseClockInput(endInput) !== trip.startTimeMinutes + trip.totalAvailableTime || Number(bufferInput) !== trip.bufferMinutes || bufferInput.trim() === '');

  const cancelSchedule = () => {
    if (!trip) return;
    setDateInput(trip.date);
    setStartInput(clockInputValue(trip.startTimeMinutes));
    setEndInput(clockInputValue(trip.startTimeMinutes + trip.totalAvailableTime));
    setBufferInput(String(trip.bufferMinutes));
    setScheduleError('');
    setScheduleOpen(false);
    Keyboard.dismiss();
  };

  useEffect(() => {
    registerNavigationGuard?.(proceed => {
      if (!scheduleOpen || !scheduleDirty) { proceed(); return; }
      if (leavePromptOpen.current) return;
      leavePromptOpen.current = true;
      Alert.alert(
        t('planner.unappliedScheduleTitle', { defaultValue: '시간 설정을 적용할까요?' }),
        t('planner.unappliedScheduleBody', { defaultValue: '입력한 날짜와 시간을 초안에 반영한 뒤 이동할 수 있어요.' }),
        [
          { text: t('cancel'), style: 'cancel', onPress: () => { leavePromptOpen.current = false; } },
          { text: t('planner.discardAndLeave', { defaultValue: '입력 취소하고 이동' }), onPress: () => { leavePromptOpen.current = false; cancelSchedule(); proceed(); } },
          { text: t('planner.applyAndLeave', { defaultValue: '적용하고 이동' }), onPress: () => { leavePromptOpen.current = false; if (applySchedule()) proceed(); } },
        ],
        { cancelable: true, onDismiss: () => { leavePromptOpen.current = false; } },
      );
    });
    return () => registerNavigationGuard?.(null);
  }, [registerNavigationGuard, scheduleOpen, scheduleDirty, dateInput, startInput, endInput, bufferInput, trip, t]);

  if (!trip) return <SafeAreaView style={styles.container}><Text style={styles.emptyText}>{t('creatingTrip')}</Text></SafeAreaView>;

  const timeline = calculateTimeline(trip);
  const saveLabel = t(store.savedTrips.some(savedTrip => savedTrip.id === trip.id) ? 'edit' : 'save');
  const koreanTimeZone = usesKoreanTimeZone(trip);
  const selectedLeg = trip.legs.find(leg => leg.id === legId);
  const selectedLegExpired = selectedLeg ? isTmapResultExpired(selectedLeg) : false;
  const selectedOrigin = trip.places.find(place => place.id === selectedLeg?.fromPlaceId);
  const selectedDestination = trip.places.find(place => place.id === selectedLeg?.toPlaceId);
  const translatedMinutes = (minutes: number) => formatMinutes(minutes, { hours: t('hours'), minutes: t('minutes') });

  const applySchedule = () => {
    const start = parseClockInput(startInput);
    const end = parseClockInput(endInput);
    const buffer = Number(bufferInput);
    if (!isValidLocalDate(dateInput.trim()) || start === null || end === null || end <= start || !/^\d+$/.test(bufferInput) || !Number.isInteger(buffer) || buffer < 0 || buffer > 240) {
      setScheduleError(t('planner.invalidSchedule', { defaultValue: '날짜와 시간을 확인해 주세요. 마감은 출발 이후 같은 날, 여유 시간은 0~240분으로 입력해 주세요.' }));
      return false;
    }
    try {
      store.setSchedule({ date: dateInput.trim(), startTimeMinutes: start, totalAvailableTime: end - start, bufferMinutes: buffer });
      setScheduleOpen(false);
      setScheduleError('');
      Keyboard.dismiss();
      return true;
    } catch {
      setScheduleError(t('planner.invalidSchedule', { defaultValue: '날짜와 시간을 확인해 주세요. 마감은 출발 이후 같은 날, 여유 시간은 0~240분으로 입력해 주세요.' }));
      return false;
    }
  };

  const save = async () => {
    if (scheduleOpen && scheduleDirty && !applySchedule()) return;
    if (trip.places.length === 0) { setNotice(t('noPlacesToSave')); return; }
    try {
      await store.saveCurrentTrip();
      setNotice(t('planner.savedNotice', { defaultValue: '여행을 저장했어요.' }));
    } catch { setNotice(t('planner.saveFailed', { defaultValue: '저장하지 못했어요. 다시 저장해 주세요.' })); }
  };

  const finish = () => {
    if (scheduleOpen && scheduleDirty && !applySchedule()) return;
    if (trip.places.length === 0 || isSaving) return;
    const complete = async () => {
      try {
        await store.saveCurrentTrip();
        onBack?.();
      } catch { setNotice(t('planner.saveFailed', { defaultValue: '저장하지 못했어요. 다시 저장해 주세요.' })); }
    };
    const latest = useTripStore.getState().summary;
    const over = latest?.isOverTime === true;
    const unresolved = !over && (latest?.unresolvedLegCount ?? 0) > 0;
    if (!over && !unresolved) { void complete(); return; }
    Alert.alert(
      over ? t('planner.finishOverTitle') : t('planner.finishUnresolvedTitle'),
      over ? t('planner.finishOverBody') : t('planner.finishUnresolvedBody'),
      [{ text: t('cancel'), style: 'cancel' }, { text: t('planner.finishAnyway'), onPress: () => void complete() }],
    );
  };

  const share = () => {
    if (!trip.places.length || shareTrip) return;
    if (scheduleOpen && scheduleDirty && !applySchedule()) return;
    const latest = useTripStore.getState().currentTrip;
    // Freeze the applied itinerary while the user chooses a card and account label.
    if (latest) setShareTrip({ ...latest, places: latest.places.map(place => ({ ...place })), legs: latest.legs.map(leg => ({ ...leg })) });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('planner.backToTrips', { defaultValue: '내 여행으로 돌아가기' })} style={styles.iconButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={23} color={colors.text} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.headerLabel}>{t('planner.itinerary', { defaultValue: '여행 일정' })}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={saveLabel} accessibilityState={{ disabled: !trip.places.length || isSaving, busy: isSaving }} style={[styles.saveButton, (!trip.places.length || isSaving) && styles.disabled]} onPress={() => void save()} disabled={!trip.places.length || isSaving}>
            {isSaving ? <ActivityIndicator color={colors.textSecondary} size="small" /> : <Text style={styles.saveButtonText}>{saveLabel}</Text>}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('social.createCard')} accessibilityState={{ disabled: !trip.places.length || !!shareTrip }} style={[styles.createCardButton, (!trip.places.length || !!shareTrip) && styles.disabled]} onPress={share} disabled={!trip.places.length || !!shareTrip}>
            <MaterialIcons name="photo-library" size={18} color={colors.onPrimary} />
            <Text style={styles.createCardText}>{t('social.createCard')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>{t('planner.dayTrip', { defaultValue: '나의 하루, 내 속도로' })}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('planner.renameTrip', { defaultValue: '여행 이름 바꾸기' })} onPress={() => setNameOpen(true)} style={styles.nameButton}>
                <Text style={styles.title}>{trip.name}</Text><MaterialIcons name="edit" size={17} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.saveState, !!draftSaveError && styles.errorText]} accessibilityLiveRegion="polite">{draftSaveError ? t('planner.draftSaveFailed', { defaultValue: '초안을 보관하지 못했어요. 이 화면에서 다시 시도해 주세요.' }) : isSaving ? t('planner.saving', { defaultValue: '저장 중…' }) : isPersistingDraft ? t('planner.draftSaving', { defaultValue: '초안을 기기에 보관하는 중…' }) : isDirty ? t('planner.draftSaved', { defaultValue: '작성 중 · 초안 보관됨' }) : t('planner.savedState', { defaultValue: '저장됨' })}</Text>
              {!!draftSaveError && <TouchableOpacity accessibilityRole="button" disabled={isPersistingDraft} style={styles.draftLink} onPress={() => void store.flushDrafts().catch(() => {})}><MaterialIcons name="refresh" size={18} color={colors.primary} /><Text style={styles.draftLinkText}>{t('planner.retryDraftSave', { defaultValue: '초안 다시 보관' })}</Text></TouchableOpacity>}
              {isDirty && onBack && <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.draftLink}><MaterialIcons name="history" size={17} color={colors.primary} /><Text style={styles.draftLinkText}>{t('planner.backToDrafts', { defaultValue: '초안 목록으로' })}</Text><MaterialIcons name="chevron-right" size={18} color={colors.primary} /></TouchableOpacity>}
            </View>
          </View>

          {!!(error || notice) && <View style={[styles.notice, !!error && styles.errorNotice]} accessibilityLiveRegion="polite"><Text style={error ? styles.errorText : styles.noticeText}>{error ? t('planner.storageError', { defaultValue: '변경 내용을 기기에 보관하지 못했어요. 저장 버튼으로 다시 시도해 주세요.' }) : notice}</Text></View>}

          <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: scheduleOpen }} accessibilityLabel={(scheduleOpen ? t('cancel') : t('planner.editSchedule', { defaultValue: '날짜와 시간 설정' })) + (koreanTimeZone ? ' · ' + t('koreanTimeZone') : '')} onPress={scheduleOpen ? cancelSchedule : () => setScheduleOpen(true)} style={styles.scheduleHeader}>
            <View style={styles.flex}>
              <Text style={styles.date}>{trip.date}</Text>
              <Text style={styles.timeRange}>{clockInputValue(trip.startTimeMinutes)} — {clockInputValue(trip.startTimeMinutes + trip.totalAvailableTime)}</Text>
              {koreanTimeZone && <Text style={styles.available}>{t('koreanTimeZone')}</Text>}
              <Text style={styles.available}>{t('planner.available', { defaultValue: '가용 {{duration}}', duration: translatedMinutes(trip.totalAvailableTime) })}</Text>
            </View>
            <View style={styles.scheduleAction}><Text style={styles.actionText}>{scheduleOpen ? t('cancel') : t('planner.timeSettings', { defaultValue: '시간 설정' })}</Text><MaterialIcons name={scheduleOpen ? 'close' : 'expand-more'} size={20} color={colors.primary} /></View>
          </TouchableOpacity>
          {scheduleOpen && <View style={styles.scheduleForm}>
            <Text style={styles.scheduleDraftHint}>{t('planner.scheduleDraftHint', { defaultValue: '시간 설정은 적용을 눌러야 초안에 반영돼요.' })}</Text>
            <Text style={styles.fieldLabel}>{t('planner.dateLabel', { defaultValue: '날짜 · YYYY-MM-DD' })}</Text>
            <TextInput accessibilityLabel={t('planner.dateLabel', { defaultValue: '날짜 · YYYY-MM-DD' })} style={styles.input} value={dateInput} onChangeText={setDateInput} maxLength={10} placeholder="2026-10-26" autoCorrect={false} />
            <View style={styles.fieldRow}>
              <View style={styles.flex}><Text style={styles.fieldLabel}>{t('planner.startTime', { defaultValue: '시작 시각' })}</Text><TextInput accessibilityLabel={t('planner.startTime', { defaultValue: '시작 시각' })} style={styles.input} value={startInput} onChangeText={setStartInput} maxLength={5} placeholder="13:00" /></View>
              <View style={styles.flex}><Text style={styles.fieldLabel}>{t('planner.endTime', { defaultValue: '마감 시각' })}</Text><TextInput accessibilityLabel={t('planner.endTime', { defaultValue: '마감 시각' })} style={styles.input} value={endInput} onChangeText={setEndInput} maxLength={5} placeholder="18:00" /></View>
            </View>
            <Text style={styles.fieldLabel}>{t('planner.bufferLabel', { defaultValue: '이동·대기 여유 (분)' })}</Text>
            <TextInput accessibilityLabel={t('planner.bufferLabel', { defaultValue: '이동·대기 여유 (분)' })} style={styles.input} value={bufferInput} onChangeText={setBufferInput} keyboardType="number-pad" maxLength={3} />
            <Text style={styles.fieldHint}>{t('planner.bufferHint', { defaultValue: '예상 소요 시간에 미리 더해 두는 여유 시간이에요.' })}</Text>
            {!!scheduleError && <Text accessibilityRole="alert" style={styles.errorText}>{scheduleError}</Text>}
            <View style={styles.scheduleButtons}>
              <TouchableOpacity accessibilityRole="button" style={styles.cancelButton} onPress={cancelSchedule}><Text style={styles.cancelText}>{t('cancel')}</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={styles.applyButton} onPress={applySchedule}><Text style={styles.saveText}>{t('planner.apply', { defaultValue: '적용' })}</Text></TouchableOpacity>
            </View>
          </View>}

          {summary && trip.places.length > 0 && <TripSummaryCard summary={summary} />}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('planner.route', { defaultValue: '오늘의 동선' })}</Text>
            {isLoading ? <View style={styles.inline}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.smallText}>{t('planner.calculating', { defaultValue: '경로 확인 중' })}</Text></View> : <Text style={styles.smallText}>{t('planner.placeCount', { defaultValue: '{{count}}곳', count: trip.places.length })}</Text>}
          </View>

          {trip.places.length === 0 && <View style={styles.empty}>
            <View style={styles.emptyMark}><MaterialIcons name="route" size={28} color={colors.primary} /></View>
            <Text style={styles.emptyTitle}>{t('planner.firstPlaceTitle', { defaultValue: '첫 번째 장소부터 시작해요' })}</Text>
            <Text style={styles.emptyText}>{t('planner.firstPlaceBody', { defaultValue: '출발 장소를 먼저 추가하세요. 체류 시간과 이동 시간을 더해 마감 전에 돌아올 수 있는지 확인해요.' })}</Text>
          </View>}

          {trip.places.map((place, index) => {
            const entry = timeline[index];
            return <View key={place.id}>
              <PlaceCard place={place} index={index} arrivalMinutes={entry?.arrivalTimeMinutes ?? null} departureMinutes={entry?.departureTimeMinutes ?? null}
                onRemove={() => store.removePlace(place.id)} onUpdateName={name => store.updatePlace(place.id, { name })}
                onChangeDuration={minutes => store.setStayDuration(place.id, minutes)}
                onMoveUp={index > 0 ? () => store.reorderPlaces(index, index - 1) : undefined}
                onMoveDown={index < trip.places.length - 1 ? () => store.reorderPlaces(index, index + 1) : undefined} />
              {entry?.leg && <TravelBadge leg={entry.leg} onPress={() => setLegId(entry.leg!.id)} onRetry={() => void store.retryLeg(entry.leg!.id)} />}
            </View>;
          })}

          <View style={styles.searchSection}>
            <Text style={styles.sectionTitle}>{t('planner.addPlace', { defaultValue: '장소 추가' })}</Text>
            <PlaceSearchInput key={trip.id} onPlaceSelected={place => {
              store.addPlace({ ...place, id: `place-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, stayDuration: DEFAULT_STAY_DURATION });
              setNotice('');
              Keyboard.dismiss();
            }} />
            <Text style={styles.fieldHint}>{t('planner.routeHint', { defaultValue: '돌아올 장소도 마지막에 추가해 주세요. 이동 구간을 누르면 교통수단과 시간을 바꿀 수 있어요.' })}</Text>
          </View>

          {trip.places.length > 0 && <View style={styles.finishSection}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('planner.finishTrip')} accessibilityState={{ disabled: isSaving, busy: isSaving }} disabled={isSaving} style={[styles.finishButton, isSaving && styles.disabled]} onPress={finish}>
              {isSaving ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <MaterialIcons name="check-circle" size={20} color={colors.onPrimary} />}
              <Text style={styles.finishText}>{t('planner.finishTrip')}</Text>
            </TouchableOpacity>
            <Text style={styles.fieldHint}>{t('planner.finishHint')}</Text>
          </View>}
        </ScrollView>
      </KeyboardAvoidingView>

      <TransportModePicker visible={!!selectedLeg} selectedMode={selectedLeg?.mode ?? trip.transportMode} destinationName={selectedDestination?.name}
        origin={selectedOrigin} destination={selectedDestination} reason={selectedLeg?.source === 'manual' ? undefined : selectedLeg?.reason}
        travelTime={selectedLegExpired ? null : selectedLeg?.duration} travelSource={selectedLeg?.source} travelLeg={selectedLeg} onSelect={mode => { if (selectedLeg) store.setLegMode(selectedLeg.id, mode); }}
        onManualDuration={minutes => { if (selectedLeg) store.setManualTravelTime(selectedLeg.id, minutes); }}
        onRetry={() => { if (selectedLeg) void store.retryLeg(selectedLeg.id); }} onClose={() => setLegId(null)} />
      <TripNameDialog visible={nameOpen} initialName={trip.name} onSave={name => { store.setTripName(name); setNameOpen(false); }} onCancel={() => setNameOpen(false)} />
      {shareTrip && <TripShareSheet trip={shareTrip} onClose={() => setShareTrip(null)} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { borderBottomWidth: 1, borderBottomColor: colors.border },
  headerContent: { width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  headerLabel: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '500', color: colors.text },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  saveButton: { minHeight: 44, minWidth: 52, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  saveButtonText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  createCardButton: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: colors.primary, flexShrink: 1 },
  createCardText: { fontSize: 14, fontWeight: '600', color: colors.onPrimary, flexShrink: 1 },
  saveText: { fontSize: 15, fontWeight: '600', color: colors.onPrimary },
  disabled: { opacity: 0.45 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', marginBottom: 20 },
  eyebrow: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  nameButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flexShrink: 1, fontSize: 27, lineHeight: 35, fontWeight: '700', letterSpacing: -0.8, color: colors.text },
  saveState: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  draftLink: { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  draftLinkText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  notice: { backgroundColor: colors.successSoft, padding: 12, borderRadius: 12, marginBottom: 16 },
  noticeText: { color: colors.success, lineHeight: 20, fontSize: 13 },
  errorNotice: { backgroundColor: colors.dangerSoft },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 21, marginTop: 4 },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 16 },
  date: { color: colors.textSecondary, fontSize: 12, marginBottom: 5 },
  timeRange: { color: colors.text, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  available: { fontSize: 12, color: colors.textSecondary, marginTop: 5 },
  scheduleAction: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginLeft: 10 },
  actionText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  scheduleForm: { padding: 16, borderRadius: 16, backgroundColor: colors.surfaceMuted, marginBottom: 20 },
  scheduleDraftHint: { color: colors.textSecondary, fontSize: 12, lineHeight: 19, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, color: colors.text, fontSize: 16, marginBottom: 12 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHint: { color: colors.textSecondary, fontSize: 12, lineHeight: 19, marginTop: 8 },
  scheduleButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButton: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12 },
  cancelText: { color: colors.textSecondary, fontSize: 15, fontWeight: '500' },
  applyButton: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 26, marginBottom: 20 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallText: { fontSize: 12, color: colors.textSecondary },
  empty: { paddingVertical: 20, alignItems: 'center' },
  emptyMark: { width: 56, height: 56, backgroundColor: colors.primarySoft, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 10 },
  emptyText: { fontSize: 14, lineHeight: 23, color: colors.textSecondary, textAlign: 'center' },
  finishSection: { marginTop: 28, gap: 4 },
  finishButton: { minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  finishText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  searchSection: { marginTop: 26, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
});
