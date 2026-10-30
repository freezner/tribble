import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, KeyboardAvoidingView, Linking, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Place, TransportMode, TravelLeg, TravelSource } from '../types';
import { formatMinutes, isTmapResultExpired } from '../utils/timeCalculator';
import { colors, radii, typography } from '../constants/theme';
import { getExternalRouteLink } from '../utils/externalMaps';

interface Props {
  visible: boolean;
  selectedMode: TransportMode;
  onSelect: (mode: TransportMode) => void;
  onClose: () => void;
  destinationName?: string;
  origin?: Place;
  destination?: Place;
  reason?: string;
  travelTime?: number | null;
  travelSource?: TravelSource;
  travelLeg?: TravelLeg;
  onManualDuration?: (minutes: number) => void;
  onRetry?: () => void;
}

const modes: { value: TransportMode; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { value: 'driving', icon: 'directions-car' }, { value: 'walking', icon: 'directions-walk' },
  { value: 'transit', icon: 'directions-transit' }, { value: 'bicycling', icon: 'directions-bike' },
];

export const TransportModePicker: React.FC<Props> = ({ visible, selectedMode, onSelect, onClose, destinationName, origin, destination, reason, travelTime, travelSource, travelLeg, onManualDuration, onRetry }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [manual, setManual] = useState('');
  const [error, setError] = useState(false);
  const manualEdited = useRef(false);
  const [mapError, setMapError] = useState(false);
  const [openingMap, setOpeningMap] = useState(false);
  const source = travelLeg ? travelLeg.source : travelSource;
  // A TMAP value without its timestamp cannot establish that it is still usable.
  const expired = source === 'tmap' && (!travelLeg || isTmapResultExpired(travelLeg));
  const resultTime = expired || (travelLeg && travelLeg.status !== 'ready' && travelLeg.status !== 'estimated') ? null : travelLeg ? travelLeg.duration : travelTime;
  const resultReason = travelLeg ? source === 'manual' ? undefined : travelLeg.reason : reason;
  const manualValue = !manualEdited.current && resultTime == null ? '' : manual;
  const externalRoute = origin && destination ? getExternalRouteLink(origin, destination, selectedMode) : null;
  const [manualExpanded, setManualExpanded] = useState(false);
  useEffect(() => {
    manualEdited.current = false;
    setManualExpanded(false);
    setError(false);
  }, [visible, travelLeg?.id, origin?.id, destination?.id]);
  useEffect(() => {
    // A route response may arrive while typing or while an external map is open.
    if (visible && !manualEdited.current) setManual(resultTime == null ? '' : String(Math.round(resultTime)));
  }, [visible, resultTime, travelLeg?.id, origin?.id, destination?.id]);
  useEffect(() => { setMapError(false); }, [visible, origin?.id, destination?.id, selectedMode]);
  const applyManual = () => {
    const trimmed = manualValue.trim();
    const minutes = Number(trimmed);
    if (!/^\d+$/.test(trimmed) || minutes < 1 || minutes > 1440) { setError(true); return; }
    onManualDuration?.(minutes);
    onClose();
  };
  const openMap = async () => {
    if (!externalRoute || openingMap) return;
    setMapError(false);
    setOpeningMap(true);
    try { await Linking.openURL(externalRoute.url); }
    catch { setMapError(true); }
    finally { setOpeningMap(false); }
  };
  const modeChoices = (
    <View style={styles.modes}>
      {modes.map((mode) => {
        const selected = selectedMode === mode.value;
        return (
          <Pressable key={mode.value} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={t(mode.value)}
            onPress={() => { onSelect(mode.value); onClose(); }} style={[styles.mode, selected && styles.selectedMode]}>
            <MaterialIcons name={mode.icon} size={24} color={selected ? colors.primary : colors.textSecondary} />
            <Text style={[styles.modeLabel, selected && styles.selectedLabel]}>{t(mode.value)}</Text>
            {selected && <MaterialIcons name="check" size={18} color={colors.primary} />}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('close', { defaultValue: '닫기' })} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={styles.title}>{t('transportMode')}</Text>
              {!!destinationName && <Text style={styles.subtitle}>{origin ? `${origin.name} → ${destinationName}` : destinationName}</Text>}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('close', { defaultValue: '닫기' })} onPress={onClose} style={styles.close}><MaterialIcons name="close" size={22} color={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            {resultTime != null && <View style={styles.result}>
              <Text style={styles.resultLabel}>{source === 'manual' ? t('manualTravelTime') : t('autoTravelTime')}</Text>
              <Text style={styles.resultTime}>{formatMinutes(resultTime, { hours: t('hours'), minutes: t('minutes') })}</Text>
              {source === 'tmap' && <Text style={styles.manualHint}>{t('tmapAttribution')}</Text>}
              {source === 'kakao' && <Text style={styles.manualHint}>{t('kakaoAttribution')}</Text>}
            </View>}
            {(expired || travelLeg?.status === 'pending' || (!!resultReason && resultReason !== 'manual')) && <View style={styles.reasonNotice}><Text style={styles.reasonText}>{expired ? t('routeUnavailable') : travelLeg?.status === 'pending' ? t('routePending') : t('routeReason.' + resultReason, { defaultValue: t('routeUnavailable') })}</Text></View>}
            {modeChoices}
            {onRetry && <Pressable accessibilityRole="button" onPress={() => { onRetry(); onClose(); }} style={styles.retry}><MaterialIcons name="refresh" size={18} color={colors.primary} /><Text style={styles.retryText}>{t('recalculateAutomatically')}</Text></Pressable>}
            {onManualDuration && <Pressable accessibilityRole="button" accessibilityState={{ expanded: manualExpanded }} onPress={() => setManualExpanded(!manualExpanded)} style={styles.manualToggle}>
              <Text style={styles.manualTitle}>{t('adjustTravelTime')}</Text><MaterialIcons name={manualExpanded ? 'expand-less' : 'expand-more'} size={20} color={colors.textSecondary} />
            </Pressable>}
            {onManualDuration && manualExpanded && (
              <View style={styles.manualSection}>
                <Text style={styles.manualTitle}>{t('manualTravelTime', { defaultValue: '이동 시간 직접 입력' })}</Text>
                <Text style={styles.manualHint}>{t('manualDurationHint', { defaultValue: '지도에서 시간을 확인한 뒤 이 앱으로 돌아와 분 단위로 입력하세요' })}</Text>
                {externalRoute && <>
                  <Pressable accessibilityRole="button" accessibilityState={{ disabled: openingMap }} disabled={openingMap} onPress={() => void openMap()} style={[styles.mapButton, openingMap && styles.disabled]}>
                    <MaterialIcons name="open-in-new" size={18} color={colors.primary} />
                    <Text style={styles.mapButtonText}>{externalRoute.provider === 'kakao' ? t('openKakaoRoute', { defaultValue: '카카오맵에서 시간 확인' }) : t('openGoogleRoute', { defaultValue: 'Google 지도에서 시간 확인' })}</Text>
                  </Pressable>
                  <Text style={styles.manualHint}>{t('mapDepartureHint', { defaultValue: '지도의 교통수단과 출발 시각도 이 일정에 맞춰 확인해 주세요.' })}</Text>
                </>}
                {(mapError || (!!origin && !!destination && !externalRoute)) && <Text style={styles.error} accessibilityRole="alert">{t('mapOpenFailed', { defaultValue: '지도를 열지 못했어요. 지도 앱에서 출발지와 도착지를 직접 검색해 주세요.' })}</Text>}
                <View style={styles.inputRow}>
                  <View style={[styles.inputWrap, error && styles.invalidInput]}>
                    <TextInput accessibilityLabel={t('manualTravelTime', { defaultValue: '이동 시간 직접 입력' })} keyboardType="number-pad"
                      value={manualValue} onChangeText={(value) => { manualEdited.current = true; setManual(value); setError(false); }} maxLength={4}
                      style={styles.input} placeholder="20" placeholderTextColor={colors.textSecondary} returnKeyType="done" onSubmitEditing={applyManual} />
                    <Text style={styles.unit}>{t('minutes')}</Text>
                  </View>
                  <Pressable accessibilityRole="button" onPress={applyManual} style={styles.apply}><Text style={styles.applyText}>{t('apply', { defaultValue: '적용' })}</Text></Pressable>
                </View>
                {error && <Text style={styles.error} accessibilityRole="alert">{t('invalidTravelDuration', { defaultValue: '1~1440 사이의 분을 입력해 주세요' })}</Text>}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '90%', alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  handle: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 15 },
  heading: { flex: 1 },
  title: { ...typography.heading, color: colors.text },
  subtitle: { ...typography.label, color: colors.textSecondary, marginTop: 4 },
  close: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: -10 },
  scroll: { paddingHorizontal: 24, paddingBottom: 8 },
  modes: { gap: 8 },
  result: { marginBottom: 16, padding: 16, backgroundColor: colors.primarySoft, borderRadius: radii.md },
  resultLabel: { ...typography.label, color: colors.textSecondary },
  resultTime: { ...typography.heading, color: colors.text, marginTop: 4 },
  reasonNotice: { borderRadius: radii.md, backgroundColor: colors.surfaceMuted, padding: 14, marginBottom: 16 },
  reasonText: { ...typography.label, color: colors.textSecondary, lineHeight: 22 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
  selectedMode: { backgroundColor: colors.primarySoft },
  modeLabel: { ...typography.body, color: colors.text, flex: 1 },
  selectedLabel: { color: colors.primary, fontWeight: '600' },
  manualToggle: { minHeight: 48, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  manualSection: { paddingTop: 8 },
  manualTitle: { ...typography.label, color: colors.text, fontWeight: '600' },
  manualHint: { ...typography.caption, color: colors.textSecondary, marginTop: 5 },
  mapButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radii.md, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 12, marginTop: 12 },
  mapButtonText: { ...typography.label, color: colors.primary, fontWeight: '600', flexShrink: 1 },
  disabled: { opacity: 0.55 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background },
  input: { flex: 1, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, ...typography.body, color: colors.text, fontVariant: ['tabular-nums'] },
  unit: { ...typography.label, color: colors.textSecondary, paddingRight: 14 },
  apply: { minHeight: 48, minWidth: 72, backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  applyText: { ...typography.label, color: colors.onPrimary, fontWeight: '600' },
  invalidInput: { borderColor: colors.danger },
  error: { ...typography.caption, color: colors.danger, marginTop: 8 },
  retry: { minHeight: 48, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  retryText: { ...typography.label, color: colors.primary },
});
