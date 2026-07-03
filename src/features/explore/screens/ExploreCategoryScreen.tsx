import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image as RNImage } from 'react-native';
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
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { FeedCarousel } from '@/features/home/components/FeedCarousel';
import { HeroBannerCard } from '@/features/home/components/HeroBannerCard';
import { TrackResultCard } from '@/features/search/components/TrackResultCard';
import { useExplorePage } from '../hooks/useExplorePage';
import { BrowseItem, BrowseShelf } from 'react-native-hyper-extractor';
import { usePlayerStore } from '@/store';
import { Image } from 'expo-image';
import { ErrorState } from '@/ui/ErrorState';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

type Props = NativeStackScreenProps<HomeStackParamList, 'ExploreCategory'>;

const HEADER_MAX_HEIGHT = 280;
const HEADER_MIN_HEIGHT = 90;

/**
 * Screen presenting tailored exploration feeds for specific catalog categories, featuring dynamic parallax headers.
 */
export function ExploreCategoryScreen({ navigation, route }: Props) {
  const { title, categoryId } = route.params;
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const playTrack = usePlayerStore(state => state.playTrack);

  const { data: shelves, isLoading, isError, error, refetch } = useExplorePage(categoryId);

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

  const titleOpacityStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT - 40, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
        [0, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const largeTitleOpacityStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT - 20],
        [1, 0],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
            [0, -20],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  // Extract a cinematic cover image from the first item
  const coverImage = useMemo(() => {
    if (shelves && shelves.length > 0 && shelves[0].items.length > 0) {
      // Find the first shelf with an artwork
      for (const shelf of shelves) {
        if (shelf.items && shelf.items.length > 0 && shelf.items[0].artworkUrl) {
          // We might want an artist image or album image
          return shelf.items[0].artworkUrl.replace('w120-h120', 'w800-h800').replace('w226-h226', 'w800-h800');
        }
      }
    }
    return null;
  }, [shelves]);

  const renderSection = React.useCallback(({ item }: { item: any }) => {
    if (item.type === 'list') {
      return (
        <View style={styles.listSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{item.title}</Text>
          {item.items?.map((browseItem: BrowseItem, index: number) => {
            const mappedTrack: any = {
              id: browseItem.id,
              title: browseItem.title,
              artist: browseItem.subtitle,
              duration: 0,
              artworkUrl: browseItem.artworkUrl,
              artistId: browseItem.type === 'artist' ? browseItem.id : undefined,
            };
            return (
              <TrackResultCard
                key={browseItem.id + index}
                track={mappedTrack}
                onPress={() => {
                  if (browseItem.type === 'song' || browseItem.type === 'video' || browseItem.type === 'podcast') {
                    playTrack({ ...mappedTrack, artwork: browseItem.artworkUrl, url: '' });
                  } else if (browseItem.type === 'album') {
                    navigation.navigate('AlbumDetails', { id: browseItem.id });
                  } else if (browseItem.type === 'playlist') {
                    navigation.navigate('PlaylistDetails', { id: browseItem.id });
                  } else if (browseItem.type === 'artist') {
                    navigation.navigate('ArtistProfile', { id: browseItem.id });
                  }
                }}
              />
            );
          })}
        </View>
      );
    }

    if (item.type === 'grid' && item.items?.length > 0 && (item.items[0].type === 'playlist' || item.items[0].type === 'album')) {
      return <HeroBannerCard section={item} />;
    }

    if (item.type === 'grid' && item.items?.length > 0 && (item.items[0].type === 'video' || item.items[0].type === 'podcast')) {
      return <FeedCarousel section={item} />;
    }

    if (item.type === 'grid' && item.items?.length > 0 && item.items[0].type === 'genre') {
      return (
        <View style={styles.gridSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{item.title}</Text>
          <View style={styles.tileGrid}>
            {item.items.map((browseItem: BrowseItem, idx: number) => {
              const colorPalette = ['#8A2BE2', colors.brand, '#FF8C00', '#2E8B57', '#008080', '#4169E1', '#C71585', '#D2691E'];
              const tileColor = colorPalette[idx % colorPalette.length];

              return (
                <Pressable
                  key={browseItem.id + idx}
                  style={[styles.genreTile, { backgroundColor: tileColor }]}
                  onPress={() => {
                    if (browseItem.type === 'genre') {
                      (navigation as any).push('ExploreCategory', { categoryId: browseItem.id, title: browseItem.title });
                    } else if (browseItem.type === 'song' || browseItem.type === 'video' || browseItem.type === 'podcast') {
                      playTrack({ id: browseItem.id, title: browseItem.title, artist: browseItem.subtitle, artwork: browseItem.artworkUrl, url: '', duration: 0 });
                    } else if (browseItem.type === 'album') {
                      navigation.navigate('AlbumDetails', { id: browseItem.id });
                    } else if (browseItem.type === 'playlist') {
                      navigation.navigate('PlaylistDetails', { id: browseItem.id });
                    } else if (browseItem.type === 'artist') {
                      navigation.navigate('ArtistProfile', { id: browseItem.id });
                    }
                  }}
                >
                  <Text style={[styles.genreTileText, { color: colors.white, textShadowColor: colors.overlayLight }]}>{browseItem.title}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    // Default to Carousel
    return <FeedCarousel section={item} />;
  }, [colors.brand, colors.text, navigation, playTrack]);

  // Use a vibrant color based on categoryId
  const dominantColor = useMemo(() => {
    switch (categoryId) {
      case 'new': return colors.brand;
      case 'charts': return '#8A2BE2';
      case 'moods': return '#FF8C00';
      case 'podcasts': return '#2E8B57';
      default: return colors.brand;
    }
  }, [categoryId, colors.brand]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.header, headerStyle, { zIndex: 10 }]}>
        {coverImage ? (
          <Animated.View style={[StyleSheet.absoluteFill, largeTitleOpacityStyle]}>
            <Image
              source={{ uri: coverImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient
              colors={[colors.overlayLight, colors.background]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : (
          <LinearGradient
            colors={[dominantColor, colors.background]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        )}

        <View style={[styles.topBar, { marginTop: insets.top }]}>
          <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: colors.overlayLight }]}>
            <ArrowLeft color={colors.white} size={24} />
          </Pressable>
          <Animated.Text style={[styles.stickyTitle, { color: colors.white }, titleOpacityStyle]} numberOfLines={1}>
            {title}
          </Animated.Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.View style={[styles.largeTitleContainer, largeTitleOpacityStyle]}>
          <Text style={[styles.largeTitle, { color: colors.white, textShadowColor: colors.overlay }]}>{title}</Text>
        </Animated.View>
      </Animated.View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} containerStyle={{ paddingTop: HEADER_MAX_HEIGHT }} />
      ) : (
        <AnimatedFlashList
          data={shelves}
          renderItem={renderSection}
          keyExtractor={(item: any, index: number) => item.title + '-' + index}
          // @ts-ignore
          estimatedItemSize={300}
          drawDistance={1000}
          contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT + spacing.md, paddingBottom: 170 }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: HEADER_MAX_HEIGHT,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  largeTitleContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  largeTitle: {
    fontSize: 42,
    fontWeight: '900',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  listSection: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.header,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  heroSection: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  heroCard: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImage: {
    ...StyleSheet.absoluteFill as any,
  },
  heroGradient: {
    ...StyleSheet.absoluteFill as any,
  },
  heroContent: {
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: typography.bodySm,
  },
  heroPlayBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  heroPlayText: {
    fontWeight: 'bold',
    fontSize: typography.bodySm,
  },
  gridSection: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genreTile: {
    width: '48%',
    height: 80,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  genreTileText: {
    fontSize: typography.body,
    fontWeight: 'bold',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
