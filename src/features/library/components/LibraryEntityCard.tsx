import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableHighlight } from 'react-native';
import { PremiumImage } from '@/ui/PremiumImage';
import { useTheme, spacing, radius, typography } from '@/theme';
import { MoreVertical } from 'lucide-react-native';

interface LibraryEntityCardProps {
  type: 'playlist' | 'album' | 'artist';
  item: any;
  onPress: () => void;
  onMorePress?: () => void;
}

/**
 * Unified row entry for rendering Library entities (Playlists, Albums, Artists).
 * Resolves previous UI inconsistencies (padding, radius, typography) by centralizing the layout.
 */
export const LibraryEntityCard: React.FC<LibraryEntityCardProps> = React.memo(({ type, item, onPress, onMorePress }) => {
  const { colors } = useTheme();

  // Normalize data fields across entity types
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

  // Styling variants
  const isRound = type === 'artist';

  return (
    <TouchableHighlight
      style={{ borderRadius: radius.sm, overflow: 'hidden' }}
      onPress={onPress}
      onLongPress={onMorePress}
      activeOpacity={0.6}
      underlayColor={colors.brand + '40'}
    >
      <View style={styles.container}>
        <View style={[
          styles.artworkContainer,
          {
            backgroundColor: colors.surfaceMuted,
            borderRadius: isRound ? radius.full : radius.xs
          }
        ]}>
          <PremiumImage
            source={artworkUrl ? { uri: artworkUrl } : undefined}
            contextType={type}
            style={styles.artwork}
            fallbackIconSize={32}
          />
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {onMorePress && (
          <TouchableOpacity
            style={styles.moreButton}
            hitSlop={10}
            onPress={onMorePress}
          >
            <MoreVertical color={colors.text} size={20} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableHighlight>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  artworkContainer: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.bodyLg,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: typography.bodySm,
  },
  moreButton: {
    padding: spacing.xs,
  },
});
