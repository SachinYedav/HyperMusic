import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, spacing, radius, typography } from '@/theme';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { MoreVertical } from 'lucide-react-native';

interface LibraryListItemProps {
  track: ExtractedTrack;
  onPress: (track: ExtractedTrack) => void;
  onMorePress?: (track: ExtractedTrack) => void;
}

/**
 * Memoized row entry rendering individual cached track entities, cover art transitions, and action triggers.
 */
export const LibraryListItem: React.FC<LibraryListItemProps> = React.memo(({ track, onPress, onMorePress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(track)}
      activeOpacity={0.7}
    >
      <Image 
        source={track.artworkUrl} 
        style={[styles.artwork, { backgroundColor: colors.border }]} 
        contentFit="cover"
        transition={200}
      />
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.moreButton} 
        hitSlop={10}
        onPress={() => {
          if (onMorePress) {
            onMorePress(track);
          } else {
            import('react-native').then(({ Alert }) => {
              Alert.alert('Options', `Remove ${track.title} from Liked or Add to Playlist? (WIP)`);
            });
          }
        }}
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
  artwork: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.body,
    fontWeight: '500',
  },
  artist: {
    fontSize: typography.captionLg,
    marginTop: 2,
  },
  moreButton: {
    padding: spacing.xs,
  },
});
