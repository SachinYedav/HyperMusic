import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTheme, spacing, typography } from '@/theme';
import { QuickPreviewCard } from './QuickPreviewCard';

interface QuickPreviewShelfProps {
  section: any;
}

export const QuickPreviewShelf = React.memo(({ section }: QuickPreviewShelfProps) => {
  const { colors } = useTheme();

  if (!section.items || section.items.length === 0) return null;

  return (
    <View style={styles.container}>
      {section.title && (
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {section.title}
        </Text>
      )}
      <FlatList
        data={section.items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item: any, index: number) => item.id + '-' + index}
        renderItem={({ item }) => <QuickPreviewCard shelf={item} isSingleCard={section.items.length === 1} />}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  }
});
