import React, { useEffect, useRef, useState } from 'react';
import {
  View, TextInput, ScrollView, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { searchPlaces, PlaceSearchError, PlaceSearchResult } from '../services/placesApi';
import { colors } from '../constants/theme';

interface Props {
  onPlaceSelected: (place: {
    name: string; address: string; latitude: number; longitude: number; placeId: string; countryCode?: string;
  }) => void;
}

type SearchState = 'idle' | 'waiting' | 'searching' | 'results' | 'empty' | 'error';

export const PlaceSearchInput: React.FC<Props> = ({ onPlaceSelected }) => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [state, setState] = useState<SearchState>('idle');
  const [errorCode, setErrorCode] = useState('unknown');
  const [retryCount, setRetryCount] = useState(0);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionHandled = useRef(false);

  useEffect(() => {
    const id = ++requestId.current;
    controller.current?.abort();
    const abortController = new AbortController();
    controller.current = abortController;
    setResults([]);
    if ([...searchText.trim()].length < 2) {
      setState('idle');
      return () => abortController.abort();
    }
    setState('waiting');
    timer.current = setTimeout(async () => {
      setState('searching');
      try {
        const places = await searchPlaces(searchText, { signal: abortController.signal });
        if (requestId.current !== id || abortController.signal.aborted) return;
        setResults(places);
        setState(places.length ? 'results' : 'empty');
      } catch (error) {
        if (requestId.current !== id || abortController.signal.aborted) return;
        setErrorCode(error instanceof PlaceSearchError ? error.code : 'unknown');
        setState('error');
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      abortController.abort();
    };
  }, [searchText, retryCount]);

  useEffect(() => () => {
    requestId.current += 1;
    controller.current?.abort();
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleSearch = (text: string) => {
    if (text === searchText) return;
    requestId.current += 1;
    controller.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    selectionHandled.current = false;
    setResults([]);
    setState([...text.trim()].length >= 2 ? 'waiting' : 'idle');
    setSearchText(text);
  };

  const handleSelectPlace = (item: PlaceSearchResult) => {
    if (selectionHandled.current) return;
    selectionHandled.current = true;
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
    requestId.current += 1;
    setResults([]);
    setSearchText('');
    setState('idle');
    onPlaceSelected({
      name: item.name, address: item.address, latitude: item.latitude, longitude: item.longitude,
      placeId: item.id, countryCode: item.countryCode,
    });
  };

  const handleRetry = () => {
    setRetryCount(value => value + 1);
  };

  const busy = state === 'searching';
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('searchLabel')}</Text>
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={22} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchPlace')}
          accessibilityLabel={t('searchPlace')}
          value={searchText}
          onChangeText={handleSearch}
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
        />
        {busy ? <ActivityIndicator color={colors.primary} /> : searchText.length > 0 ? (
          <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}
            accessibilityLabel={t('clearSearch')} accessibilityRole="button">
            <MaterialIcons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.hint}>{t('placeSearchDomesticHint')}</Text>
      {state === 'idle' && <Text style={styles.hint}>{t('searchHint')}</Text>}
      {busy && <Text style={styles.hint} accessibilityLiveRegion="polite">{t('searching')}</Text>}
      {state === 'empty' && <Text style={styles.hint} accessibilityLiveRegion="polite">{t('searchEmpty')}</Text>}
      {state === 'error' && (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{t(`routeReason.${errorCode}`, { defaultValue: t('routeReason.unknown') })}</Text>
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton} accessibilityRole="button">
            <Text style={styles.retryText}>{t('searchRetry')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <ScrollView style={styles.resultsList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {results.map(item => (
              <TouchableOpacity key={item.id} style={styles.resultItem}
                onPress={() => handleSelectPlace(item)}
                accessibilityRole="button"
                accessibilityLabel={t('addSelectedPlace', { name: item.name })}>
                <MaterialIcons name="place" size={20} color={colors.primary} />
                <View style={styles.resultCopy}>
                  <Text style={styles.mainText}>{item.name}</Text>
                  {!!item.address && <Text style={styles.secondaryText}>{item.address}</Text>}
                </View>
                <MaterialIcons name="add" size={22} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.provider}>{t('placeSearchProvider')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 4, marginBottom: 8 },
  label: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingLeft: 14, paddingRight: 8 },
  searchInput: { flex: 1, minHeight: 52, paddingHorizontal: 10, paddingVertical: 12, fontSize: 16, color: colors.text },
  clearButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginTop: 8 },
  resultsContainer: { backgroundColor: colors.surface, borderRadius: 16, marginTop: 10,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  resultsList: { maxHeight: 280 },
  resultItem: { flexDirection: 'row', alignItems: 'center', minHeight: 64, padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  resultCopy: { flex: 1, marginHorizontal: 10 },
  mainText: { fontSize: 15, fontWeight: '600', color: colors.text },
  secondaryText: { fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 4 },
  provider: { fontSize: 11, color: colors.textSecondary, textAlign: 'right', padding: 10 },
  errorBox: { marginTop: 10, borderRadius: 12, backgroundColor: colors.warningSoft, padding: 12 },
  errorText: { fontSize: 13, lineHeight: 20, color: colors.warning },
  retryButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingRight: 16 },
  retryText: { fontSize: 14, color: colors.primary, fontWeight: '700' },
});
