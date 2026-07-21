import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, spacing, radius, typography } from '@/theme';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { MoreVertical, Trash2 } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';

interface LibraryListItemProps {
  track: ExtractedTrack;
  onPress: (track: ExtractedTrack) => void;
  onMorePress?: (track: ExtractedTrack) => void;
  onDelete?: (track: ExtractedTrack) => void;
}

/**
 * Memoized row entry rendering individual cached track entities, cover art transitions, and action triggers.
 * Includes Swipe-to-Delete functionality if onDelete is provided.
 */
export const LibraryListItem: React.FC<LibraryListItemProps> = React.memo(({ track, onPress, onMorePress, onDelete }) => {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (progress: RNAnimated.AnimatedInterpolation<number>, dragX: RNAnimated.AnimatedInterpolation<number>) => {
    if (!onDelete) return null;

    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    const bgOpacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.3], 
    });

    return (
      <View style={{ width: 80, height: '100%' }}>
        <RNAnimated.View 
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 2000,
            backgroundColor: colors.error,
            opacity: bgOpacity
          }}
        />
        <RNAnimated.View style={{ height: '100%', opacity: progress }}>
          <RectButton 
            style={[styles.deleteAction, { backgroundColor: colors.error, height: '100%' }]}
            onPress={() => {
              swipeableRef.current?.close();
              onDelete(track);
            }}
          >
            <RNAnimated.View style={[styles.deleteActionContent, { transform: [{ scale: trans }] }]}>
              <Trash2 color={colors.text} size={24} />
            </RNAnimated.View>
          </RectButton>
        </RNAnimated.View>
      </View>
    );
  };

  const ListItemContent = (
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

  if (onDelete) {
    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
      >
        {ListItemContent}
      </Swipeable>
    );
  }

  return ListItemContent;
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
    borderRadius: radius.xs,
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
  deleteAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
