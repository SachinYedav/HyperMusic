import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, spacing, radius, typography } from '@/theme';
import { MoreVertical, ListMusic } from 'lucide-react-native';
import { Playlist } from '@/features/library/hooks/useLibrary';

interface LibraryPlaylistCardProps {
  playlist: Playlist;
  onPress: (playlist: Playlist) => void;
  onMorePress?: (playlist: Playlist) => void;
}

/**
 * Memoized row entry rendering custom user playlist entities, fallback icon representations, and action triggers.
 */
export const LibraryPlaylistCard: React.FC<LibraryPlaylistCardProps> = React.memo(({ playlist, onPress, onMorePress }) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(playlist)}
      activeOpacity={0.7}
    >
      <View style={[styles.artworkContainer, { backgroundColor: colors.surfaceMuted }]}>
        {playlist.coverUrl ? (
          <Image 
            source={{ uri: playlist.coverUrl }} 
            style={styles.artwork} 
            contentFit="cover"
            transition={200}
          />
        ) : (
          <ListMusic color={colors.textMuted} size={32} />
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
          Playlist
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.moreButton} 
        hitSlop={10}
        onPress={() => onMorePress?.(playlist)}
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
    paddingVertical: spacing.md,
  },
  artworkContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
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
