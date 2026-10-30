import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, radii, typography } from '../constants/theme';

type Screen = 'home' | 'planner' | 'settings';
interface Props {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export const BottomNav: React.FC<Props> = ({ activeScreen, onNavigate }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const items: { screen: Screen; icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string }[] = [
    { screen: 'home', icon: 'bookmark-border', label: t('myTrips', { defaultValue: '내 여행' }) },
    { screen: 'planner', icon: 'route', label: t('plannerTab', { defaultValue: '현재 일정' }) },
    { screen: 'settings', icon: 'settings', label: t('settings') },
  ];
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.content}>
        {items.map(({ screen, icon, label }) => {
          const selected = activeScreen === screen;
          return (
            <Pressable key={screen} accessibilityRole="tab" accessibilityLabel={label}
              accessibilityState={{ selected }} onPress={() => onNavigate(screen)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <View style={[styles.icon, selected && styles.selectedIcon]}>
                <MaterialIcons name={icon} size={23} color={selected ? colors.primary : colors.textSecondary} />
              </View>
              <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', paddingHorizontal: 12 },
  item: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: radii.md },
  icon: { minWidth: 52, paddingVertical: 4, alignItems: 'center', borderRadius: radii.pill },
  selectedIcon: { backgroundColor: colors.primarySoft },
  label: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  selectedLabel: { color: colors.primary, fontWeight: '600' },
  pressed: { backgroundColor: colors.surfaceMuted },
});
