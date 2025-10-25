import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLanguage = 'ko' | 'en' | 'ja' | 'zh';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('ko');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('user-language');
        if (savedLanguage && ['ko', 'en', 'ja', 'zh'].includes(savedLanguage)) {
          setCurrentLanguage(savedLanguage as SupportedLanguage);
        }
      } catch (error) {
        console.error('언어 로드 오류:', error);
      }
    };

    loadLanguage();
  }, []);

  const changeLanguage = async (language: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(language);
      await AsyncStorage.setItem('user-language', language);
      setCurrentLanguage(language);
    } catch (error) {
      console.error('언어 변경 오류:', error);
    }
  };

  const getLanguageName = (code: SupportedLanguage): string => {
    const names = {
      ko: '한국어',
      en: 'English',
      ja: '日本語',
      zh: '中文'
    };
    return names[code];
  };

  return {
    currentLanguage,
    changeLanguage,
    getLanguageName,
  };
};
