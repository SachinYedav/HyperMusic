import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, typography, spacing } from '@/theme';
import { LayoutGrid, List, ArrowDownUp } from 'lucide-react-native';

export type SortMode = 'Recent' | 'Alphabetical';
export type ViewMode = 'list' | 'grid';

interface LibrarySortBarProps {
  sortMode: SortMode;
  viewMode: ViewMode;
  onSortChange: (mode: SortMode) => void;
  onViewChange: (mode: ViewMode) => void;
  showViewToggle?: boolean;
}

export const LibrarySortBar: React.FC<LibrarySortBarProps> = ({
  sortMode,
  viewMode,
  onSortChange,
  onViewChange,
  showViewToggle = true,
}) => {
  const { colors } = useTheme();

  const handleSortPress = () => {
    onSortChange(sortMode === 'Recent' ? 'Alphabetical' : 'Recent');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.sortButton}
        onPress={handleSortPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ArrowDownUp color={colors.text} size={16} />
        <Text style={[styles.sortText, { color: colors.text }]}>
          {sortMode === 'Recent' ? 'Recently Added' : 'Alphabetical (A-Z)'}
        </Text>
      </TouchableOpacity>

      {showViewToggle && (
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => onViewChange(viewMode === 'list' ? 'grid' : 'list')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {viewMode === 'list' ? (
            <LayoutGrid color={colors.text} size={20} />
          ) : (
            <List color={colors.text} size={20} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sortText: {
    fontSize: typography.bodySm,
    fontWeight: '500',
  },
  viewButton: {
    padding: spacing.xs,
  },
});
