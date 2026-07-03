import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme, spacing, typography, radius } from '@/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '@/navigation/types';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Play, Shuffle, MoreVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getColors } from 'react-native-image-colors';
import { TrackResultCard } from '../../search/components/TrackResultCard';
import { usePlayerStore } from '@/store';
import { BrowseItem, BrowseShelf, ExtractedTrack, HyperExtractor } from 'react-native-hyper-extractor';
import { useQuery } from '@tanstack/react-query';
import { FeedCarousel } from '@/features/home/components/FeedCarousel';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { ErrorState } from '@/ui/ErrorState';

type Props = NativeStackScreenProps<HomeStackParamList, 'ArtistProfile'>;

const HEADER_MAX_HEIGHT = 380;
const HEADER_MIN_HEIGHT = 90;

/**
 * Entity profile workspace managing remote and offline artist catalogs, dynamic background gradients, and top track shelf rendering.
 */
export function ArtistProfileScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { openSheet } = useActionSheetStore();
  const playTrack = usePlayerStore((state) => state.playTrack);
  const playList = usePlayerStore((state) => state.playList);
  const scrollY = useSharedValue(0);
  const [dominantColor, setDominantColor] = useState<string>(colors.border);
  const db = useSafeDatabase();
  const [localTracks, setLocalTracks] = useState<ExtractedTrack[]>([]);
  const isLocal = route.params.isLocal;

  useEffect(() => {
    if (isLocal && route.params.artistName && db) {
      db.getAllAsync<ExtractedTrack>(
        `SELECT * FROM Tracks WHERE (isLiked = 1 OR id IN (SELECT trackId FROM Downloads)) AND artist LIKE ?`,
        [`%${route.params.artistName}%`]
      ).then(setLocalTracks);
    }
  }, [isLocal, route.params.artistName, db]);

  const { data: remoteData, isLoading, error, refetch } = useQuery({
    queryKey: ['artist', route.params.id],
    queryFn: async () => {
      return await HyperExtractor.getArtistProfile(route.params.id);
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: !isLocal,
  });

  const artistData = isLocal ? {
    name: route.params.artistName,
    artworkUrl: localTracks[0]?.artworkUrl || '',
    subtitle: `${localTracks.length} Saved Songs`,
    shelves: []
  } : remoteData;

  useEffect(() => {
    if (artistData?.artworkUrl) {
      getColors(artistData.artworkUrl, {
        fallback: colors.border,
        cache: true,
        key: artistData.artworkUrl,
      }).then((c) => {
        if (c.platform === 'android') {
          setDominantColor(c.dominant || dominantColor);
        } else if (c.platform === 'ios') {
          setDominantColor(c.primary || dominantColor);
        }
      });
    }
  }, [isDark, artistData?.artworkUrl]);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(
        scrollY.value,
        [-100, 0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
        [HEADER_MAX_HEIGHT + 100, HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
        Extrapolation.CLAMP
      ),
    };
  });

  const bannerOpacityStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT - 50],
        [1, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  const titleOpacityStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT - 50, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
        [0, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const handlePlayAction = (shuffle: boolean) => {
    if (isLocal) {
      if (localTracks.length > 0) {
        const tracksToPlay = localTracks.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          duration: t.duration || 0,
          artwork: t.artworkUrl,
          url: ''
        }));
        playList(tracksToPlay as any[], 0, shuffle);
      }
    } else {
      if (!artistData?.shelves) return;
      // Find the first shelf that has songs/videos (usually "Top Songs")
      const songShelf = artistData.shelves.find((shelf: any) =>
        shelf.items && shelf.items.length > 0 &&
        (shelf.items[0].type === 'song' || shelf.items[0].type === 'video')
      );

      if (songShelf) {
        const tracksToPlay = songShelf.items.map((item: any) => ({
          id: item.id,
          title: item.title,
          artist: item.subtitle || artistData.name,
          duration: 0,
          artwork: item.artworkUrl,
          url: ''
        }));
        playList(tracksToPlay as any[], 0, shuffle);
      }
    }
  };

  if (isLoading && !isLocal) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!artistData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ErrorState error={error} onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.header, headerStyle, { zIndex: 10 }]}>
        <LinearGradient
          colors={[dominantColor, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <Animated.View style={[StyleSheet.absoluteFill, bannerOpacityStyle]}>
          <Image
            source={{ uri: artistData.artworkUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', colors.overlayDark]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={[styles.topBar, { marginTop: insets.top }]}>
          <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: colors.overlayLight }]}>
            <ArrowLeft color={colors.white} size={24} />
          </Pressable>
          <Animated.Text style={[styles.stickyTitle, titleOpacityStyle, { color: colors.white }]} numberOfLines={1}>
            {artistData.name}
          </Animated.Text>
          <Pressable
            hitSlop={12}
            style={[styles.iconBtn, { backgroundColor: colors.overlayLight }]}
            onPress={() => openSheet('artist', {
              id: route.params.id,
              name: artistData.name,
              coverUrl: artistData.artworkUrl,
              isLocal: isLocal,
              shelves: artistData.shelves
            })}
          >
            <MoreVertical color={colors.white} size={24} />
          </Pressable>
        </View>

        <Animated.View style={[styles.profileInfo, bannerOpacityStyle]}>
          <Text style={styles.artistName}>{artistData.name}</Text>
          <Text style={[styles.subscriberCount, { color: colors.white, opacity: 0.8 }]}>{artistData.subtitle}</Text>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT, paddingBottom: 170 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.playBtn, { backgroundColor: colors.text }]}
            onPress={() => handlePlayAction(false)}
          >
            <Play color={colors.background} size={20} fill={colors.background} />
            <Text style={[styles.playBtnText, { color: colors.background }]}>Play</Text>
          </Pressable>
          <Pressable
            style={[styles.shuffleBtn, { borderColor: colors.border }]}
            onPress={() => handlePlayAction(true)}
          >
            <Shuffle color={colors.text} size={20} />
            <Text style={[styles.shuffleBtnText, { color: colors.text }]}>Shuffle</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.md }}>
          {isLocal ? (
            <View style={{ paddingHorizontal: spacing.md }}>
              {localTracks.map((track) => (
                <TrackResultCard
                  key={track.id}
                  track={track as any}
                  onPress={() => playTrack(track as any)}
                />
              ))}
            </View>
          ) : (
            artistData?.shelves?.map((shelf: any, index: number) => (
              <FeedCarousel key={index} section={shelf} />
            ))
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  stickyTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  profileInfo: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  artistName: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: '900',
    marginBottom: 4,
  },
  subscriberCount: {
    fontSize: typography.bodySm,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  playBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  playBtnText: {
    fontSize: typography.bodyLg,
    fontWeight: 'bold',
  },
  shuffleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: spacing.sm,
  },
  shuffleBtnText: {
    fontSize: typography.bodyLg,
    fontWeight: 'bold',
  },
  section: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  trackWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  trackIndex: {
    width: 24,
    textAlign: 'center',
    fontSize: typography.body,
    fontWeight: 'bold',
  },
  horizontalScroll: {
    gap: spacing.md,
  },
  albumCard: {
    width: 140,
  },
  albumCover: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  albumTitle: {
    fontSize: typography.body,
    fontWeight: '600',
  },
});
