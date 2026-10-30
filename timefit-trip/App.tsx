import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { TripPlannerScreen, SavedTripsScreen, SettingsScreen } from './src/screens';
import { BottomNav } from './src/components';
import { colors } from './src/constants/theme';
import { useTripStore } from './src/stores/tripStore';
import { i18nReady } from './src/i18n';

type Screen = 'home' | 'planner' | 'settings';

function TripApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const plannerNavigationGuard = useRef<((proceed: () => void) => void) | null>(null);
  const navigationPending = useRef(false);
  const registerNavigationGuard = useCallback((guard: ((proceed: () => void) => void) | null) => { plannerNavigationGuard.current = guard; }, []);
  const { initialized, error, initialize, createTrip, currentTrip, flushDrafts, refreshExpiredRoutes } = useTripStore();
  const { t } = useTranslation();

  useEffect(() => { void initialize().catch(() => {}); }, [initialize]);
  useEffect(() => {
    if (!initialized) return;
    let active = AppState.currentState === 'active';
    let timer: ReturnType<typeof setInterval> | null = null;
    const refresh = () => { if (active) void refreshExpiredRoutes().catch(() => {}); };
    const start = () => { refresh(); timer = setInterval(refresh, 60_000); };
    const stop = () => { if (timer !== null) clearInterval(timer); timer = null; };
    if (active) start();
    const subscription = AppState.addEventListener('change', state => {
      active = state === 'active';
      stop();
      if (active) start();
      else void flushDrafts().catch(() => {});
    });
    return () => { active = false; stop(); subscription.remove(); };
  }, [initialized, flushDrafts, refreshExpiredRoutes]);

  const completeNavigation = useCallback(async (proceed: () => void | Promise<void>) => {
    if (navigationPending.current) return;
    navigationPending.current = true;
    try { await flushDrafts(); await proceed(); }
    catch {
      Alert.alert(t('planner.leaveSaveFailedTitle', { defaultValue: '초안을 보관하지 못했어요' }), t('planner.leaveSaveFailedBody', { defaultValue: '입력 내용은 현재 화면에 남아 있어요. 다시 시도한 뒤 이동해 주세요.' }));
    } finally { navigationPending.current = false; }
  }, [flushDrafts, t]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home') return false;
      const proceed = () => { void completeNavigation(() => setScreen('home')); };
      if (screen === 'planner' && plannerNavigationGuard.current) plannerNavigationGuard.current(proceed);
      else proceed();
      return true;
    });
    return () => subscription.remove();
  }, [screen, completeNavigation]);

  const createNew = () => void completeNavigation(async () => {
    await createTrip(t('newTrip'));
    setScreen('planner');
  });
  const navigate = (next: Screen) => {
    if (next === screen) return;
    const proceed = () => void completeNavigation(async () => {
      if (next === 'planner' && !currentTrip) await createTrip(t('newTrip'));
      setScreen(next);
    });
    if (screen === 'planner' && plannerNavigationGuard.current) {
      plannerNavigationGuard.current(proceed);
      return;
    }
    proceed();
  };

  if (!initialized) {
    return (
      <SafeAreaView style={styles.startup}>
        <Text style={styles.brand}>tribble</Text>
        {error ? (
          <>
            <Text style={styles.startupTitle}>{t('planner.openError', { defaultValue: '여행을 불러오지 못했어요' })}</Text>
            <Text style={styles.startupText}>{t('planner.openErrorDetail', { defaultValue: '저장된 데이터를 보호하기 위해 편집을 잠시 멈췄습니다. 다시 불러와 주세요.' })}</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => void initialize().catch(() => {})}>
              <Text style={styles.retryText}>{t('planner.retry', { defaultValue: '다시 시도' })}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <><ActivityIndicator color={colors.primary} /><Text style={styles.startupText}>{t('planner.opening', { defaultValue: '여행을 불러오는 중이에요' })}</Text></>
        )}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.app}>
      <View style={styles.content}>
        {screen === 'home' && <SavedTripsScreen onSelectTrip={() => setScreen('planner')} onCreateNew={createNew} />}
        {screen === 'planner' && <TripPlannerScreen onBack={() => navigate('home')} registerNavigationGuard={registerNavigationGuard} />}
        {screen === 'settings' && <SettingsScreen />}
      </View>
      <BottomNav activeScreen={screen} onNavigate={navigate} />
    </View>
  );
}

export default function App() {
  const [languageReady, setLanguageReady] = useState(false);
  useEffect(() => { void i18nReady.finally(() => setLanguageReady(true)); }, []);
  return <SafeAreaProvider><StatusBar style="dark" />{languageReady ? <TripApp /> : <View style={styles.startup}><ActivityIndicator color={colors.primary} /></View>}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  startup: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.background },
  brand: { color: colors.primary, fontSize: 34, fontWeight: '700', letterSpacing: -1.5, marginBottom: 32 },
  startupTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 12, textAlign: 'center' },
  startupText: { fontSize: 15, lineHeight: 23, color: colors.textSecondary, textAlign: 'center', marginTop: 12 },
  retry: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: colors.primary, borderRadius: 12, marginTop: 24 },
  retryText: { fontSize: 16, fontWeight: '600', color: colors.onPrimary },
});
