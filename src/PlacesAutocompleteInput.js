import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TextInput,
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';

let ExpoConstants;
try {
  ExpoConstants = require('expo-constants').default;
} catch (_) {
  ExpoConstants = undefined;
}

const getExpoKey = () => {
  if (!ExpoConstants) return undefined;
  const manifest = ExpoConstants.manifest ?? ExpoConstants.expoConfig;
  const rawExtra = manifest?.extra?.GOOGLE_PLACES_API_KEY;
  if (rawExtra && rawExtra !== '$GOOGLE_MAPS_API_KEY') return rawExtra;
  return process?.env?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
};

const DEFAULT_DEBOUNCE_MS = 250;
const PlacesAutocompleteInput = ({
  onPlaceSelect,
  apiKey,
  setOuterRes,
  minChars = 2,
  language = 'en',
  types = 'geocode',
  debounceMs = DEFAULT_DEBOUNCE_MS,
  inputProps,
  containerStyle,
  inputStyle,
  resultItemStyle,
  resultTextStyle,
  loaderColor = '#2563EB',
  onError,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Use a stable session token to improve billing quality
  const sessionToken = useMemo(() => {
    // simple token for session grouping
    return Math.random().toString(36).slice(2);
  }, []);

  // Resolve API key
  const resolvedApiKey =
    apiKey ||
    getExpoKey() ||
    process?.env?.GOOGLE_PLACES_API_KEY ||
    process?.env?.REACT_NATIVE_GOOGLE_PLACES_API_KEY;

  const debounceTimer = useRef(null);
  const inFlight = useRef(null);

  const clearDebounce = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  };

  const fetchPlaces = (input) => {
    setQuery(input);
    clearDebounce();

    if (!input || input.length < minChars) {
      setResults([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      if (!resolvedApiKey) {
        const msg =
          'Google Places API key is missing. Pass apiKey prop or set Expo/ENV key.';
        console.warn(msg);
        onError?.(new Error(msg));
        return;
      }

      try {
        setLoading(true);
        // cancel previous
        if (inFlight.current?.cancel) {
          inFlight.current.cancel('New request superseded');
        }
        const source = axios.CancelToken.source();
        inFlight.current = source;

        const res = await axios.get(
          'https://maps.googleapis.com/maps/api/place/autocomplete/json',
          {
            cancelToken: source.token,
            params: {
              input,
              key: resolvedApiKey,
              language,
              types,
              sessiontoken: sessionToken,
            },
          }
        );
        const predictions = res?.data?.predictions ?? [];
        setResults(predictions);
        setOuterRes && setOuterRes(predictions);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.warn('Autocomplete error:', err?.message || err);
          onError?.(err);
        }
      } finally {
        setLoading(false);
      }
    }, Math.max(0, debounceMs));
  };

  const fetchPlaceDetails = async (placeId) => {
    try {
      const res = await axios.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        {
          params: {
            place_id: placeId,
            key: resolvedApiKey,
            fields: 'geometry,formatted_address',
            sessiontoken: sessionToken,
          },
        }
      );
      return res.data.result;
    } catch (err) {
      console.warn('Place details error:', err.message);
      onError?.(err);
      return null;
    }
  };

  const handleSelect = async (item) => {
    const details = await fetchPlaceDetails(item.place_id);
    if (details?.geometry?.location) {
      onPlaceSelect?.({
        description: item.description,
        location: {
          lat: details.geometry.location.lat,
          lng: details.geometry.location.lng,
        },
        address: details.formatted_address,
      });
      setQuery(item.description);
      setResults([]);
    }
  };

  useEffect(() => {
    return () => {
      clearDebounce();
      if (inFlight.current?.cancel) inFlight.current.cancel('Unmount');
    };
  }, []);

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        value={query}
        onChangeText={fetchPlaces}
        placeholderTextColor="#888"
        placeholder="Search location..."
        style={[styles.input, inputStyle]}
        {...inputProps}
      />
      {loading ? (
        <ActivityIndicator size="small" color={loaderColor} style={styles.loader} />
      ) : null}
      {results.length > 0 ? (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={results}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.resultItem, resultItemStyle]}
              onPress={() => handleSelect(item)}
            >
              <Text style={[styles.resultText, resultTextStyle]}>
                {item.description}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  input: {
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 16
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff'
  },
  resultText: {
    fontSize: 14,
    color: '#111'
  },
  loader: { marginVertical: 8 }
});

export default PlacesAutocompleteInput;