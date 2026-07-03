import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
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
import { ExtractedTrack, HyperExtractor } from 'react-native-hyper-extractor';
import { useQuery } from '@tanstack/react-query';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { AnimatedEQ } from '@/ui/AnimatedEQ';
import { ErrorState } from '@/ui/ErrorState';

type Props = NativeStackScreenProps<HomeStackParamList, 'AlbumDetails'>;

const HEADER_MAX_HEIGHT = 350;
const HEADER_MIN_HEIGHT = 90;

/**
 * Screen rendering comprehensive album tracklists, dynamic cover art color extraction, and queue execution actions.
 */
export function AlbumDetailsScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { openSheet } = useActionSheetStore();
  const playList = usePlayerStore((state) => state.playList);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const activeTrack = usePlayerStore((state) => state.activeTrack);
  const scrollY = useSharedValue(0);
  const [dominantColor, setDominantColor] = useState<string>(colors.border);

  const { data: albumData, isLoading, error, refetch } = useQuery({
    queryKey: ['album', route.params.id],
    queryFn: async () => {
      const data = await HyperExtractor.getAlbumDetails(route.params.id);
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  useEffect(() => {
    if (albumData?.artworkUrl) {
      getColors(albumData.artworkUrl, {
        fallback: colors.border,
        cache: true,
        key: albumData.artworkUrl,
      }).then((c) => {
        if (c.platform === 'android') {
          setDominantColor(c.dominant || dominantColor);
        } else if (c.platform === 'ios') {
          setDominantColor(c.primary || dominantColor);
        }
      });
    }
  }, [isDark, albumData?.artworkUrl]);

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

  const imageOpacityStyle = useAnimatedStyle(() => {
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

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error || !albumData) {
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
        <Animated.View style={[StyleSheet.absoluteFill, styles.imageContainer, imageOpacityStyle]}>
          <Image
            source={{ uri: albumData.artworkUrl }}
            style={styles.artwork}
            contentFit="cover"
          />
        </Animated.View>

        <View style={[styles.topBar, { marginTop: insets.top }]}>
          <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: colors.overlayLight }]}>
            <ArrowLeft color={colors.white} size={24} />
          </Pressable>
          <Animated.Text style={[styles.stickyTitle, titleOpacityStyle, { color: colors.white }]} numberOfLines={1}>
            {albumData.title}
          </Animated.Text>
          <Pressable
            hitSlop={12}
            style={[styles.iconBtn, { backgroundColor: colors.overlayLight }]}
            onPress={() => openSheet('album', {
              id: route.params.id,
              name: albumData.title,
              coverUrl: albumData.artworkUrl
            })}
          >
            <MoreVertical color={colors.white} size={24} />
          </Pressable>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER_MAX_HEIGHT, paddingBottom: 170 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoSection}>
          <Text style={[styles.title, { color: colors.text }]}>{albumData.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Album •{' '}
            <Text
              onPress={() => {
                if (albumData.artistId) {
                  navigation.navigate('ArtistProfile', { id: albumData.artistId });
                }
              }}
              style={albumData.artistId ? { textDecorationLine: 'underline' } : undefined}
            >
              {albumData.artist}
            </Text>{' '}
            • {albumData.year}
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.playBtn, { backgroundColor: colors.text }]}
              onPress={() => {
                if (albumData?.tracks) {
                  playList(albumData.tracks as unknown as any[]);
                }
              }}
            >
              <Play color={colors.background} size={20} fill={colors.background} />
              <Text style={[styles.playBtnText, { color: colors.background }]}>Play</Text>
            </Pressable>
            <Pressable
              style={[styles.shuffleBtn, { borderColor: colors.border }]}
              onPress={() => {
                if (albumData?.tracks) {
                  const shuffled = [...albumData.tracks].sort(() => Math.random() - 0.5);
                  playList(shuffled as unknown as any[]);
                }
              }}
            >
              <Shuffle color={colors.text} size={20} />
              <Text style={[styles.shuffleBtnText, { color: colors.text }]}>Shuffle</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.trackList}>
          {albumData.tracks.map((track, index) => {
            const isPlaying = activeTrack?.id === track.id;
            return (
              <View key={track.id} style={styles.trackWrapper}>
                {isPlaying ? (
                  <AnimatedEQ />
                ) : (
                  <Text style={[styles.trackIndex, { color: colors.textMuted }]}>{index + 1}</Text>
                )}
                <View style={{ flex: 1 }}>
                  <TrackResultCard
                    track={track}
                    onPress={() => {
                      if (albumData?.tracks) {
                        playList(albumData.tracks as unknown as any[], index);
                      }
                    }}
                  />
                </View>
              </View>
            );
          })}
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
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  artwork: {
    width: 220,
    height: 220,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
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
  infoSection: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.bodySm,
    fontWeight: '600',
    marginBottom: spacing.xl,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
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
  trackList: {
    paddingHorizontal: spacing.md,
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
});
