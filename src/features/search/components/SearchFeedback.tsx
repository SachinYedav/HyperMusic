import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Search, SearchX } from 'lucide-react-native';
import { useTheme, spacing, typography } from '@/theme';
import { ErrorState } from '@/ui/ErrorState';

type FeedbackVariant = 'offline' | 'error' | 'empty' | 'no-results' | 'no-suggestions' | 'searching' | 'initial';

interface SearchFeedbackProps {
  item: {
    variant: FeedbackVariant;
    message?: string;
    subMessage?: string;
    onRetry?: () => void;
  };
}

export function SearchFeedback({ item }: SearchFeedbackProps) {
  const { colors } = useTheme();

  if (item.variant === 'offline') {
    return (
      <ErrorState
        variant="offline"
        title={item.message || "You're offline"}
        subtitle={item.subMessage || "Check your connection and try again."}
        onRetry={item.onRetry}
        containerStyle={{ paddingTop: 100 }}
      />
    );
  }
  if (item.variant === 'error') {
    return (
      <ErrorState
        variant="server_error"
        title={item.message || "Search Failed"}
        subtitle={item.subMessage || "We encountered an unexpected issue performing this search."}
        onRetry={item.onRetry}
        containerStyle={{ paddingTop: 100 }}
      />
    );
  }
  if (item.variant === 'no-results') {
    return (
      <View style={styles.centerState}>
        <SearchX color={colors.textMuted} size={48} />
        <Text style={[styles.subtitle, { color: colors.text }]}>No results found</Text>
        <Text style={[styles.muted, { color: colors.textMuted }]}>Try searching for something else.</Text>
      </View>
    );
  }
  if (item.variant === 'initial') {
    return (
      <View style={styles.centerState}>
        <Search color={colors.textMuted} size={48} />
        <Text style={[styles.subtitle, { color: colors.text }]}>Search HyperMusic</Text>
        <Text style={[styles.muted, { color: colors.textMuted }]}>Find your favorite songs, artists, and playlists.</Text>
      </View>
    );
  }
  if (item.variant === 'searching') {
    return (
      <View style={styles.centerState}>
        <Text style={[styles.muted, { color: colors.textMuted }]}>Searching...</Text>
      </View>
    );
  }
  if (item.variant === 'no-suggestions' || item.variant === 'empty') {
    return (
      <View style={styles.panelMessage}>
        <Text style={[styles.caption, { color: colors.textMuted }]}>{item.message}</Text>
        {item.subMessage && <Text style={[styles.caption, { color: colors.textMuted }]}>{item.subMessage}</Text>}
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  centerState: {
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    textAlign: 'center',
  },
  panelMessage: {
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
  },
  muted: {
    fontSize: typography.body,
  },
  caption: {
    fontSize: typography.captionLg,
  },
});
