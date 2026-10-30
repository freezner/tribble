import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupportedLanguage, SupportedLanguage } from '../i18n';

export type { SupportedLanguage } from '../i18n';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const currentLanguage: SupportedLanguage = isSupportedLanguage(language) ? language : 'ko';

  const changeLanguage = async (nextLanguage: SupportedLanguage) => {
    // Persist first so the settings screen can report a failed preference write.
    await AsyncStorage.setItem('user-language', nextLanguage);
    await i18n.changeLanguage(nextLanguage);
  };

  const getLanguageName = (code: SupportedLanguage): string => ({
    ko: '한국어', en: 'English', ja: '日本語', zh: '中文',
  })[code];

  return { currentLanguage, changeLanguage, getLanguageName };
};
