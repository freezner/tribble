import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../constants/theme';
import { useSocialStore } from '../stores/socialStore';
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_NAMES, SocialPlatform } from '../utils/socialProfiles';

export const SocialProfilesSection: React.FC = () => {
  const { t } = useTranslation();
  const { profiles, initialized, isSaving, error, initialize, saveProfile, removeProfile, clearError } = useSocialStore();
  const [editing, setEditing] = useState<SocialPlatform | null>(null);
  const [input, setInput] = useState('');
  const [formError, setFormError] = useState('');
  useEffect(() => { void initialize().catch(() => {}); }, [initialize]);

  const edit = (platform: SocialPlatform) => {
    setInput(profiles[platform]?.handle ?? ''); setFormError(''); clearError(); setEditing(platform);
  };
  const save = async () => {
    if (!editing || isSaving) return;
    try { await saveProfile(editing, input); setEditing(null); }
    catch (failure) { setFormError(t(failure instanceof Error && failure.message === 'invalid-social-profile' ? 'social.invalidProfile' : 'social.saveFailed')); }
  };
  const remove = async () => {
    if (!editing || isSaving) return;
    try { await removeProfile(editing); setEditing(null); }
    catch { setFormError(t('social.saveFailed')); }
  };
  const open = async (platform: SocialPlatform) => {
    const profile = profiles[platform];
    if (!profile) return;
    try { await Linking.openURL(profile.url); }
    catch { Alert.alert(t('error'), t('planner.linkOpenFailed')); }
  };

  return <View>
    <Text style={styles.heading}>{t('social.profiles')}</Text>
    <Text style={styles.hint}>{t('social.profilesHint')}</Text>
    {!initialized && !error && <ActivityIndicator style={styles.loading} color={colors.primary} />}
    {!!error && !editing && <View style={styles.errorBox}><Text style={styles.error}>{t(initialized ? 'social.saveFailed' : 'social.loadFailed')}</Text>{!initialized && <TouchableOpacity accessibilityRole="button" onPress={() => void initialize().catch(() => {})} style={styles.retry}><Text style={styles.link}>{t('planner.retry')}</Text></TouchableOpacity>}</View>}
    {SOCIAL_PLATFORMS.map(platform => <View key={platform} style={styles.row}>
      <View style={styles.mark}><Text style={styles.initial}>{SOCIAL_PLATFORM_NAMES[platform].slice(0, 1)}</Text></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('social.editProfile', { platform: SOCIAL_PLATFORM_NAMES[platform] })} disabled={!initialized || isSaving} onPress={() => edit(platform)} style={styles.main}>
        <Text style={styles.name}>{SOCIAL_PLATFORM_NAMES[platform]}</Text>
        <Text numberOfLines={1} style={styles.detail}>{profiles[platform] ? `@${profiles[platform]!.handle}` : t('social.addProfile')}</Text>
      </TouchableOpacity>
      {profiles[platform] && <TouchableOpacity accessibilityRole="link" accessibilityLabel={t('social.openProfile', { platform: SOCIAL_PLATFORM_NAMES[platform] })} style={styles.icon} onPress={() => void open(platform)}><MaterialIcons name="open-in-new" size={19} color={colors.textSecondary} /></TouchableOpacity>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('social.editProfile', { platform: SOCIAL_PLATFORM_NAMES[platform] })} disabled={!initialized || isSaving} style={styles.icon} onPress={() => edit(platform)}><MaterialIcons name={profiles[platform] ? 'edit' : 'add'} size={20} color={colors.primary} /></TouchableOpacity>
    </View>)}
    <Text style={styles.local}>{t('social.localProfiles')}</Text>
    <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => { if (!isSaving) setEditing(null); }}>
      <SafeAreaProvider><KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}><ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.header}><Text style={styles.title}>{editing ? t('social.editProfile', { platform: SOCIAL_PLATFORM_NAMES[editing] }) : ''}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} disabled={isSaving} style={styles.icon} onPress={() => setEditing(null)}><MaterialIcons name="close" size={23} color={colors.text} /></TouchableOpacity></View>
          <Text style={styles.label}>{t('social.profileInput')}</Text>
          <TextInput accessibilityLabel={t('social.profileInput')} value={input} onChangeText={value => { setInput(value); setFormError(''); }} style={styles.input} placeholder={editing === 'tiktok' ? '@my_trip' : '@mytrip'} autoCapitalize="none" autoCorrect={false} maxLength={300} editable={!isSaving} textContentType="username" onSubmitEditing={() => void save()} returnKeyType="done" />
          <Text style={styles.hint}>{t('social.profileInputHint')}</Text>
          {!!formError && <Text accessibilityRole="alert" style={styles.error}>{formError}</Text>}
          <TouchableOpacity accessibilityRole="button" disabled={isSaving || !input.trim()} style={[styles.save, (isSaving || !input.trim()) && styles.disabled]} onPress={() => void save()}>{isSaving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.saveText}>{t('save')}</Text>}</TouchableOpacity>
          {editing && profiles[editing] && <TouchableOpacity accessibilityRole="button" disabled={isSaving} style={styles.remove} onPress={() => void remove()}><Text style={styles.removeText}>{t('social.removeProfile')}</Text></TouchableOpacity>}
        </ScrollView></SafeAreaView>
      </KeyboardAvoidingView></SafeAreaProvider>
    </Modal>
  </View>;
};

const styles = StyleSheet.create({
  heading: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 30, marginBottom: 10 },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, marginBottom: 10 },
  local: { color: colors.textSecondary, fontSize: 12, lineHeight: 19, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
  mark: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
  initial: { fontWeight: '700', fontSize: 17, color: colors.text },
  main: { flex: 1, minHeight: 48, justifyContent: 'center' },
  name: { color: colors.text, fontSize: 15, fontWeight: '600' },
  detail: { color: colors.textSecondary, fontSize: 12, marginTop: 5 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  loading: { marginVertical: 12 },
  errorBox: { backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 12 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 21, marginVertical: 8 },
  retry: { minHeight: 44, justifyContent: 'center' },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, width: '100%', maxWidth: 560, maxHeight: '90%', alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  title: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '600' },
  label: { color: colors.text, fontSize: 14, marginBottom: 9 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 16, padding: 14, borderRadius: 12, marginBottom: 10, minHeight: 50 },
  save: { minHeight: 50, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginTop: 14 },
  saveText: { color: colors.onPrimary, fontWeight: '600', fontSize: 16 },
  remove: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  removeText: { color: colors.danger, fontSize: 14 },
  disabled: { opacity: 0.45 },
});
