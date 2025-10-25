import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DUOLINGO_COLORS } from '../constants';

interface Props {
  activeScreen: 'home' | 'planner' | 'settings';
  onNavigate: (screen: 'home' | 'planner' | 'settings') => void;
  onCreateNew: () => void;
}

export const BottomNav: React.FC<Props> = ({ activeScreen, onNavigate, onCreateNew }) => {
  return (
    <View style={styles.container}>
      {/* 홈 버튼 */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onNavigate('home')}
      >
        <MaterialIcons 
          name="home" 
          size={24} 
          color={activeScreen === 'home' ? DUOLINGO_COLORS.gray : '#999'}
          style={{ marginBottom: 4 }}
        />
      </TouchableOpacity>

      {/* 중앙 새 여행 버튼 */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={onCreateNew}
        activeOpacity={0.8}
      >
        <View style={styles.centerButtonInner}>
          <Text style={styles.centerButtonText}>+</Text>
        </View>
      </TouchableOpacity>

      {/* 설정 버튼 */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onNavigate('settings')}
      >
        <MaterialIcons 
          name="settings" 
          size={24} 
          color={activeScreen === 'settings' ? DUOLINGO_COLORS.gray : '#999'}
          style={{ marginBottom: 4 }}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: DUOLINGO_COLORS.lightGray,
    paddingBottom: 10,
    paddingTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 25,
  },
  navIcon: {
    fontSize: 30,
    opacity: 0.5,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 13,
    color: DUOLINGO_COLORS.gray,
    fontWeight: '500',
  },
  navLabelActive: {
    color: DUOLINGO_COLORS.gray,
    fontWeight: '700',
  },
  centerButton: {
    flex: 1,
    alignItems: 'center',
    marginTop: 12,
  },
  centerButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DUOLINGO_COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: DUOLINGO_COLORS.gray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 4,
  },
  centerButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '700',
    lineHeight: 32,
  },
});

