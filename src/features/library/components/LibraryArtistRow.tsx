import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';
import { MoreVertical, User } from 'lucide-react-native';
import { ArtistSummary } from '@/features/library/hooks/useLibrary';

interface LibraryArtistRowProps {
  artist: ArtistSummary;
  onPress: (artist: ArtistSummary) => void;
  onMorePress?: (artist: ArtistSummary) => void;
}

/**
 * Memoized artist representation rendering aggregated track counts and circular avatar representations.
 */
export const LibraryArtistRow: React.FC<LibraryArtistRowProps> = React.memo(({ artist, onPress, onMorePress }) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(artist)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatarContainer, { backgroundColor: colors.surfaceMuted }]}>
        <User color={colors.textMuted} size={28} />
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {artist.artist}
        </Text>
        <Text style={[styles.trackCount, { color: colors.textMuted }]} numberOfLines={1}>
          {artist.trackCount} {artist.trackCount === 1 ? 'song' : 'songs'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.moreButton}
        hitSlop={10}
        onPress={() => onMorePress?.(artist)}
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
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  name: {
    fontSize: typography.bodyLg,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackCount: {
    fontSize: typography.bodySm,
  },
  moreButton: {
    padding: spacing.xs,
  },
});
