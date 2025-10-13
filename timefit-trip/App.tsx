import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TripPlannerScreen, SavedTripsScreen } from './src/screens';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'planner' | 'saved'>('planner');

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {currentScreen === 'planner' ? (
        <TripPlannerScreen />
      ) : (
        <SavedTripsScreen onSelectTrip={() => setCurrentScreen('planner')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
