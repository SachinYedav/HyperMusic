import React, { useState, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useTheme, spacing, typography, radius } from '@/theme';
import { Screen } from '@/ui/Screen';
import { usePreferencesStore } from '@/store';
import { Check, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { HyperExtractor, BrowseShelf } from 'react-native-hyper-extractor';

interface FilterItem {
  id: string;
  label: string;
  color: string;
}

/**
 * Curated primary language choices representing major regional music industries.
 */
const INITIAL_LANGUAGES: FilterItem[] = [
  { id: 'Hindi', label: 'Hindi Hits', color: '#E1306C' },
  { id: 'English', label: 'English / Global', color: '#405DE6' },
  { id: 'Punjabi', label: 'Punjabi Hits', color: '#F77737' },
  { id: 'Tamil', label: 'Tamil Kollywood', color: '#833AB4' },
  { id: 'Telugu', label: 'Telugu Tollywood', color: '#5851DB' },
  { id: 'Spanish', label: 'Spanish Latin', color: '#C13584' },
];

/**
 * Official YouTube Music mood and genre categories for precise shelf extraction.
 */
const INITIAL_GENRES: FilterItem[] = [
  { id: 'Haryanvi', label: 'Haryanvi Hits', color: '#FD1D1D' },
  { id: 'Bhojpuri', label: 'Bhojpuri Beats', color: '#F56040' },
  { id: 'Indian Pop', label: 'Indian Pop', color: '#E1306C' },
  { id: 'Pop', label: 'Pop Megahits', color: '#4C68D7' },
  { id: 'Workout', label: 'Workout / Gym', color: '#FF9500' },
  { id: 'Lo-Fi', label: 'Lo-Fi Chill', color: '#AF52DE' },
  { id: 'Hip-Hop', label: 'Hip-Hop / Rap', color: '#5856D6' },
  { id: 'Rock', label: 'Rock & Metal', color: '#34C759' },
  { id: 'Romance', label: 'Romantic Melodies', color: '#FF2D55' },
];

/**
 * Fallback language options utilized when dynamic explore fetching is unavailable.
 */
const EXTENDED_LANGUAGES_BACKUP: FilterItem[] = [
  { id: 'Malayalam', label: 'Malayalam', color: '#009688' },
  { id: 'Kannada', label: 'Kannada', color: '#795548' },
  { id: 'Bengali', label: 'Bengali Tollywood', color: '#673AB7' },
  { id: 'Marathi', label: 'Marathi Hits', color: '#FF5722' },
  { id: 'Gujarati', label: 'Gujarati', color: '#FF9800' },
  { id: 'K-Pop', label: 'K-Pop Global', color: '#E91E63' },
  { id: 'Latin', label: 'Latin Hits', color: '#9C27B0' },
  { id: 'Afrobeat', label: 'Afrobeat', color: '#3F51B5' },
];

interface PillItemProps {
  id: string;
  label: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
  brandColor: string;
  textColor: string;
  borderColor: string;
  isDark: boolean;
}

/**
 * Memoized selection pill providing immediate visual feedback upon interaction.
 */
const PillItem = memo(({ id, label, isSelected, onToggle, brandColor, textColor, borderColor, isDark }: PillItemProps) => {
  return (
    <Pressable
      style={[
        styles.pill,
        { backgroundColor: isSelected ? brandColor : borderColor },
      ]}
      onPress={() => onToggle(id)}
    >
      {isSelected && <Check color="#FFF" size={14} style={{ marginRight: 6 }} />}
      <Text style={[styles.pillText, { color: isSelected ? '#FFF' : textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}, (prevProps, nextProps) => {
  return prevProps.isSelected === nextProps.isSelected &&
    prevProps.id === nextProps.id &&
    prevProps.isDark === nextProps.isDark;
});

interface ExpandableSectionProps {
  title: string;
  initialItems: Array<{ id: string; label: string }>;
  extendedItems: Array<{ id: string; label: string }>;
  selectedItems: string[];
  onToggleItem: (id: string) => void;
  brandColor: string;
  textColor: string;
  borderColor: string;
  surfaceColor: string;
  isDark: boolean;
  isLoading?: boolean;
}

/**
 * Animated collapsible section container managing primary and extended filter items.
 */
const ExpandableSection = memo(({
  title,
  initialItems,
  extendedItems,
  selectedItems,
  onToggleItem,
  brandColor,
  textColor,
  borderColor,
  surfaceColor,
  isDark,
  isLoading = false,
}: ExpandableSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const itemsToRender = useMemo(() => {
    return isExpanded ? [...initialItems, ...extendedItems] : initialItems;
  }, [isExpanded, initialItems, extendedItems]);

  return (
    <Animated.View layout={LinearTransition.duration(200)} style={[styles.card, { backgroundColor: surfaceColor }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
        {isLoading && <ActivityIndicator size="small" color={brandColor} />}
      </View>

      <View style={styles.pillGrid}>
        {itemsToRender.map((item) => (
          <PillItem
            key={item.id}
            id={item.id}
            label={item.label}
            isSelected={selectedItems.includes(item.id)}
            onToggle={onToggleItem}
            brandColor={brandColor}
            textColor={textColor}
            borderColor={borderColor}
            isDark={isDark}
          />
        ))}
      </View>

      {extendedItems.length > 0 && (
        <TouchableOpacity style={styles.moreBtnContainer} onPress={handleToggleExpand}>
          <Text style={[styles.moreBtnText, { color: brandColor }]}>
            {isExpanded ? 'Less' : 'More'}
          </Text>
          {isExpanded ? (
            <ChevronUp color={brandColor} size={16} style={{ marginLeft: 4 }} />
          ) : (
            <ChevronDown color={brandColor} size={16} style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

/**
 * User taste configuration screen governing active languages and genre preferences for tailored recommendation shelf generation.
 */
export function PersonalizeTasteScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const { selectedLanguages, selectedGenres, updatePreferences } = usePreferencesStore();

  const [languages, setLanguages] = useState<string[]>(selectedLanguages);
  const [genres, setGenres] = useState<string[]>(selectedGenres);

  /**
   * Dynamically retrieves live explore shelves from YouTube Music to supplement curated lists.
   */
  const { data: liveExploreShelves, isLoading } = useQuery({
    queryKey: ['liveMoodsAndGenres'],
    queryFn: async () => {
      try {
        const shelves = await HyperExtractor.getExplorePage('FEmusic_moods_and_genres');
        return shelves || [];
      } catch (error) {
        console.warn('[PersonalizeTasteScreen] Dynamic explore shelf retrieval failed:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes cache duration
  });

  /**
   * Filters and deduplicates live items against primary lists to construct the extended view.
   */
  const { extendedLanguages, extendedGenres } = useMemo(() => {
    const liveGenres: Array<{ id: string; label: string }> = [];
    const liveLanguages: Array<{ id: string; label: string }> = [...EXTENDED_LANGUAGES_BACKUP];

    if (liveExploreShelves && liveExploreShelves.length > 0) {
      liveExploreShelves.forEach((shelf: BrowseShelf) => {
        if (shelf.items && shelf.items.length > 0) {
          shelf.items.forEach((item) => {
            if (item.title) {
              const cleanTitle = item.title.trim();
              const id = cleanTitle;

              const isInInitialGenres = INITIAL_GENRES.some(g => g.id.toLowerCase() === id.toLowerCase());
              const isInInitialLang = INITIAL_LANGUAGES.some(l => l.id.toLowerCase() === id.toLowerCase());
              const isInBackupLang = EXTENDED_LANGUAGES_BACKUP.some(l => l.id.toLowerCase() === id.toLowerCase());

              if (!isInInitialGenres && !isInInitialLang && !isInBackupLang) {
                liveGenres.push({ id, label: cleanTitle });
              }
            }
          });
        }
      });
    }

    // Preserve unique items by key
    const uniqueGenres = Array.from(new Map(liveGenres.map(item => [item.id, item])).values());

    return {
      extendedLanguages: liveLanguages,
      extendedGenres: uniqueGenres,
    };
  }, [liveExploreShelves]);

  const toggleLanguage = useCallback((id: string) => {
    setLanguages((prev) =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const toggleGenre = useCallback((id: string) => {
    setGenres((prev) =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const handleSave = useCallback(() => {
    updatePreferences(languages, genres);
    navigation.goBack();
  }, [languages, genres, updatePreferences, navigation]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <Screen disableSafeAreaBottom>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleCancel}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Personalize Taste</Text>
        <TouchableOpacity style={[styles.headerSaveBtn, { backgroundColor: colors.brand }]} onPress={handleSave}>
          <Text style={styles.headerSaveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introContainer}>
          <Text style={[styles.introTitle, { color: colors.text }]}>Update Recommendations</Text>
          <Text style={[styles.introSubtitle, { color: colors.textMuted }]}>
            Adjust your active languages and genres to dynamically shape your home feed and explore shelves.
          </Text>
        </View>

        <ExpandableSection
          title="Languages & Industry"
          initialItems={INITIAL_LANGUAGES}
          extendedItems={extendedLanguages}
          selectedItems={languages}
          onToggleItem={toggleLanguage}
          brandColor={colors.brand}
          textColor={colors.text}
          borderColor={colors.border}
          surfaceColor={colors.surface}
          isDark={isDark}
        />

        <View style={{ marginTop: spacing.lg }}>
          <ExpandableSection
            title="Moods & Genres"
            initialItems={INITIAL_GENRES}
            extendedItems={extendedGenres}
            selectedItems={genres}
            onToggleItem={toggleGenre}
            brandColor={colors.brand}
            textColor={colors.text}
            borderColor={colors.border}
            surfaceColor={colors.surface}
            isDark={isDark}
            isLoading={isLoading}
          />
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
  },
  headerSaveBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSaveText: {
    color: '#FFF',
    fontSize: typography.bodySm,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  introContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  introTitle: {
    fontSize: typography.header,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  introSubtitle: {
    fontSize: typography.bodySm,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    fontWeight: 'bold',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  pillText: {
    fontSize: typography.bodySm,
    fontWeight: '600',
  },
  moreBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  moreBtnText: {
    fontSize: typography.bodySm,
    fontWeight: 'bold',
  },
});
