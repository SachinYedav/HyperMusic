import React from 'react';
import { View, Text, StyleSheet, TouchableHighlight, useWindowDimensions } from 'react-native';
import { PremiumImage } from '@/ui/PremiumImage';
import { useTheme, spacing, radius, typography } from '@/theme';

interface LibraryGridCardProps {
  type: 'playlist' | 'album' | 'artist';
  item: any;
  onPress: () => void;
  onMorePress?: () => void;
}

export const LibraryGridCard: React.FC<LibraryGridCardProps> = React.memo(({ type, item, onPress, onMorePress }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const cardWidth = (width - spacing.md * 2 - spacing.md) / 2;
  const title = item.name || item.title || 'Unknown';

  let subtitle = '';
  if (type === 'artist') {
    subtitle = item.subscriberCount ? `${item.subscriberCount} subscribers` : 'Artist';
  } else if (type === 'album') {
    subtitle = item.trackCount !== undefined ? `Album • ${item.trackCount} song${item.trackCount === 1 ? '' : 's'}` : (item.artist || 'Album');
  } else {
    subtitle = item.trackCount !== undefined ? `Playlist • ${item.trackCount} song${item.trackCount === 1 ? '' : 's'}` : 'Playlist';
  }
  const artworkUrl = item.avatarUrl || item.coverUrl;

  const isRound = type === 'artist';

  return (
    <TouchableHighlight
      style={[styles.container, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.6}
      underlayColor={colors.brand + '40'}
      onLongPress={onMorePress}
    >
      <View style={{ width: '100%' }}>
        <View style={[
          styles.artworkContainer,
          {
            backgroundColor: colors.surfaceMuted,
            borderRadius: isRound ? 999 : radius.sm,
          }
        ]}>
          <PremiumImage
            source={artworkUrl ? { uri: artworkUrl } : undefined}
            contextType={type}
            style={styles.artwork}
            fallbackIconSize={cardWidth * 0.4}
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </TouchableHighlight>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    padding: spacing.xs,
    borderRadius: radius.sm
  },
  artworkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: spacing.sm,
    aspectRatio: 1,
    width: '100%',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: typography.body,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.captionLg,
    textAlign: 'center',
  },
});
