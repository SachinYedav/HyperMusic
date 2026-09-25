import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
import { ArrowLeft, Play, Shuffle, Share2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useImageColors } from '@/hooks/useImageColors';
import { TrackResultCard } from '../../search/components/TrackResultCard';
import { usePlayerStore } from '@/store';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { useQuery } from '@tanstack/react-query';
import { extractorService } from '@/services/api/extractorService';
import { shareContent } from '@/utils/shareUtils';
import { FeedCarousel } from '@/features/home/components/FeedCarousel';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { ErrorState } from '@/ui/ErrorState';
import { WaveLoader } from '@/ui/WaveLoader';
import { FlashList } from '@shopify/flash-list';
import { getTracksByArtist } from '@/database/queries';
import { useLibraryStore } from '@/store/useLibraryStore';

type Props = NativeStackScreenProps<HomeStackParamList, 'ArtistProfile'>;

const HEADER_MAX_HEIGHT = 380;
const HEADER_MIN_HEIGHT = 90;

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

export function ArtistProfileScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { openSheet } = useActionSheetStore();
  const playTrack = usePlayerStore((state) => state.playTrack);
  const playList = usePlayerStore((state) => state.playList);
  const scrollY = useSharedValue(0);
  const db = useSafeDatabase();
  const [localTracks, setLocalTracks] = useState<ExtractedTrack[]>([]);
  const isSaved = useLibraryStore((state) => state.followedArtistIds.has(route.params.id));
  const isLocal = route.params.isLocal;

  useEffect(() => {
    if (isLocal && route.params.artistName && db) {
      getTracksByArtist(db, route.params.artistName).then(setLocalTracks);
    }
  }, [isLocal, route.params.artistName, db]);

  const { data: remoteData, isLoading, error, refetch } = useQuery({
    queryKey: ['artist', route.params.id],
    queryFn: async ({ signal }) => {
      return await extractorService.getArtistProfile(route.params.id, { signal });
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

  const handleToggleFollow = async () => {
    if (!db || !artistData) return;
    const artistName = artistData.name || route.params.artistName || 'Unknown Artist';
    await useLibraryStore.getState().toggleArtist(db, {
      id: route.params.id,
      name: artistName,
      avatarUrl: artistData.artworkUrl
    });
  };


  const { dominantColor } = useImageColors(artistData?.artworkUrl, { fallback: colors.border });

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

  const optimisticData = isLocal ? {
    name: route.params.artistName,
    artworkUrl: localTracks[0]?.artworkUrl || route.params.artworkUrl || '',
    subtitle: `${localTracks.length} Saved Songs`,
    shelves: []
  } : {
    name: remoteData?.name || route.params.artistName || 'Artist',
    artworkUrl: remoteData?.artworkUrl || route.params.artworkUrl || '',
    subtitle: remoteData?.subtitle || 'Artist',
    shelves: remoteData?.shelves || []
  };

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
      if (!optimisticData.shelves) return;
      const songShelf = optimisticData.shelves.find((shelf: any) =>
        shelf.items && shelf.items.length > 0 &&
        (shelf.items[0].type === 'song' || shelf.items[0].type === 'video')
      );

      if (songShelf) {
        const tracksToPlay = songShelf.items.map((item: any) => ({
          id: item.id,
          title: item.title,
          artist: item.subtitle || optimisticData.name,
          duration: 0,
          artwork: item.artworkUrl,
          url: ''
        }));
        playList(tracksToPlay as any[], 0, shuffle);
      }
    }
  };

  if (isLoading && !isLocal && !route.params.artistName) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <WaveLoader />
      </View>
    );
  }

  if (error && !remoteData && !isLocal) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ErrorState error={error} onRetry={refetch} />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.actionRow}>
      <Pressable
        style={[styles.followBtn, { backgroundColor: isSaved ? 'transparent' : colors.text, borderColor: isSaved ? colors.border : 'transparent', borderWidth: 1 }]}
        onPress={handleToggleFollow}
      >
        <Text style={[styles.followBtnText, { color: isSaved ? colors.text : colors.background }]}>{isSaved ? 'Following' : 'Follow'}</Text>
      </Pressable>
      <View style={styles.playControlsContainer}>
        <Pressable
          hitSlop={10}
          onPress={() => handlePlayAction(true)}
          style={styles.shuffleIconBtn}
        >
          <Shuffle color={colors.text} size={22} />
        </Pressable>
        <Pressable
          hitSlop={10}
          onPress={() => handlePlayAction(false)}
          style={[styles.playIconCircleBtn, { backgroundColor: colors.text }]}
        >
          <Play color={colors.background} size={28} fill={colors.background} style={{ marginLeft: 4 }} />
        </Pressable>
      </View>
    </View>
  );

  const renderListItem = ({ item }: { item: any }) => {
    if (isLocal) {
      return (
        <View style={{ paddingHorizontal: spacing.md }}>
          <TrackResultCard
            track={item as any}
            onPress={() => playTrack(item as any)}
          />
        </View>
      );
    } else {
      return <FeedCarousel section={item} />;
    }
  };
  const displaySubtitle = isLocal
    ? optimisticData.subtitle
    : (optimisticData.subtitle && optimisticData.subtitle !== 'Artist'
      ? (optimisticData.subtitle.toLowerCase().includes('listener') || optimisticData.subtitle.toLowerCase().includes('subscriber') || optimisticData.subtitle.toLowerCase().includes('song')
        ? optimisticData.subtitle
        : `${optimisticData.subtitle} monthly listeners`)
      : 'Artist');

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
          {optimisticData.artworkUrl ? (
            <Image
              source={{ uri: optimisticData.artworkUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : null}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', colors.background]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={[styles.topBar, { marginTop: insets.top }]}>
          <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={styles.iconBtnDirect}>
            <ArrowLeft color={colors.white} size={28} />
          </Pressable>
          <Animated.Text style={[styles.stickyTitle, titleOpacityStyle, { color: colors.white }]} numberOfLines={1}>
            {optimisticData.name}
          </Animated.Text>
          <Pressable
            hitSlop={12}
            style={styles.iconBtnDirect}
            onPress={() => shareContent('artist', route.params.id, optimisticData.name || '')}
          >
            <Share2 color={colors.white} size={24} />
          </Pressable>
        </View>

        <Animated.View style={[styles.profileInfo, bannerOpacityStyle]}>
          <Text style={[styles.artistName, { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>{optimisticData.name}</Text>
          <Text style={[styles.subscriberCount, { color: colors.white, opacity: 0.8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>{displaySubtitle}</Text>
        </Animated.View>
      </Animated.View>

      <AnimatedFlashList
        data={isLocal ? localTracks : optimisticData.shelves}
        renderItem={renderListItem}
        // @ts-ignore 
        estimatedItemSize={isLocal ? 70 : 300}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={isLoading && !isLocal ? <WaveLoader /> : undefined}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT, paddingBottom: 170 }}
        showsVerticalScrollIndicator={false}
      />
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
  iconBtnDirect: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 44,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subscriberCount: {
    fontSize: typography.bodySm,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  followBtn: {
    width: '50%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtnText: {
    fontSize: typography.body,
    fontWeight: 'bold',
  },
  playControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  shuffleIconBtn: {
    padding: spacing.xs,
  },
  playIconCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
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
