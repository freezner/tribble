import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../constants/theme';
import { CARD_TITLE_MAX_LENGTH, useCardPreferencesStore } from '../stores/cardPreferencesStore';

export const CardPreferencesSection: React.FC = () => {
  const { t } = useTranslation();
  const { title, initialized, isSaving, error, initialize, saveTitle, clearError } = useCardPreferencesStore();
  const [input, setInput] = useState(title);
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const busy = isSaving || pending;
  const unchanged = input.trim() === title;

  useEffect(() => { void initialize().catch(() => {}); }, [initialize]);
  useEffect(() => { if (initialized) setInput(title); }, [initialized, title]);

  const save = async () => {
    if (!initialized || busy || saving.current || unchanged) return;
    saving.current = true;
    setPending(true); setFormError(''); setSaved(false);
    try {
      await saveTitle(input);
      setInput(input.trim()); setSaved(true);
    } catch (failure) {
      setFormError(failure instanceof Error && failure.message === 'invalid-card-title'
        ? 'social.cardTitleInvalid' : 'social.cardTitleSaveFailed');
    } finally { saving.current = false; setPending(false); }
  };

  return <View>
    <Text style={styles.heading}>{t('social.cardPreferences')}</Text>
    <Text style={styles.hint}>{t('social.cardTitleHint')}</Text>
    {!initialized && !error && <ActivityIndicator style={styles.loading} color={colors.primary} />}
    {!initialized && !!error && <View style={styles.errorBox}>
      <Text accessibilityRole="alert" style={styles.error}>{t('social.cardTitleLoadFailed')}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => void initialize().catch(() => {})} style={styles.retry}><Text style={styles.link}>{t('planner.retry')}</Text></TouchableOpacity>
    </View>}
    <Text style={styles.label}>{t('social.cardTitleLabel')}</Text>
    <TextInput accessibilityLabel={t('social.cardTitleLabel')} value={input} placeholder="tribble"
      placeholderTextColor={colors.textSecondary} style={styles.input} maxLength={CARD_TITLE_MAX_LENGTH}
      editable={initialized && !busy} autoCorrect={false} autoCapitalize="none" returnKeyType="done"
      onChangeText={value => { setInput(value); setFormError(''); setSaved(false); clearError(); }}
      onSubmitEditing={() => void save()} />
    {!!formError && <Text accessibilityRole="alert" style={styles.error}>{t(formError)}</Text>}
    {saved && <Text accessibilityLiveRegion="polite" style={styles.saved}>{t('social.cardTitleSaved')}</Text>}
    <TouchableOpacity accessibilityRole="button" disabled={!initialized || busy || unchanged}
      onPress={() => void save()} style={[styles.save, (!initialized || busy || unchanged) && styles.disabled]}>
      {busy ? <ActivityIndicator accessibilityLabel={t('saveInProgress')} color={colors.onPrimary} /> : <Text style={styles.saveText}>{t('save')}</Text>}
    </TouchableOpacity>
  </View>;
};

const styles = StyleSheet.create({
  heading: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 30, marginBottom: 10 },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 21, marginBottom: 14 },
  label: { color: colors.text, fontSize: 14, marginBottom: 9 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, fontSize: 16, padding: 14, borderRadius: 12, minHeight: 50 },
  loading: { marginVertical: 12 },
  errorBox: { backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 12, marginBottom: 12 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 21, marginVertical: 8 },
  retry: { minHeight: 44, justifyContent: 'center' },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  saved: { color: colors.success, fontSize: 13, lineHeight: 21, marginTop: 8 },
  save: { minHeight: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginTop: 12 },
  saveText: { color: colors.onPrimary, fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.45 },
});
