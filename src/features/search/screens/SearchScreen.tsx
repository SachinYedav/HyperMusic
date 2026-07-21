import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Keyboard, TextInput, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Screen } from '@/ui/Screen';
import { useTheme, spacing, radius, typography } from '@/theme';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSearchSuggestions } from '../hooks/useSearchSuggestions';
import { SearchHeader } from '../components/SearchHeader';
import { SuggestionRow } from '../components/SuggestionRow';
import { SearchFeedback } from '../components/SearchFeedback';
import { TrackResultCard } from '../components/TrackResultCard';
import { CategoryCards } from '../components/CategoryCards';
import { useNativeSearch } from '../hooks/useNativeSearch';
import { usePlayerStore } from '@/store';
import { BrowseItem } from 'react-native-hyper-extractor';
import { parseNetworkError } from '@/utils/errorUtils';
import { ErrorState } from '@/ui/ErrorState';

type FilterType = 'all' | 'song' | 'artist' | 'album' | 'playlist';

type SearchListItem =
  | { type: 'categories' }
  | { type: 'suggestion'; query: string }
  | { type: 'feedback'; variant: 'offline' | 'error' | 'empty' | 'no-results' | 'no-suggestions' | 'searching' | 'initial'; message?: string; subMessage?: string; onRetry?: () => void }
  | { type: 'result'; result: BrowseItem };

/**
 * Native search workspace handling real-time query suggestions, dynamic catalog filtering, and immediate playback invocation.
 */
export function SearchScreen() {
  const { colors } = useTheme();
  const playTrack = usePlayerStore(state => state.playTrack);
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const normalizedQuery = query.trim().toLowerCase();

  const suggestions = useSearchSuggestions({
    focused: isFocused,
    query,
  });

  // Native Search Query
  const { data: searchResults, isLoading: isSearchLoading, isError: isSearchError, error: searchError, refetch } = useNativeSearch(submittedQuery);

  const submitSearch = useCallback((searchTerm: string) => {
    const nextQuery = searchTerm.trim();
    if (!nextQuery) return;

    Keyboard.dismiss();
    setIsFocused(false);
    setQuery(nextQuery);
    setSubmittedQuery(nextQuery);
  }, []);

  const handleSuggestionPress = useCallback((text: string) => {
    submitSearch(text);
  }, [submitSearch]);

  // Sync state instantly when the OS native back button closes the keyboard
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setIsFocused(true);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setIsFocused(false);

      // If user typed something but dismissed keyboard without submitting, revert to last submitted query
      setQuery(prev => {
        if (prev !== submittedQuery) {
          return submittedQuery;
        }
        return prev;
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [submittedQuery]);

  const listData = useMemo(() => {
    const items: SearchListItem[] = [];

    // STATE 1: User is actively typing (Keyboard is open)
    if (isFocused && normalizedQuery.length > 0) {
      if (suggestions.suggestions.length > 0) {
        suggestions.suggestions.forEach((item) => items.push({ type: 'suggestion', query: item }));
      } else if (suggestions.errorState) {
        items.push({ type: 'feedback', ...suggestions.errorState });
      } else {
        // While loading or if no suggestions exist yet, show Categories to avoid blank flashes
        items.push({ type: 'categories' });
      }
      return items;
    }

    // STATE 2: A search has been submitted, and user is NOT typing a new query
    if (submittedQuery) {
      if (isSearchLoading) {
        items.push({ type: 'feedback', variant: 'searching' });
      } else if (isSearchError) {
        const parsed = parseNetworkError(searchError);
        items.push({ type: 'feedback', variant: parsed.variant === 'offline' ? 'offline' : 'error', message: parsed.title, subMessage: parsed.subtitle, onRetry: refetch });
      } else if (searchResults && searchResults.length > 0) {
        const filteredResults = activeFilter === 'all'
          ? searchResults
          : searchResults.filter(r => r.type === activeFilter);

        if (filteredResults.length > 0) {
          filteredResults.forEach(result => items.push({ type: 'result', result }));
        } else {
          items.push({ type: 'feedback', variant: 'no-results' });
        }
      } else {
        items.push({ type: 'feedback', variant: 'no-results' });
      }
      return items;
    }

    // STATE 3: Default Empty State
    items.push({ type: 'categories' });
    return items;
  }, [isFocused, normalizedQuery, submittedQuery, suggestions.suggestions, suggestions.errorState, searchResults, isSearchLoading, isSearchError, searchError, refetch, activeFilter]);

  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const renderItem = useCallback(({ item }: { item: SearchListItem }) => {
    switch (item.type) {
      case 'categories':
        return <CategoryCards />;
      case 'suggestion':
        return <SuggestionRow suggestion={item.query} query={query} onPress={() => handleSuggestionPress(item.query)} />;
      case 'result':
        const mappedTrack: BrowseItem & any = {
          id: item.result.id,
          title: item.result.title,
          artist: item.result.subtitle,
          duration: 0,
          artworkUrl: item.result.artworkUrl,
          artistId: item.result.type === 'artist' ? item.result.id : undefined,
        };

        return (
          <TrackResultCard
            track={mappedTrack}
            onPress={() => {
              if (item.result.type === 'artist') {
                navigation.navigate('ArtistProfile', { id: item.result.id });
              } else if (item.result.type === 'album') {
                navigation.navigate('AlbumDetails', { id: item.result.id });
              } else if (item.result.type === 'playlist') {
                navigation.navigate('PlaylistDetails', { id: item.result.id });
              } else {
                playTrack({ ...mappedTrack, url: '' });
              }
            }}
          />
        );
      case 'feedback':
        return <SearchFeedback item={item} />;
    }
  }, [handleSuggestionPress, query, playTrack, navigation]);

  return (
    <Screen disableSafeAreaBottom>
      <SearchHeader
        ref={inputRef}
        query={query}
        isLoading={suggestions.isLoading && !!normalizedQuery}
        isFocused={isFocused}
        onQueryChange={(val) => {
          setQuery(val);
          if (!val.trim()) setSubmittedQuery('');
        }}
        onSubmit={() => submitSearch(query)}
        onClear={() => {
          setQuery('');
          setSubmittedQuery('');
          setIsFocused(true);
          inputRef.current?.focus();
        }}
        onFocus={() => setIsFocused(true)}
        onBackPress={() => {
          Keyboard.dismiss();
          setIsFocused(false);
          if (query !== submittedQuery) {
            setQuery(submittedQuery);
          }
        }}
      />

      {!!submittedQuery && !isFocused && !isSearchLoading && !isSearchError && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            {(['all', 'song', 'artist', 'album', 'playlist'] as const).map(filter => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip, 
                  { borderColor: colors.border },
                  activeFilter === filter && { backgroundColor: colors.text, borderColor: colors.text }
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterText, { color: colors.text }, activeFilter === filter && { color: colors.background }]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isSearchError ? (
        <ErrorState error={searchError} onRetry={refetch} />
      ) : (
        <FlashList
          data={listData}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          getItemType={(item) => item.type}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          renderItem={renderItem}
          // @ts-ignore
          estimatedItemSize={60}
          contentContainerStyle={{ paddingBottom: 170 }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  filterContainer: {
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  filterText: {
    fontSize: typography.body,
    fontWeight: '500',
  },

  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
  },
  panelHeader: {
    height: 38,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
