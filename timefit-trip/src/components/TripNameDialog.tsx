import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii, typography } from '../constants/theme';

interface Props {
  visible: boolean;
  initialName?: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export const TripNameDialog: React.FC<Props> = ({ visible, initialName = '', onSave, onCancel }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  useEffect(() => { if (visible) setName(initialName); }, [visible, initialName]);
  const save = () => { if (name.trim()) onSave(name.trim()); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={t('cancel')} />
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title}>{t('tripName')}</Text>
          <Text style={styles.subtitle}>{t('tripNameHint', { defaultValue: '여행을 기억할 이름을 입력해 주세요' })}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={60}
            accessibilityLabel={t('tripName')} placeholder={t('tripNamePlaceholder', { defaultValue: '예: 성수동 반나절' })}
            placeholderTextColor={colors.textSecondary} autoFocus selectTextOnFocus returnKeyType="done" onSubmitEditing={save} />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}><Text style={styles.cancelText}>{t('cancel')}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !name.trim() }} disabled={!name.trim()} onPress={save}
              style={[styles.saveButton, !name.trim() && styles.disabled]}><Text style={styles.saveText}>{t('save')}</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: 24 },
  title: { ...typography.heading, color: colors.text },
  subtitle: { ...typography.label, color: colors.textSecondary, marginTop: 6, marginBottom: 20 },
  input: { ...typography.body, color: colors.text, minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, paddingHorizontal: 14, paddingVertical: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 12 },
  saveButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radii.md, padding: 12 },
  cancelText: { ...typography.label, color: colors.text },
  saveText: { ...typography.label, color: colors.onPrimary, fontWeight: '600' },
  disabled: { opacity: 0.45 },
});
