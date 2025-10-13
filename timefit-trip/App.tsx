import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TripPlannerScreen, SavedTripsScreen } from './src/screens';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'planner'>('home');

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {currentScreen === 'home' ? (
        <SavedTripsScreen 
          onSelectTrip={() => setCurrentScreen('planner')}
          onCreateNew={() => setCurrentScreen('planner')}
        />
      ) : (
        <TripPlannerScreen onBack={() => setCurrentScreen('home')} />
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
