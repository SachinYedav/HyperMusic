import React, { forwardRef } from 'react';
import { View, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Search, X, ArrowLeft } from 'lucide-react-native';
import { useTheme, spacing, radius, typography } from '@/theme';

interface SearchHeaderProps {
  query: string;
  isLoading: boolean;
  isFocused: boolean;
  onQueryChange: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onFocus: () => void;
  onBackPress: () => void;
}

export const SearchHeader = forwardRef<TextInput, SearchHeaderProps>(({
  query,
  isLoading,
  isFocused,
  onQueryChange,
  onSubmit,
  onClear,
  onFocus,
  onBackPress,
}, ref) => {
  const { colors } = useTheme();

  return (
    <View style={styles.headerContainer}>
      {isFocused && (
        <Pressable hitSlop={12} onPress={onBackPress} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </Pressable>
      )}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: isFocused ? colors.border : 'transparent' }]}>
        {!isFocused && (
          <View style={styles.searchIcon}>
            <Search color={colors.textMuted} size={20} />
          </View>
        )}
        <TextInput
          ref={ref}
          value={query}
          onChangeText={onQueryChange}
          onFocus={onFocus}
          onSubmitEditing={onSubmit}
          placeholder="Search songs, albums, artists..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
          returnKeyType="search"
        />
        {isLoading ? (
          <ActivityIndicator color={colors.textMuted} size="small" />
        ) : null}
        {query ? (
          <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={onClear} style={styles.clearButton}>
            <X color={colors.textMuted} size={18} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.xs,
  },
  searchBar: {
    flex: 1,
    height: 48,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchIcon: {
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.bodyLg,
    minWidth: 0,
    paddingVertical: 0,
  },
  clearButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
