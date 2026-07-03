import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';

interface Props {
  selected: string | null;
  onSelect: (filter: string) => void;
}

const FILTERS = ['History', 'Playlists', 'Songs', 'Albums', 'Artists'];

/**
 * Memoized filter group governing view categorization toggles between history, playlists, tracks, albums, and artists.
 */
export const LibraryFilterChips: React.FC<Props> = React.memo(({ selected, onSelect }) => {
  const { colors, isDark } = useTheme();

  const handlePress = (filter: string) => {
    onSelect(selected === filter ? 'Songs' : filter);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={{ flexGrow: 0 }}
    >
      {FILTERS.map((filter) => {
        const isSelected = selected === filter;

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
                  color: isSelected ? colors.background : colors.text,
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
});

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
