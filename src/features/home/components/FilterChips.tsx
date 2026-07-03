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
    // Unique combined list with fixed base and podcasts at the end
    const combined = ['All', ...selectedLanguages, ...selectedGenres, 'Podcasts'];
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
                  : colors.surfaceMuted,
                borderColor: isDark ? colors.border : '#CCC',
              }
            ]}
          >
            <Text
              style={[
                styles.text,
                {
                  color: isSelected
                    ? (isDark ? colors.background : colors.white)
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  text: {
    fontSize: typography.bodySm,
    fontWeight: '600',
  },
});
