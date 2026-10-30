import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../constants/theme';
import { Trip } from '../types';
import { useSocialStore } from '../stores/socialStore';
import { useCardPreferencesStore } from '../stores/cardPreferencesStore';
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_NAMES, SocialPlatform } from '../utils/socialProfiles';
import { getTripSharePageCount, SHARE_CARD_DIMENSIONS, TripShareFormat } from '../utils/tripShareLayout';
import { SOCIAL_SHARE_FORMATS, SOCIAL_SHARE_PRESET_DETAILS, SOCIAL_POST_IMAGE_LIMITS } from '../utils/socialSharePresets';
import { shareTripAsImages } from '../utils/shareTrip';
import { TripShareCard } from './TripShareCard';

interface Props { trip: Trip; onClose: () => void; }

export const TripShareSheet: React.FC<Props> = ({ trip, onClose }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { profiles, error: profilesError, initialize } = useSocialStore();
  const { title, initialized: titleInitialized, error: titleError, initialize: initializeTitle } = useCardPreferencesStore();
  const [destination, setDestination] = useState<SocialPlatform>('instagram');
  const [format, setFormat] = useState<TripShareFormat>('instagram-feed');
  const [pageIndex, setPageIndex] = useState(0);
  const [platform, setPlatform] = useState<SocialPlatform | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [renderedKey, setRenderedKey] = useState('');
  const [captureGeneration, setCaptureGeneration] = useState(0);
  const sharing = useRef(false);
  useEffect(() => { void initialize().catch(() => {}); }, [initialize]);
  useEffect(() => { void initializeTitle().catch(() => {}); }, [initializeTitle]);
  const profile = platform ? profiles[platform] : undefined;
  const dimensions = SHARE_CARD_DIMENSIONS[format];
  const formats = SOCIAL_SHARE_FORMATS[destination];
  const imageLimit = SOCIAL_POST_IMAGE_LIMITS[destination];
  const scale = Math.min(1, Math.max(0.1, (width - 44) / dimensions.width));
  const pageCount = getTripSharePageCount(trip, format);
  const key = `${captureGeneration}:${format}:${pageIndex}:${profile?.platform ?? ''}:${profile?.handle ?? ''}:${title}`;
  const activeCaptureKey = useRef(key);
  activeCaptureKey.current = key;
  const batch = useRef<{ key: string; views: React.RefObject<View | null>[]; ready: Set<number> } | null>(null);
  if (batch.current?.key !== key) {
    batch.current = { key, views: Array.from({ length: pageCount }, () => ({ current: null })), ready: new Set() };
  }
  const captureBatch = batch.current;
  const canShare = titleInitialized && renderedKey === key;
  const cardProps = { trip, format, pageIndex, profile, title };
  // A late layout event from a previous selection must not enable a new capture.
  const changeSelection = (change: () => void) => {
    setCaptureGeneration(generation => generation + 1);
    change();
  };

  const share = async () => {
    if (sharing.current || !canShare) return;
    sharing.current = true; setBusy(true); setError('');
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const result = await shareTripAsImages(captureBatch.views, trip.name, format);
      if (result === 'unavailable') setError(t('shareNotAvailable'));
    } catch { setError(t('shareError')); }
    finally { sharing.current = false; setBusy(false); }
  };

  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => { if (!sharing.current) onClose(); }}>
    <SafeAreaProvider><SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}><Text style={styles.title}>{t('social.shareCard')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} disabled={busy} style={styles.icon} onPress={onClose}><MaterialIcons name="close" size={24} color={colors.text} /></TouchableOpacity></View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.destinationLabel}>{t('social.shareDestination')}</Text>
        <View style={styles.destinations}>{SOCIAL_PLATFORMS.map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityLabel={SOCIAL_PLATFORM_NAMES[value]} accessibilityState={{ selected: destination === value }} disabled={busy} onPress={() => changeSelection(() => {
          setDestination(value); setFormat(SOCIAL_SHARE_FORMATS[value][0]); setPageIndex(0);
        })} style={[styles.destination, destination === value && styles.selected]}><Text style={[styles.formatText, destination === value && styles.selectedText]}>{SOCIAL_PLATFORM_NAMES[value]}</Text></TouchableOpacity>)}</View>
        {formats.length > 1 && <View style={styles.formats}>{formats.map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: format === value }} disabled={busy} onPress={() => changeSelection(() => { setFormat(value); setPageIndex(0); })} style={[styles.format, format === value && styles.selected]}><MaterialIcons name={value.endsWith('story') ? 'smartphone' : 'crop-portrait'} size={20} color={format === value ? colors.primary : colors.textSecondary} /><Text style={[styles.formatText, format === value && styles.selectedText]}>{t(SOCIAL_SHARE_PRESET_DETAILS[value]!.label)}</Text></TouchableOpacity>)}</View>}
        <Text style={styles.destinationHint}>{t('social.destinationHint')}</Text>
        <View style={[styles.preview, { width: dimensions.width * scale, height: dimensions.height * scale }]}>
          <View style={{ width: dimensions.width, height: dimensions.height, transform: [{ scale }], transformOrigin: 'top left' }}><TripShareCard {...cardProps} /></View>
        </View>
        {pageCount > 1 && <><View style={styles.pages}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('social.previousCard')} disabled={busy || pageIndex === 0} style={[styles.icon, pageIndex === 0 && styles.disabled]} onPress={() => changeSelection(() => setPageIndex(index => index - 1))}><MaterialIcons name="chevron-left" size={26} color={colors.text} /></TouchableOpacity>
          <Text style={styles.pageCount}>{t('social.page', { current: pageIndex + 1, total: pageCount })}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('social.nextCard')} disabled={busy || pageIndex === pageCount - 1} style={[styles.icon, pageIndex === pageCount - 1 && styles.disabled]} onPress={() => changeSelection(() => setPageIndex(index => index + 1))}><MaterialIcons name="chevron-right" size={26} color={colors.text} /></TouchableOpacity>
        </View><Text style={styles.hint}>{t('social.multipleCards')}</Text></>}
        {imageLimit !== undefined && pageCount > imageLimit && <Text accessibilityRole="alert" style={styles.hint}>{t('social.postImageLimit', { platform: SOCIAL_PLATFORM_NAMES[destination], limit: imageLimit, count: pageCount })}</Text>}
        <Text style={styles.label}>{t('social.cardProfile')}</Text>
        <View style={styles.profiles}>
          <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: !platform }} disabled={busy} style={[styles.chip, !platform && styles.selected]} onPress={() => changeSelection(() => setPlatform(null))}><Text style={styles.chipText}>{t('social.noProfile')}</Text></TouchableOpacity>
          {SOCIAL_PLATFORMS.filter(value => profiles[value]).map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ selected: platform === value }} disabled={busy} style={[styles.chip, platform === value && styles.selected]} onPress={() => changeSelection(() => setPlatform(value))}><Text style={styles.chipText}>{SOCIAL_PLATFORM_NAMES[value]} · @{profiles[value]!.handle}</Text></TouchableOpacity>)}
        </View>
        {!SOCIAL_PLATFORMS.some(value => profiles[value]) && <Text style={styles.hint}>{t('social.addInSettings')}</Text>}
        {!!profilesError && <Text accessibilityRole="alert" style={styles.error}>{t('social.loadFailed')}</Text>}
        {!titleInitialized && !!titleError && <><Text accessibilityRole="alert" style={styles.error}>{t('social.cardTitleLoadFailed')}</Text><TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void initializeTitle().catch(() => {})} style={styles.chip}><Text style={styles.chipText}>{t('planner.retry')}</Text></TouchableOpacity></>}
        <Text style={styles.hint}>{t('social.shareHint')}</Text>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.actions}><TouchableOpacity accessibilityRole="button" disabled={busy || !canShare} style={[styles.share, (busy || !canShare) && styles.disabled]} onPress={() => void share()}>{busy ? <ActivityIndicator color={colors.onPrimary} /> : <MaterialIcons name="ios-share" size={21} color={colors.onPrimary} />}<Text style={styles.shareText}>{t(busy ? 'social.preparing' : 'social.shareAllCards', { count: pageCount })}</Text></TouchableOpacity></View>
      <View style={styles.hidden} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{captureBatch.views.map((ref, index) => <View key={`${key}:${index}`} ref={ref} collapsable={false} onLayout={() => {
        if (activeCaptureKey.current !== key) return;
        captureBatch.ready.add(index);
        if (captureBatch.ready.size === pageCount) setRenderedKey(key);
      }} style={{ width: dimensions.width, height: dimensions.height }}><TripShareCard {...cardProps} pageIndex={index} /></View>)}</View>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { width: '100%', maxWidth: 600, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, minHeight: 62 },
  title: { color: colors.text, fontSize: 21, fontWeight: '600', flex: 1 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 22, paddingBottom: 24 },
  destinationLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 10 },
  destinations: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  destination: { flexGrow: 1, minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  formats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  format: { flex: 1, minHeight: 46, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  formatText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  selectedText: { color: colors.primary },
  destinationHint: { color: colors.textSecondary, fontSize: 12, lineHeight: 19, marginBottom: 16 },
  preview: { alignSelf: 'center', overflow: 'hidden', borderRadius: 16, backgroundColor: colors.surface },
  pages: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 },
  pageCount: { color: colors.text, fontSize: 13, fontVariant: ['tabular-nums'] },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 22, marginBottom: 10 },
  profiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, maxWidth: '100%', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.text, fontSize: 12, lineHeight: 18 },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 20, marginTop: 12 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 21, marginTop: 12 },
  actions: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 12 },
  share: { minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  shareText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  hidden: { position: 'absolute', left: -10000, top: 0 },
});
