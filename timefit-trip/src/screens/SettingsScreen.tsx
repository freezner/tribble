import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../stores/tripStore';
import { useLanguage, SupportedLanguage } from '../hooks/useLanguage';
import { colors } from '../constants/theme';
import appConfig from '../../app.json';
import { SocialProfilesSection } from '../components/SocialProfilesSection';
import { CardPreferencesSection } from '../components/CardPreferencesSection';

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { savedTrips, drafts, clearAllTrips } = useTripStore();
  const { currentLanguage, changeLanguage, getLanguageName } = useLanguage();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failed, setFailed] = useState(false);
  const count = new Set([...savedTrips, ...drafts].map(trip => trip.id)).size;

  const clear = () => Alert.alert(t('deleteAllTrips'), t('planner.clearConfirm', { defaultValue: '이 기기의 저장된 여행과 초안 {{count}}개를 모두 삭제합니다. 이 작업은 되돌릴 수 없습니다.', count }), [
    { text: t('cancel'), style: 'cancel' },
    { text: t('delete'), style: 'destructive', onPress: async () => {
      setBusy(true);
      try { await clearAllTrips(); setFailed(false); setNotice(t('allTripsDeleted')); }
      catch { setFailed(true); setNotice(t('planner.deleteFailed', { defaultValue: '삭제하지 못했어요. 다시 시도해 주세요.' })); }
      finally { setBusy(false); }
    } },
  ]);

  const selectLanguage = async (language: SupportedLanguage) => {
    try { await changeLanguage(language); setLanguageOpen(false); }
    catch { setFailed(true); setNotice(t('planner.languageFailed', { defaultValue: '언어 설정을 저장하지 못했어요. 다시 시도해 주세요.' })); }
  };

  const openPrivacyPolicy = async () => {
    try { await Linking.openURL('https://github.com/freezner/tribble/blob/main/timefit-trip/privacy.md'); }
    catch { Alert.alert(t('error'), t('planner.linkOpenFailed')); }
  };

  return <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t('settings')}</Text>
      <View style={styles.about}><Text style={styles.brand}>tribble</Text><Text style={styles.description}>{t('planner.settingsDescription', { defaultValue: '가고 싶은 곳을, 내 시간 안에.' })}</Text><Text style={styles.version}>{t('appVersion')} {appConfig.expo.version}</Text></View>
      {!!notice && <Text accessibilityLiveRegion="polite" style={[styles.notice, failed && styles.error]}>{notice}</Text>}
      <Text style={styles.sectionLabel}>{t('language')}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => setLanguageOpen(true)} style={styles.row}><View style={styles.flex}><Text style={styles.rowTitle}>{t('selectLanguage')}</Text><Text style={styles.rowDetail}>{getLanguageName(currentLanguage)}</Text></View><MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} /></TouchableOpacity>
      <CardPreferencesSection />
      <SocialProfilesSection />
      <Text style={styles.sectionLabel}>{t('planner.deviceStorage', { defaultValue: '이 기기의 여행' })}</Text>
      <View style={styles.row}><View style={styles.flex}><Text style={styles.rowTitle}>{t('planner.savedAndDrafts', { defaultValue: '저장된 여행과 초안' })}</Text><Text style={styles.rowDetail}>{t('planner.storageDetail', { defaultValue: '새 여행을 시작해도 이전 초안은 남아 있어요.' })}</Text></View><Text style={styles.count}>{count}</Text></View>
      <Text style={styles.explanation}>{t('planner.localStorageDetail', { defaultValue: '여행은 이 기기에 저장됩니다. 앱을 삭제하면 여행도 사라질 수 있으니 필요한 일정은 이미지로 공유해 보관해 주세요.' })}</Text>
      <TouchableOpacity accessibilityRole="button" disabled={busy || count === 0} onPress={clear} style={[styles.delete, (busy || count === 0) && styles.disabled]}>{busy ? <ActivityIndicator color={colors.danger} /> : <MaterialIcons name="delete-outline" size={21} color={colors.danger} />}<Text style={styles.deleteText}>{t('deleteAllTrips')}</Text></TouchableOpacity>
      <Text style={styles.sectionLabel}>{t('planner.aboutEstimates', { defaultValue: '이동 시간 안내' })}</Text>
      <Text style={styles.explanation}>{t('planner.estimateExplanation', { defaultValue: '경로 조회 결과, 직선 거리 추정, 직접 입력 시간을 구분해 보여줍니다. 추정에는 실제 도로·환승·주차 상황이 반영되지 않을 수 있어요. 조회되지 않은 구간은 시간을 직접 입력해야 전체 일정을 계산할 수 있습니다.' })}</Text>
      <TouchableOpacity accessibilityRole="link" onPress={() => void openPrivacyPolicy()} style={[styles.row, styles.privacyLink]}><Text style={[styles.rowTitle, styles.flex]}>{t('planner.privacyPolicy')}</Text><MaterialIcons name="open-in-new" size={20} color={colors.textSecondary} /></TouchableOpacity>
    </ScrollView>
    <Modal visible={languageOpen} transparent animationType="fade" onRequestClose={() => setLanguageOpen(false)}>
      <View style={styles.overlay}><SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{t('selectLanguage')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} onPress={() => setLanguageOpen(false)} style={styles.close}><MaterialIcons name="close" size={23} color={colors.text} /></TouchableOpacity></View>
        {(['ko', 'en', 'ja', 'zh'] as SupportedLanguage[]).map(language => <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: currentLanguage === language }} key={language} onPress={() => void selectLanguage(language)} style={styles.languageRow}><Text style={styles.rowTitle}>{getLanguageName(language)}</Text>{currentLanguage === language && <MaterialIcons name="check" size={22} color={colors.primary} />}</TouchableOpacity>)}
      </SafeAreaView></View>
    </Modal>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 22, paddingBottom: 40 },
  flex: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginVertical: 12, letterSpacing: -0.8 },
  about: { paddingVertical: 28, borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { color: colors.primary, fontSize: 29, fontWeight: '700', letterSpacing: -1.2 },
  description: { color: colors.text, fontSize: 16, marginTop: 10 },
  version: { color: colors.textSecondary, fontSize: 12, marginTop: 8 },
  sectionLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 30, marginBottom: 10 },
  row: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTitle: { fontSize: 16, color: colors.text, fontWeight: '500' },
  rowDetail: { fontSize: 13, color: colors.textSecondary, lineHeight: 21, marginTop: 6 },
  privacyLink: { marginTop: 20, minHeight: 48 },
  count: { fontSize: 22, fontWeight: '600', color: colors.text },
  explanation: { fontSize: 13, lineHeight: 23, color: colors.textSecondary, marginTop: 12 },
  delete: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginTop: 16 },
  deleteText: { fontSize: 14, color: colors.danger, fontWeight: '500' },
  disabled: { opacity: 0.4 },
  notice: { marginTop: 16, color: colors.success, fontSize: 13, lineHeight: 22 },
  error: { color: colors.danger },
  overlay: { flex: 1, backgroundColor: 'rgba(31,28,24,0.4)', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingBottom: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sheetTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  close: { height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  languageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 58, borderTopWidth: 1, borderTopColor: colors.border },
});
