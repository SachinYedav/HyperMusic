import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';
import { usePreferencesStore } from '@/store';

interface FilterChipsProps {
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
}

/**
 * Horizontal filter carousel computing deduplicated user preference tags for home feed shelf filtering.
 */
export const FilterChips: React.FC<FilterChipsProps> = ({ selectedFilter, onSelectFilter }) => {
  const { colors, isDark } = useTheme();
  const { selectedLanguages, selectedGenres } = usePreferencesStore();

  const filters = useMemo(() => {
    // Unique combined list with 'New' and 'Podcasts' immediately following All
    const combined = ['All', 'New', 'Podcasts', ...selectedLanguages, ...selectedGenres];
    return Array.from(new Set(combined));
  }, [selectedLanguages, selectedGenres]);

  const handlePress = (filter: string) => {
    onSelectFilter(filter);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((filter) => {
        const isSelected = selectedFilter === filter;

        return (
          <TouchableOpacity
            key={filter}
            onPress={() => handlePress(filter)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? colors.text
                  : colors.background,
                borderColor: isDark ? colors.border : '#CCC',
              }
            ]}
          >
            <Text
              style={[
                styles.text,
                {
                  color: isSelected
                    ? colors.background
                    : colors.text,
                }
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  text: {
    fontSize: typography.bodySm,
    fontWeight: '600',
  },
});
