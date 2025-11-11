import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../stores/tripStore';
import { useLanguage, SupportedLanguage } from '../hooks/useLanguage';
import { DUOLINGO_COLORS } from '../constants';
import { MaterialIcons } from '@expo/vector-icons';

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { savedTrips, clearAllTrips } = useTripStore();
  const { currentLanguage, changeLanguage, getLanguageName } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current; // 초기값을 화면 밖으로 설정

  useEffect(() => {
    if (showLanguageModal) {
      // 모달이 열릴 때: 아래에서 위로 슬라이드
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [showLanguageModal, slideAnim]);

  const handleClearAllTrips = () => {
    Alert.alert(
      t('deleteAllTrips'),
      t('deleteAllTripsConfirm', { count: savedTrips.length }),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            clearAllTrips();
            Alert.alert(t('complete'), t('allTripsDeleted'));
          },
        },
      ]
    );
  };

  const handleLanguageSelect = async (language: SupportedLanguage) => {
    await changeLanguage(language);
    // 모달 닫기 애니메이션
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowLanguageModal(false);
    });
  };

  const handleCloseModal = () => {
    // 모달 닫기 애니메이션
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowLanguageModal(false);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* 앱 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('appInfo')}</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.appName}>Tribble</Text>
            <Text style={styles.appVersion}>{t('appVersion')} 1.0.6</Text>
            <Text style={styles.appDescription}>
              {t('appDescription')}
            </Text>
          </View>
        </View>

        {/* 언어 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language')}</Text>
          
          <TouchableOpacity
            style={styles.card}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{t('selectLanguage')}</Text>
                <Text style={styles.settingValue}>{getLanguageName(currentLanguage)}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={DUOLINGO_COLORS.gray} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 데이터 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('savedTripList')}</Text>
          
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t('savedTripListDescription')}</Text>
              <Text style={styles.statValue}>{savedTrips.length}{t('number')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearAllTrips}
          >
            <MaterialIcons
              name="refresh"
              size={30}
              marginRight={10}
              color={DUOLINGO_COLORS.red}
            />
            <View style={styles.dangerButtonTextContainer}>
              <Text style={styles.dangerButtonText}>{t('deleteAllTrips')}</Text>
              <Text style={styles.dangerButtonSubtext}>
                {t('deleteAllTripsConfirm', { count: savedTrips.length })}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 언어 선택 모달 */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectLanguage')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleCloseModal}
              >
                <MaterialIcons name="close" size={24} color={DUOLINGO_COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.languageList}>
              {(['ko', 'en', 'ja', 'zh'] as SupportedLanguage[]).map((language) => (
                <TouchableOpacity
                  key={language}
                  style={[
                    styles.languageItem,
                    currentLanguage === language && styles.languageItemActive
                  ]}
                  onPress={() => handleLanguageSelect(language)}
                >
                  <Text style={[
                    styles.languageName,
                    currentLanguage === language && styles.languageNameActive
                  ]}>
                    {getLanguageName(language)}
                  </Text>
                  {currentLanguage === language && (
                    <MaterialIcons name="check" size={24} color={DUOLINGO_COLORS.blue} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>
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
    color: DUOLINGO_COLORS.red,
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
    color: DUOLINGO_COLORS.red,
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
  // 언어 선택 관련 스타일
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: DUOLINGO_COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  languageList: {
    paddingHorizontal: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: DUOLINGO_COLORS.lightGray,
  },
  languageItemActive: {
    backgroundColor: '#f8f9fa',
  },
  languageName: {
    fontSize: 16,
    color: '#333',
  },
  languageNameActive: {
    color: DUOLINGO_COLORS.blue,
    fontWeight: '600',
  },
});


