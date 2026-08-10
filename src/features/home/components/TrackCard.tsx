import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableHighlight, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrowseItem } from 'react-native-hyper-extractor';
import { useTheme, spacing, radius, typography } from '@/theme';
import { usePlayerStore } from '@/store';
import { AnimatedEQ } from '@/ui/AnimatedEQ';
import { PremiumImage } from '@/ui/PremiumImage';
import { MoreVertical } from 'lucide-react-native';
import { useActionSheetStore } from '@/store/useActionSheetStore';

interface TrackCardProps {
  track: BrowseItem;
  onPress: (track: BrowseItem) => void;
  onLongPress?: (track: BrowseItem) => void;
}

const { width } = Dimensions.get('window');

/**
 * Multi-format item card rendering dedicated widescreen video banners, square podcast layouts, and circular artist thumbnails.
 */
export const TrackCard = React.memo(({ track, onPress, onLongPress }: TrackCardProps) => {
  const { colors } = useTheme();
  const isPlaying = usePlayerStore(state => state.activeTrack?.id === track.id && (track.type === 'song' || track.type === 'video' || track.type === 'podcast'));

  const isVideo = track.type === 'video';
  const isPodcast = track.type === 'podcast';
  const isArtist = track.type === 'artist';

  if (isVideo) {
    const videoWidth = width * 0.88;
    return (
      <TouchableHighlight
        style={[styles.container, { width: videoWidth, borderRadius: radius.sm }]}
        onPress={() => onPress(track)}
        onLongPress={() => onLongPress?.(track)}
        activeOpacity={0.6}
        underlayColor={colors.brand + '40'}
      >
        <View style={[styles.premiumBanner, { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.sm }]}>
          <PremiumImage source={{ uri: track.artworkUrl }} contextType="track" fallbackIconSize={32} style={styles.bannerImage} />
          <LinearGradient colors={[colors.overlayLight, 'transparent', colors.overlayDark]} style={styles.gradient} />

          <View style={styles.badgeContainer}>
            {isPlaying ? <AnimatedEQ isOverlay={false} /> : <View />}
          </View>

          <View style={styles.bannerInfo}>
            <Text style={[styles.bannerTitle, { color: colors.white }]} numberOfLines={2}>{track.title}</Text>
            <Text style={[styles.bannerSubtitle, { color: colors.white, opacity: 0.75 }]} numberOfLines={1}>{track.subtitle}</Text>
          </View>
        </View>
      </TouchableHighlight>
    );
  }

  if (isPodcast) {
    const podcastWidth = width * 0.85;
    return (
      <TouchableHighlight
        style={[styles.container, { width: podcastWidth, borderRadius: radius.sm }]}
        onPress={() => onPress(track)}
        onLongPress={() => onLongPress?.(track)}
        activeOpacity={0.6}
        underlayColor={colors.brand + '40'}
      >
        <View style={[styles.premiumBanner, { width: '100%', aspectRatio: 1, borderRadius: radius.md }]}>
          <PremiumImage source={{ uri: track.artworkUrl }} contextType="podcast" fallbackIconSize={48} style={styles.bannerImage} />
          <LinearGradient colors={[colors.overlayLight, 'transparent', colors.overlayDark]} style={styles.gradient} />

          <View style={styles.badgeContainer}>
            {isPlaying ? <AnimatedEQ isOverlay={false} /> : <View />}
          </View>

          <View style={styles.bannerInfo}>
            <Text style={[styles.bannerTitle, { color: colors.white }]} numberOfLines={2}>{track.title}</Text>
            <Text style={[styles.bannerSubtitle, { color: colors.white, opacity: 0.75 }]} numberOfLines={1}>{track.subtitle}</Text>
          </View>
        </View>
      </TouchableHighlight>
    );
  }

  return (
    <TouchableHighlight
      style={[styles.container, { width: 140, borderRadius: isArtist ? radius.lg : radius.sm }]}
      onPress={() => onPress(track)}
      onLongPress={() => onLongPress?.(track)}
      activeOpacity={0.6}
      underlayColor={colors.brand + '40'}
    >
      <View style={{ width: '100%' }}>
      <View style={{ width: '100%', aspectRatio: 1, overflow: 'hidden', borderRadius: isArtist ? 70 : radius.sm }}>
        <PremiumImage
          source={{ uri: track.artworkUrl }}
          contextType={(track.type === 'song' || track.type === 'video') ? 'track' : (track.type as any)}
          style={[
            { width: '100%', height: '100%', backgroundColor: colors.border },
            isArtist && { borderRadius: 70 }
          ]}
          fallbackIconSize={32}
        />
        {isPlaying && <AnimatedEQ isOverlay />}
      </View>
      <View style={[styles.infoContainer, { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }]}>
        <View style={{ flex: 1, paddingRight: 4 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {track.title}
          </Text>
          <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>
            {track.subtitle}{(track as any).album && !track.subtitle.includes((track as any).album) ? ` • ${(track as any).album}` : ''}
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
                  albumId: (track as any).albumId,
                  artistId: (track as any).artistId,
                  artists: (track as any).artists,
                  album: (track as any).album
                }
              );
            }}
          >
            <MoreVertical color={colors.textMuted} size={18} />
          </TouchableOpacity>
        )}
      </View>
      </View>
    </TouchableHighlight>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.sm,
    padding: 2,
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
