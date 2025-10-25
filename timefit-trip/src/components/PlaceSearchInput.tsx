import React, { useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { searchPlaces, getPlaceDetails } from '../services/googleApi';
import { GooglePlaceAutocomplete } from '../types';
import { DUOLINGO_COLORS } from '../constants';
import { useTranslation } from 'react-i18next';

interface Props {
  onPlaceSelected: (place: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    placeId: string;
  }) => void;
}

export const PlaceSearchInput: React.FC<Props> = ({ onPlaceSelected }) => {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<GooglePlaceAutocomplete[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleSearch = async (text: string) => {
    setSearchText(text);

    if (text.length < 2) {
      setResults([]);
      return;
    }

    console.log('장소 검색 중:', text);
    setIsLoading(true);
    const places = await searchPlaces(text);
    console.log('검색 결과:', places.length, '개');
    setResults(places);
    setIsLoading(false);
  };

  const handleSelectPlace = async (item: GooglePlaceAutocomplete) => {
    console.log('장소 선택:', item.structured_formatting.main_text);
    setIsLoading(true);
    const details = await getPlaceDetails(item.place_id);
    setIsLoading(false);

    if (details) {
      console.log('장소 상세 정보 가져옴:', details.name);
      onPlaceSelected({
        name: details.name,
        address: details.formatted_address,
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        placeId: details.place_id,
      });

      setSearchText('');
      setResults([]);
    } else {
      console.error('장소 상세 정보를 가져올 수 없습니다');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchPlace')}
          value={searchText}
          onChangeText={handleSearch}
          placeholderTextColor={DUOLINGO_COLORS.gray}
        />
        {isLoading && (
          <ActivityIndicator
            style={styles.loader}
            color={DUOLINGO_COLORS.blue}
          />
        )}
      </View>

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelectPlace(item)}
              >
                <Text style={styles.mainText}>
                  {item.structured_formatting.main_text}
                </Text>
                <Text style={styles.secondaryText}>
                  {item.structured_formatting.secondary_text}
                </Text>
              </TouchableOpacity>
            )}
            style={styles.resultsList}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  loader: {
    marginLeft: 8,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: DUOLINGO_COLORS.lightGray,
  },
  mainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  secondaryText: {
    fontSize: 14,
    color: DUOLINGO_COLORS.gray,
  },
});


