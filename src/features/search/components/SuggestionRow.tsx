import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme, spacing, typography } from '@/theme';
import { getHighlightedSearchParts } from '../utils/searchHighlight';

export type SuggestionRowProps = {
  suggestion: string;
  query: string;
  onPress: () => void;
};

export const SuggestionRow = React.memo(function SuggestionRow({ suggestion, query: currentQuery, onPress }: SuggestionRowProps) {
  const { colors } = useTheme();
  const parts = getHighlightedSearchParts(suggestion, currentQuery);
  
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Search color={colors.textMuted} size={18} />
      <View style={styles.rowCopy}>
        <Text style={{ color: colors.text }} numberOfLines={1}>
          {parts.map((part, index) => (
            <Text
              key={`${part.text}-${index}`}
              style={part.isMatch ? styles.highlightBold : undefined}
            >
              {part.text}
            </Text>
          ))}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  rowCopy: {
    flex: 1,
    flexDirection: 'column',
  },
  highlightBold: {
    fontWeight: 'bold',
  },
});
