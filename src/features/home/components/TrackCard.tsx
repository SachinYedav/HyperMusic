import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BrowseItem } from 'react-native-hyper-extractor';
import { useTheme, spacing, radius, typography } from '@/theme';
import { usePlayerStore } from '@/store';
import { AnimatedEQ } from '@/ui/AnimatedEQ';
import { MoreVertical } from 'lucide-react-native';
import { useActionSheetStore } from '@/store/useActionSheetStore';

interface TrackCardProps {
  track: BrowseItem;
  onPress: (track: BrowseItem) => void;
}

const { width } = Dimensions.get('window');

/**
 * Multi-format item card rendering dedicated widescreen video banners, square podcast layouts, and circular artist thumbnails.
 */
export const TrackCard = React.memo(({ track, onPress }: TrackCardProps) => {
  const { colors } = useTheme();
  const isPlaying = usePlayerStore(state => state.activeTrack?.id === track.id && (track.type === 'song' || track.type === 'video' || track.type === 'podcast'));

  const isVideo = track.type === 'video';
  const isPodcast = track.type === 'podcast';
  const isArtist = track.type === 'artist';

  if (isVideo) {
    const videoWidth = width * 0.88;
    return (
      <TouchableOpacity
        style={[styles.container, { width: videoWidth }]}
        onPress={() => onPress(track)}
        activeOpacity={0.8}
      >
        <View style={[styles.premiumBanner, { width: videoWidth, aspectRatio: 16 / 9, borderRadius: 16 }]}>
          <Image source={track.artworkUrl} style={styles.bannerImage} contentFit="cover" transition={200} />
          <LinearGradient colors={[colors.overlayLight, 'transparent', colors.overlayDark]} style={styles.gradient} />

          <View style={styles.badgeContainer}>
            {isPlaying ? <AnimatedEQ isOverlay={false} /> : <View />}
          </View>

          <View style={styles.bannerInfo}>
            <Text style={[styles.bannerTitle, { color: colors.white }]} numberOfLines={2}>{track.title}</Text>
            <Text style={[styles.bannerSubtitle, { color: colors.white, opacity: 0.75 }]} numberOfLines={1}>{track.subtitle}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (isPodcast) {
    const podcastWidth = width * 0.85;
    return (
      <TouchableOpacity
        style={[styles.container, { width: podcastWidth }]}
        onPress={() => onPress(track)}
        activeOpacity={0.8}
      >
        <View style={[styles.premiumBanner, { width: podcastWidth, aspectRatio: 16 / 9, borderRadius: 20 }]}>
          <Image source={track.artworkUrl} style={styles.bannerImage} contentFit="cover" transition={200} />
          <LinearGradient colors={[colors.overlayLight, 'transparent', colors.overlayDark]} style={styles.gradient} />

          <View style={styles.badgeContainer}>
            {isPlaying ? <AnimatedEQ isOverlay={false} /> : <View />}
          </View>

          <View style={styles.bannerInfo}>
            <Text style={[styles.bannerTitle, { color: colors.white }]} numberOfLines={2}>{track.title}</Text>
            <Text style={[styles.bannerSubtitle, { color: colors.white, opacity: 0.75 }]} numberOfLines={1}>{track.subtitle}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { width: 140 }]}
      onPress={() => onPress(track)}
      activeOpacity={0.7}
    >
      <View style={{ width: 140, height: 140, overflow: 'hidden', borderRadius: isArtist ? 70 : radius.md }}>
        <Image
          source={track.artworkUrl}
          style={[
            { width: '100%', height: '100%', backgroundColor: colors.border },
            isArtist && { borderRadius: 70 }
          ]}
          contentFit="cover"
          transition={200}
        />
        {isPlaying && <AnimatedEQ isOverlay />}
      </View>
      <View style={[styles.infoContainer, { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }]}>
        <View style={{ flex: 1, paddingRight: 4 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {track.title}
          </Text>
          <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>
            {track.subtitle}
          </Text>
        </View>
        {(track.type === 'song' || track.type === 'video' || track.type === 'podcast') && (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              const contextType = (track.type === 'song' || track.type === 'video') ? 'track' : track.type as any;
              useActionSheetStore.getState().openSheet(
                contextType,
                {
                  id: track.id,
                  title: track.title,
                  name: track.title,
                  artist: track.subtitle,
                  artworkUrl: track.artworkUrl,
                  coverUrl: track.artworkUrl,
                  albumId: undefined,
                  artistId: undefined
                }
              );
            }}
          >
            <MoreVertical color={colors.textMuted} size={18} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.md,
  },

  premiumBanner: {
    overflow: 'hidden',
    backgroundColor: '#222',
    justifyContent: 'space-between',
  },
  bannerImage: {
    ...StyleSheet.absoluteFill as any,
  },
  gradient: {
    ...StyleSheet.absoluteFill as any,
  },
  badgeContainer: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  bannerInfo: {
    padding: spacing.md,
  },
  bannerTitle: {
    fontSize: typography.bodyLg,
    fontWeight: 'bold',
    marginBottom: 2,
    lineHeight: 22,
  },
  bannerSubtitle: {
    fontSize: typography.bodySm,
  },
  infoContainer: {
    marginTop: spacing.sm,
  },
  title: {
    fontSize: typography.bodySm,
    fontWeight: '600',
    lineHeight: 18,
  },
  artist: {
    fontSize: typography.captionLg,
    marginTop: 2,
  },
});
