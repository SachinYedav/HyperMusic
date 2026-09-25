import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';

import { X } from 'lucide-react-native';

interface Props {
  selected: string | null;
  onSelect: (filter: string | null) => void;
}

const FILTERS = ['History', 'Downloads', 'Playlists', 'Albums', 'Artists', 'From Device'];

/**
 * Memoized filter group governing view categorization toggles between history, playlists, tracks, albums, and artists.
 */
export const LibraryFilterChips: React.FC<Props> = React.memo(({ selected, onSelect }) => {
  const { colors } = useTheme();

  const handlePress = (filter: string) => {
    onSelect(selected === filter ? null : filter);
  };

  const displayFilters = React.useMemo(() => {
    if (!selected) return FILTERS;
    return [selected, ...FILTERS.filter(f => f !== selected)];
  }, [selected]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={{ flexGrow: 0 }}
    >
      {selected !== null && (
        <TouchableOpacity
          onPress={() => onSelect(null)}
          style={[
            styles.chip,
            styles.clearChip,
            {
              backgroundColor: 'transparent',
              borderColor: colors.border,
            }
          ]}
        >
          <X color={colors.text} size={18} />
        </TouchableOpacity>
      )}
      {displayFilters.map((filter) => {
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
                  : 'transparent',
                borderColor: colors.border,
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
  clearChip: {
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
