import React, { useState, useEffect } from 'react';
import { StyleSheet, View, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TripPlannerScreen, SavedTripsScreen, SettingsScreen } from './src/screens';
import { BottomNav } from './src/components';
import { useTripStore } from './src/stores/tripStore';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'planner' | 'settings'>('home');
  const { createTrip } = useTripStore();

  useEffect(() => {
    // 하단 에러 토스트 및 경고 메시지 비활성화
    LogBox.ignoreAllLogs(true);
    
    // 특정 경고만 무시하려면 (선택적):
    // LogBox.ignoreLogs([
    //   'Non-serializable values were found in the navigation state',
    //   'ViewPropTypes will be removed',
    // ]);
  }, []);

  const handleCreateNew = () => {
    createTrip('새 여행');
    setCurrentScreen('planner');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.content}>
        {currentScreen === 'home' && (
          <SavedTripsScreen 
            onSelectTrip={() => setCurrentScreen('planner')}
            onCreateNew={handleCreateNew}
          />
        )}
        {currentScreen === 'planner' && (
          <TripPlannerScreen onBack={() => setCurrentScreen('home')} />
        )}
        {currentScreen === 'settings' && (
          <SettingsScreen />
        )}
      </View>

      <BottomNav
        activeScreen={currentScreen}
        onNavigate={setCurrentScreen}
        onCreateNew={handleCreateNew}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
});
