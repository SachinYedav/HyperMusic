import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, spacing, radius, typography } from '@/theme';
import { MoreVertical, Disc } from 'lucide-react-native';
import { Album } from '@/features/library/hooks/useLibrary';

interface LibraryAlbumCardProps {
  album: Album;
  onPress: (album: Album) => void;
  onMorePress?: (album: Album) => void;
}

/**
 * Memoized row representation rendering cached local album entities, disc fallback placeholders, and action sheet triggers.
 */
export const LibraryAlbumCard: React.FC<LibraryAlbumCardProps> = React.memo(({ album, onPress, onMorePress }) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(album)}
      activeOpacity={0.7}
    >
      <View style={[styles.artworkContainer, { backgroundColor: colors.surfaceMuted }]}>
        {album.coverUrl ? (
          <Image
            source={{ uri: album.coverUrl }}
            style={styles.artwork}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Disc color={colors.textMuted} size={32} />
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {album.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
          Album {album.artist ? `• ${album.artist}` : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.moreButton}
        hitSlop={10}
        onPress={() => onMorePress?.(album)}
      >
        <MoreVertical color={colors.text} size={20} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  artworkContainer: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.caption,
  },
  moreButton: {
    padding: spacing.xs,
  },
});
