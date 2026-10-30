import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PlaceWithDuration } from '../types';
import { MIN_STAY_DURATION, MAX_STAY_DURATION } from '../constants';
import { colors, radii, typography } from '../constants/theme';
import { formatClock, formatMinutes } from '../utils/timeCalculator';
import { getGooglePlaceLink } from '../utils/externalMaps';

interface Props {
  place: PlaceWithDuration;
  index: number;
  arrivalMinutes: number | null;
  departureMinutes: number | null;
  onRemove: () => void;
  onUpdateName: (name: string) => void;
  onChangeDuration: (minutes: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const PlaceCard: React.FC<Props> = ({ place, index, arrivalMinutes, departureMinutes, onRemove, onUpdateName, onChangeDuration, onMoveUp, onMoveDown }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [name, setName] = useState(place.name);
  const openingMap = useRef(false);
  const mapUrl = getGooglePlaceLink(place);
  useEffect(() => { if (!editing) setName(place.name); }, [place.name, editing]);
  useEffect(() => { setEditing(false); setExpanded(false); setConfirmRemove(false); }, [place.id]);
  const clock = (minutes: number | null) => formatClock(minutes, { unknown: t('timeUnknown', { defaultValue: '계산 후 표시' }), nextDay: t('nextDay', { defaultValue: '다음 날' }) });
  const duration = formatMinutes(place.stayDuration, { hours: t('hours'), minutes: t('minutes') });
  const saveName = () => {
    if (!name.trim()) return;
    onUpdateName(name.trim());
    setEditing(false);
  };
  const editName = () => { setName(place.name); setEditing(true); setConfirmRemove(false); };
  const openPlaceMap = async () => {
    if (!mapUrl || openingMap.current) return;
    openingMap.current = true;
    try { await Linking.openURL(mapUrl); }
    catch { Alert.alert(t('error'), t('planner.placeMapOpenFailed')); }
    finally { openingMap.current = false; }
  };

  return (
    <View style={styles.container}>
      <View style={styles.rail}>
        <Text style={styles.arrival} accessibilityLabel={t('arriveAt', { time: clock(arrivalMinutes), defaultValue: '{{time}} 도착' })}>{arrivalMinutes === null ? '—' : clock(arrivalMinutes)}</Text>
        <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
        <View style={styles.railLine} />
      </View>
      <View style={styles.card}>
        <View style={styles.headingRow}>
          <View style={styles.nameArea}>
            {editing ? (
              <TextInput style={styles.nameInput} value={name} onChangeText={setName} autoFocus selectTextOnFocus maxLength={80}
                accessibilityLabel={t('placeName')} placeholder={t('placeName')} placeholderTextColor={colors.textSecondary}
                returnKeyType="done" onSubmitEditing={saveName} />
            ) : <Pressable accessibilityRole="link" accessibilityLabel={t('planner.openPlaceInGoogleMaps', { name: place.name })}
              accessibilityState={{ disabled: !mapUrl }} disabled={!mapUrl} onPress={() => void openPlaceMap()}
              style={({ pressed }) => [styles.placeLink, pressed && styles.pressed]}>
              <Text style={styles.name}>{place.name}</Text>
              {!!mapUrl && <MaterialIcons name="open-in-new" size={15} color={colors.textSecondary} />}
            </Pressable>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('edit') + ' · ' + place.name}
            accessibilityState={{ expanded }} onPress={() => { setExpanded(!expanded); setConfirmRemove(false); }}
            style={styles.iconButton}><MaterialIcons name={expanded ? 'expand-less' : 'more-horiz'} size={22} color={colors.textSecondary} /></Pressable>
        </View>
        {!!place.address && <Text style={styles.address} numberOfLines={2}>{place.address}</Text>}
        {editing && (
          <View style={styles.nameActions}>
            <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.textButton}><Text style={styles.secondaryText}>{t('cancel')}</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={!name.trim()} accessibilityState={{ disabled: !name.trim() }} onPress={saveName} style={[styles.textButton, !name.trim() && styles.disabled]}><Text style={styles.primaryText}>{t('save')}</Text></Pressable>
          </View>
        )}
        <Text style={styles.stayLabel}>{t('stayDuration')}</Text>
        <View style={styles.durationRow}>
          <View style={styles.stepper}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('decreaseStay', { defaultValue: '체류 시간 15분 줄이기' })}
              accessibilityState={{ disabled: place.stayDuration <= MIN_STAY_DURATION }} disabled={place.stayDuration <= MIN_STAY_DURATION}
              onPress={() => onChangeDuration(Math.max(MIN_STAY_DURATION, place.stayDuration - 15))}
              style={[styles.stepButton, place.stayDuration <= MIN_STAY_DURATION && styles.disabled]}><MaterialIcons name="remove" size={20} color={colors.text} /></Pressable>
            <Text style={styles.duration}>{duration}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('increaseStay', { defaultValue: '체류 시간 15분 늘리기' })}
              accessibilityState={{ disabled: place.stayDuration >= MAX_STAY_DURATION }} disabled={place.stayDuration >= MAX_STAY_DURATION}
              onPress={() => onChangeDuration(Math.min(MAX_STAY_DURATION, place.stayDuration + 15))}
              style={[styles.stepButton, place.stayDuration >= MAX_STAY_DURATION && styles.disabled]}><MaterialIcons name="add" size={20} color={colors.text} /></Pressable>
          </View>
          <Text style={styles.departure}>{departureMinutes === null ? t('timeUnknown', { defaultValue: '계산 후 표시' }) : t('departAt', { time: clock(departureMinutes), defaultValue: '{{time}} 출발' })}</Text>
        </View>
        {expanded && !editing && !confirmRemove && (
          <View style={styles.toolbar}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('renamePlace', { defaultValue: '장소 이름 변경' })} onPress={editName} style={styles.renameButton}>
              <MaterialIcons name="edit" size={16} color={colors.textSecondary} /><Text style={styles.secondaryText}>{t('editPlaceName', { defaultValue: '이름 수정' })}</Text>
            </Pressable>
            <View style={styles.moveActions}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('movePlaceUp', { defaultValue: '위로 이동' })} accessibilityState={{ disabled: !onMoveUp }} disabled={!onMoveUp} onPress={onMoveUp} style={[styles.iconButton, !onMoveUp && styles.disabled]}><MaterialIcons name="arrow-upward" size={18} color={colors.textSecondary} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('movePlaceDown', { defaultValue: '아래로 이동' })} accessibilityState={{ disabled: !onMoveDown }} disabled={!onMoveDown} onPress={onMoveDown} style={[styles.iconButton, !onMoveDown && styles.disabled]}><MaterialIcons name="arrow-downward" size={18} color={colors.textSecondary} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('placeDelete') + ' · ' + place.name} onPress={() => setConfirmRemove(true)} style={styles.iconButton}><MaterialIcons name="delete-outline" size={20} color={colors.danger} /></Pressable>
            </View>
          </View>
        )}
        {confirmRemove && (
          <View style={styles.confirmPanel}>
            <Text style={styles.confirmText}>{t('confirmRemovePlace', { defaultValue: '이 장소를 일정에서 삭제할까요?' })}</Text>
            <View style={styles.confirmActions}>
              <Pressable accessibilityRole="button" onPress={() => setConfirmRemove(false)} style={styles.textButton}><Text style={styles.secondaryText}>{t('cancel')}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={onRemove} style={styles.textButton}><Text style={styles.deleteText}>{t('delete')}</Text></Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  rail: { width: 48, alignItems: 'center', paddingTop: 15 },
  arrival: { ...typography.caption, color: colors.text, fontWeight: '500', textAlign: 'center', fontVariant: ['tabular-nums'] },
  number: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primarySoft, marginTop: 9, alignItems: 'center', justifyContent: 'center' },
  numberText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  railLine: { width: 1, backgroundColor: colors.border, flex: 1, marginTop: 8 },
  card: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 10 },
  headingRow: { flexDirection: 'row', alignItems: 'center' },
  nameArea: { flex: 1, minWidth: 0 },
  placeLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pressed: { opacity: 0.6 },
  name: { ...typography.body, color: colors.text, fontWeight: '600', flexShrink: 1 },
  nameInput: { ...typography.body, color: colors.text, minHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 6 },
  address: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  nameActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  textButton: { minHeight: 44, minWidth: 52, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' },
  primaryText: { ...typography.label, color: colors.primary, fontWeight: '600' },
  secondaryText: { ...typography.caption, color: colors.textSecondary },
  stayLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 13, marginBottom: 5 },
  durationRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 10, rowGap: 5, paddingBottom: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md },
  stepButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  duration: { ...typography.label, color: colors.text, minWidth: 53, paddingHorizontal: 3, textAlign: 'center', fontVariant: ['tabular-nums'] },
  departure: { ...typography.caption, color: colors.textSecondary, flexShrink: 1, fontVariant: ['tabular-nums'] },
  toolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 4 },
  renameButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 4 },
  moveActions: { flexDirection: 'row', alignItems: 'center' },
  confirmPanel: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 8 },
  confirmText: { ...typography.caption, color: colors.text },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  deleteText: { ...typography.label, color: colors.danger },
  disabled: { opacity: 0.35 },
});
