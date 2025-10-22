import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { useTripStore } from '../stores/tripStore';
import { DUOLINGO_COLORS } from '../constants';

export const SettingsScreen: React.FC = () => {
  const { savedTrips, clearAllTrips } = useTripStore();

  const handleClearAllTrips = () => {
    Alert.alert(
      '모든 여행 삭제',
      `${savedTrips.length}개의 저장된 여행이 모두 삭제됩니다.\n계속하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            clearAllTrips();
            Alert.alert('완료', '모든 여행이 삭제되었습니다.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* 앱 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.appName}>Tribble</Text>
            <Text style={styles.appVersion}>버전 1.0.0</Text>
            <Text style={styles.appDescription}>
              여행 시간을 계획하는 똑똑한 플래너
            </Text>
          </View>
        </View>

        {/* 데이터 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>저장 목록 관리</Text>
          
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>저장된 여행</Text>
              <Text style={styles.statValue}>{savedTrips.length}개</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearAllTrips}
          >
            <Text style={styles.dangerButtonIcon}>🗑️</Text>
            <View style={styles.dangerButtonTextContainer}>
              <Text style={styles.dangerButtonText}>모든 여행 삭제</Text>
              <Text style={styles.dangerButtonSubtext}>
                저장된 모든 여행이 삭제됩니다
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: DUOLINGO_COLORS.lightGray,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DUOLINGO_COLORS.gray,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: DUOLINGO_COLORS.green,
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: DUOLINGO_COLORS.blue,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: DUOLINGO_COLORS.red,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dangerButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  dangerButtonTextContainer: {
    flex: 1,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: DUOLINGO_COLORS.red,
    marginBottom: 2,
  },
  dangerButtonSubtext: {
    fontSize: 12,
    color: DUOLINGO_COLORS.gray,
  },
  infoList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: DUOLINGO_COLORS.lightGray,
  },
  infoLabel: {
    fontSize: 15,
    color: '#333',
  },
  infoValue: {
    fontSize: 15,
    color: DUOLINGO_COLORS.gray,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 40,
  },
});


