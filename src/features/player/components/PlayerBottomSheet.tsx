import React, { useCallback, memo, useState, useEffect } from 'react';
import { View, Text, useWindowDimensions, StyleSheet, Alert, ActivityIndicator, AppState, Platform, LayoutChangeEvent, BackHandler } from 'react-native';
import { Gesture, GestureDetector, TouchableOpacity, ScrollView, FlatList } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useSharedValue,
  useDerivedValue,
  interpolate,
  Extrapolation,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle,
  ChevronDown, MoreVertical, Heart,
  ListMusic, Share2, Download, CheckCircle2
} from 'lucide-react-native';
import { useTheme, spacing, typography } from '@/theme';
import { darkColors } from '@/theme/colors';
import { createStyles } from './PlayerBottomSheet.styles';
import { AnimatedEQ } from '@/ui/AnimatedEQ';
import { MarqueeText } from '@/ui/MarqueeText';
import { downloadService } from '@/features/library/services/downloadService';
import { usePlayerStore, useSettingsStore } from '@/store';
import { usePlaylistSelectionStore } from '@/store/usePlaylistSelectionStore';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { getBottomTabBarHeight } from '@/navigation/layout';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { toggleLike } from '@/features/library/services/libraryService';
import { useLikedSongs, useDownloadedSongs } from '@/features/library/hooks/useLibrary';
import { useDownloadStore } from '@/features/library/store/useDownloadStore';
import { shareContent } from '@/utils/shareUtils';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import Slider from '@react-native-community/slider';
import { getColors } from 'react-native-image-colors';
import { LinearGradient } from 'expo-linear-gradient';



const MINI_PLAYER_HEIGHT = 64;
const PLAYER_FALLBACK_BG = darkColors.background;
const QUEUE_COLLAPSED_VISIBLE_HEIGHT = 85;

const AnimatedRNGHFlatList = Animated.createAnimatedComponent(FlatList);

const formatTime = (seconds: number) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const MiniPlayerComponent = memo(({
  onExpand, styles, track, isPlaying, isLoading, progress, iconColor, themeColors
}: {
  onExpand: () => void, styles: any, track: any, isPlaying: boolean, isLoading: boolean, progress: number, iconColor: string, themeColors: any
}) => {
  const togglePlayPause = () => {
    if (isPlaying) usePlayerStore.getState().pause();
    else usePlayerStore.getState().resume();
  };

  const skipNext = () => usePlayerStore.getState().skipToNext();

  return (
    <>
      <TouchableOpacity
        style={styles.miniPlayerInner}
        activeOpacity={0.95}
        onPress={onExpand}
      >
        <Image source={track?.artworkUrl || track?.artwork || require('../../../../assets/default-artwork.png')} style={styles.miniArt} contentFit="cover" />
        <View style={styles.miniInfo}>
          <MarqueeText style={styles.miniTitle} fadeColors={[themeColors.surface, 'transparent']}>{track?.title || 'Not Playing'}</MarqueeText>
          <Text style={styles.miniArtist} numberOfLines={1}>{track?.artist || 'Unknown'}</Text>
        </View>
        <TouchableOpacity style={styles.miniBtn} onPress={togglePlayPause}>
          {isLoading ? (
            <ActivityIndicator color={iconColor} size="small" />
          ) : isPlaying ? (
            <Pause color={iconColor} size={22} fill={iconColor} />
          ) : (
            <Play color={iconColor} size={22} fill={iconColor} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.miniBtn} onPress={skipNext}>
          <SkipForward color={iconColor} size={22} fill={iconColor} />
        </TouchableOpacity>
      </TouchableOpacity>
      <View style={styles.miniProgressTrack}>
        <View style={[styles.miniProgressFill, { width: `${progress}%` }]} />
      </View>
    </>
  );
});

const TopBarComponent = memo(({ styles, onCollapse, activeTrack }: { styles: any, onCollapse: () => void, activeTrack: any }) => {
  const { colors } = useTheme();
  return (
  <>
    <TouchableOpacity onPress={onCollapse} hitSlop={12}>
      <ChevronDown color={darkColors.white} size={32} />
    </TouchableOpacity>

    <View style={styles.tabPills}>
      <TouchableOpacity style={styles.tabPillActive}>
        <Text style={styles.tabPillText}>Song</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabPillInactive}>
        <Text style={[styles.tabPillText, { opacity: 0.6 }]}>Video</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.topBarRight}>
      <TouchableOpacity hitSlop={8} onPress={() => {
        if (activeTrack) useActionSheetStore.getState().openSheet('track', activeTrack, { isCurrentlyPlaying: true, isQueueItem: true });
      }}>
        <MoreVertical color={darkColors.white} size={22} />
      </TouchableOpacity>
    </View>
  </>
  );
});

const ActionChipsComponent = memo(({ styles, activeTrack, isLiked, onToggleLike, onDownload, brandColor, isDownloaded, activeDownloadState }: { styles: any, activeTrack: any, isLiked: boolean, onToggleLike: () => void, onDownload: () => void, brandColor: string, isDownloaded: boolean, activeDownloadState: any }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
    <TouchableOpacity style={[styles.chip, !isLiked && { opacity: 0.7 }]} onPress={onToggleLike}>
      <Heart color={isLiked ? brandColor : darkColors.white} fill={isLiked ? brandColor : "transparent"} size={18} />
      <Text style={styles.chipText}>{isLiked ? "Liked" : "Like"}</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={styles.chip}
      onPress={activeDownloadState?.status === 'error' ? () => {
        useDownloadStore.getState().removeDownload(activeTrack.id);
        onDownload();
      } : onDownload}
      disabled={isDownloaded || (activeDownloadState && activeDownloadState.status !== 'error')}
    >
      {isDownloaded ? (
        <CheckCircle2 color={brandColor} size={18} />
      ) : activeDownloadState ? (
        activeDownloadState.status === 'error' ? (
          <Download color="#ff4444" size={18} />
        ) : (
          <ActivityIndicator color={brandColor} size="small" />
        )
      ) : (
        <Download color={darkColors.white} size={18} />
      )}
      <Text style={[styles.chipText, isDownloaded && { color: brandColor }, activeDownloadState?.status === 'error' && { color: '#ff4444' }]}>
        {isDownloaded ? "Downloaded" : activeDownloadState ? (
          activeDownloadState.status === 'error' ? "Retry Download" : `Downloading ${Math.round(activeDownloadState.progress)}%`
        ) : "Download"}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.chip} onPress={() => {
      if (activeTrack) usePlaylistSelectionStore.getState().openSheet(activeTrack);
    }}>
      <ListMusic color={darkColors.white} size={18} />
      <Text style={styles.chipText}>Save</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.chip} onPress={() => {
      if (activeTrack) shareContent('track', activeTrack.id, activeTrack.title || '');
    }}>
      <Share2 color={darkColors.white} size={18} />
      <Text style={styles.chipText}>Share</Text>
    </TouchableOpacity>
  </ScrollView>
));

const PlaybackControlsComponent = memo(({ styles, isPlaying, isLoading, position, duration, brandColor }: { styles: any, isPlaying: boolean, isLoading: boolean, position: number, duration: number, brandColor: string }) => {
  const isShuffle = usePlayerStore((state) => state.isShuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);

  const togglePlayPause = () => {
    if (isPlaying) usePlayerStore.getState().pause();
    else usePlayerStore.getState().resume();
  };

  const onSlidingComplete = async (value: number) => {
    await TrackPlayer.seekTo(value);
  };

  // Sweeping loading animation
  const sweepTranslateX = useSharedValue(-200);

  useEffect(() => {
    if (isLoading) {
      sweepTranslateX.value = withRepeat(
        withTiming(400, { duration: 1500 }),
        -1, // Infinite
        false
      );
    } else {
      sweepTranslateX.value = -200;
    }
  }, [isLoading]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweepTranslateX.value }],
  }));

  return (
    <>
      <View style={styles.timelineContainer}>
        {isLoading ? (
          <View style={{ width: '100%', height: 40, justifyContent: 'center' }}>
            <View style={{ width: '100%', height: 4, backgroundColor: darkColors.white, opacity: 0.2, borderRadius: 2, overflow: 'hidden' }}>
              <Animated.View style={[{ width: 150, height: '100%', backgroundColor: darkColors.white, opacity: 0.8 }, sweepStyle]} />
            </View>
          </View>
        ) : (
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={duration || 1}
            value={position}
            onSlidingComplete={onSlidingComplete}
            minimumTrackTintColor={darkColors.white}
            maximumTrackTintColor={darkColors.highlightStrong}
            thumbTintColor={darkColors.white}
          />
        )}
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>{formatTime(position)}</Text>
          <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
        </View>
      </View>
      <View style={styles.playbackRow}>
        <TouchableOpacity onPress={() => usePlayerStore.getState().toggleShuffle()} style={!isShuffle && { opacity: 0.7 }}>
          <Shuffle color={isShuffle ? brandColor : darkColors.white} size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => usePlayerStore.getState().skipToPrevious()}><SkipBack color={darkColors.white} size={36} fill={darkColors.white} /></TouchableOpacity>
        <TouchableOpacity style={styles.playCircle} onPress={togglePlayPause}>
          {isLoading ? (
            <ActivityIndicator color={darkColors.black} size="large" />
          ) : isPlaying ? (
            <Pause color={darkColors.black} size={32} fill={darkColors.black} style={{ marginLeft: 0 }} />
          ) : (
            <Play color={darkColors.black} size={32} fill={darkColors.black} style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => usePlayerStore.getState().skipToNext()}><SkipForward color={darkColors.white} size={36} fill={darkColors.white} /></TouchableOpacity>
        <TouchableOpacity onPress={() => usePlayerStore.getState().toggleRepeat()} style={repeatMode !== 'all' && { opacity: 0.7 }}>
          {repeatMode === 'one' ? (
            <Repeat1 color={brandColor} size={24} />
          ) : (
            <Repeat color={repeatMode === 'all' ? brandColor : darkColors.white} size={24} />
          )}
        </TouchableOpacity>
      </View>
    </>
  );
});

const QueueHeaderComponent = memo(({ styles }: { styles: any }) => {
  const autoplay = useSettingsStore(state => state.autoplay);

  return (
    <>
      <View style={styles.queueDragBar} />
      <View style={styles.queueHeaderRow}>
        <View>
          <Text style={styles.playingFrom}>Up Next</Text>
          <Text style={styles.playingSource}>Auto-play is {autoplay ? 'ON' : 'OFF'}</Text>
        </View>
      </View>
    </>
  );
});



const QueueItemComponent = memo(({ track, isPlayingItem, styles }: { track: any, isPlayingItem: boolean, styles: any }) => {
  const handlePress = useCallback(() => {
    if (!isPlayingItem) {
      usePlayerStore.getState().setActiveTrack(track);
    }
  }, [track, isPlayingItem]);

  return (
    <TouchableOpacity
      style={styles.queueItem}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <View style={styles.queueArtContainer}>
        <Image source={track.artworkUrl || track.artwork || require('../../../../assets/default-artwork.png')} style={styles.queueArt} contentFit="cover" />
        {isPlayingItem && <AnimatedEQ isOverlay />}
      </View>
      <View style={styles.queueItemInfo}>
        <Text style={[styles.queueItemTitle, isPlayingItem && styles.activeQueueItemTitle]} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.queueItemArtist} numberOfLines={1}>{track.artist}</Text>
      </View>
      <TouchableOpacity
        onPress={() => useActionSheetStore.getState().openSheet('track', track, { isQueueItem: true })}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        style={{ opacity: 0.5 }}
      >
        <MoreVertical color={darkColors.white} size={20} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

/**
 * Interactive bottom sheet player governing gesture-driven detents, dynamic artwork morphing, and queue interactions.
 */
export const PlayerBottomSheet: React.FC = () => {
  const { colors: themeColors } = useTheme();
  const styles = React.useMemo(() => createStyles(themeColors), [themeColors]);
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [containerHeight, setContainerHeight] = useState(screenHeight);

  const activeTrack = usePlayerStore((state) => state.activeTrack);
  const queue = usePlayerStore((state) => state.queue);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const expandPlayerSignal = usePlayerStore((state) => state.expandPlayerSignal);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isLoading = usePlayerStore((state) => state.isBuffering);

  const rawProgress = useProgress();
  const isResolving = playbackState === 'resolving' || playbackState === 'loading' || isLoading;
  const position = isResolving ? 0 : rawProgress.position;
  const duration = isResolving ? 0 : rawProgress.duration;
  const miniProgress = duration > 0 ? (position / duration) * 100 : 0;

  // ── Database & Likes & Downloads ──
  const db = useSafeDatabase();
  const likedSongs = useLikedSongs();
  const downloadedSongs = useDownloadedSongs();
  const activeDownloads = useDownloadStore(state => state.activeDownloads);

  const isLiked = !!(activeTrack && likedSongs.some((t: any) => t.id === activeTrack.id));
  const isDownloaded = !!(activeTrack && downloadedSongs.some((t: any) => t.id === activeTrack.id));
  const activeDownloadState = activeTrack ? activeDownloads[activeTrack.id] : null;

  const handleToggleLike = useCallback(async () => {
    if (!db || !activeTrack) return;
    await toggleLike(db, activeTrack as any);
  }, [db, activeTrack]);

  const handleDownload = useCallback(async () => {
    if (!db || !activeTrack) return;
    await downloadService.startDownload(db, activeTrack as any);
  }, [activeTrack, db]);

  // ── Dynamic Colors ──
  const [bgColor, setBgColor] = useState<string>(PLAYER_FALLBACK_BG);

  useEffect(() => {
    const art = activeTrack?.artworkUrl || activeTrack?.artwork;
    const trackId = activeTrack?.id;
    if (!art || !trackId) {
      setBgColor(PLAYER_FALLBACK_BG);
      return;
    }

    // 1. Instant Cache Retrieval (Bypasses JS-Native Bridge)
    const cachedColor = usePlayerStore.getState().colorCache[trackId];
    if (cachedColor) {
      setBgColor(cachedColor);
      return;
    }

    // 2. AppState De-bouncing & requestIdleCallback wrapping
    if (AppState.currentState === 'background') {
      return; // Skip bridge traffic while backgrounded
    }

    const fetchColors = async () => {
      try {
        const result = await getColors(art, {
          fallback: PLAYER_FALLBACK_BG,
          cache: true,
          key: art,
        });
        let extractedColor: string = PLAYER_FALLBACK_BG;
        if (result.platform === 'android') extractedColor = result.average || PLAYER_FALLBACK_BG;
        else if (result.platform === 'ios') extractedColor = result.background || PLAYER_FALLBACK_BG;
        else extractedColor = result.dominant || PLAYER_FALLBACK_BG;

        setBgColor(extractedColor);
        usePlayerStore.getState().setColorCache(trackId, extractedColor);
      } catch (e) {
        setBgColor(PLAYER_FALLBACK_BG);
      }
    };

    const scheduleIdle = window.requestIdleCallback || ((cb: any) => setTimeout(cb, 0));
    const cancelIdle = window.cancelIdleCallback || ((id: any) => clearTimeout(id));

    const handle = scheduleIdle(() => {
      fetchColors();
    });

    return () => cancelIdle(handle);
  }, [activeTrack?.artworkUrl, activeTrack?.artwork, activeTrack?.id]);

  // ── 1. Gesture Physics (Main Sheet) ──
  const layoutHeight = containerHeight || screenHeight;
  const bottomTabBarHeight = getBottomTabBarHeight(insets.bottom);
  const MINIPLAYER_Y = layoutHeight - bottomTabBarHeight - MINI_PLAYER_HEIGHT;
  const FULLSCREEN_Y = 0;

  const translateY = useSharedValue(MINIPLAYER_Y);
  const contextY = useSharedValue(0);

  // Sync translateY when screen dimensions or safe area insets stabilize
  useEffect(() => {
    if (translateY.value > FULLSCREEN_Y + 100) {
      translateY.value = MINIPLAYER_Y;
    }
  }, [MINIPLAYER_Y]);

  // Auto-Expand Effect
  useEffect(() => {
    if (expandPlayerSignal > 0 && translateY.value !== FULLSCREEN_Y) {
      translateY.value = withSpring(FULLSCREEN_Y, { damping: 25, stiffness: 250, mass: 0.5 });
    }
  }, [expandPlayerSignal]);

  // ── 2. Gesture Physics (Queue Sheet) ──
  const QUEUE_COLLAPSED_Y = layoutHeight - insets.bottom - QUEUE_COLLAPSED_VISIBLE_HEIGHT;
  const QUEUE_HALF_Y = layoutHeight * 0.60;
  const QUEUE_EXPANDED_Y = insets.top + 70;

  const queueTranslateY = useSharedValue(QUEUE_COLLAPSED_Y);
  const queueContextY = useSharedValue(0);

  const HALF_PROGRESS = (QUEUE_COLLAPSED_Y - QUEUE_HALF_Y) / (QUEUE_COLLAPSED_Y - QUEUE_EXPANDED_Y);

  useEffect(() => {
    const currentY = queueTranslateY.value;
    if (currentY > QUEUE_HALF_Y) {
      queueTranslateY.value = QUEUE_COLLAPSED_Y;
      return;
    }
    if (currentY < QUEUE_EXPANDED_Y || currentY > QUEUE_COLLAPSED_Y) {
      queueTranslateY.value = Math.min(Math.max(currentY, QUEUE_EXPANDED_Y), QUEUE_COLLAPSED_Y);
    }
  }, [QUEUE_COLLAPSED_Y, QUEUE_EXPANDED_Y, QUEUE_HALF_Y, queueTranslateY]);

  // ── PURE MATH PROGRESS ──
  const progress = useDerivedValue(() => {
    return (MINIPLAYER_Y - translateY.value) / (MINIPLAYER_Y - FULLSCREEN_Y);
  });

  const queueProgress = useDerivedValue(() => {
    return (QUEUE_COLLAPSED_Y - queueTranslateY.value) / (QUEUE_COLLAPSED_Y - QUEUE_EXPANDED_Y);
  });

  // ── Hardware Back Button Progressive Collapse ──
  useEffect(() => {
    const onBackPress = () => {
      if (queueTranslateY.value < QUEUE_COLLAPSED_Y - 20) {
        cancelAnimation(queueTranslateY);
        queueTranslateY.value = withSpring(QUEUE_COLLAPSED_Y, { damping: 25, stiffness: 250, mass: 0.5 });
        return true;
      }
      
      if (translateY.value < MINIPLAYER_Y - 20) {
        cancelAnimation(translateY);
        translateY.value = withSpring(MINIPLAYER_Y, { damping: 25, stiffness: 250, mass: 0.5 });
        return true;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [queueTranslateY, translateY, QUEUE_COLLAPSED_Y, MINIPLAYER_Y]);

  // --- Queue Pan Gesture ---
  const queuePanGesture = Gesture.Pan()
    .onStart(() => { cancelAnimation(queueTranslateY); queueContextY.value = queueTranslateY.value; })
    .onUpdate((event) => {
      let newY = queueContextY.value + event.translationY;
      if (newY < QUEUE_EXPANDED_Y) newY = QUEUE_EXPANDED_Y;
      if (newY > QUEUE_COLLAPSED_Y) newY = QUEUE_COLLAPSED_Y;
      queueTranslateY.value = newY;
    })
    .onEnd((event) => {
      const velocityY = event.velocityY;
      const y = queueTranslateY.value;
      let dest = y;

      if (velocityY < -500) dest = y > QUEUE_HALF_Y ? QUEUE_HALF_Y : QUEUE_EXPANDED_Y;
      else if (velocityY > 500) dest = y < QUEUE_HALF_Y ? QUEUE_HALF_Y : QUEUE_COLLAPSED_Y;
      else {
        const d1 = Math.abs(y - QUEUE_COLLAPSED_Y);
        const d2 = Math.abs(y - QUEUE_HALF_Y);
        const d3 = Math.abs(y - QUEUE_EXPANDED_Y);
        const minDist = Math.min(d1, d2, d3);
        if (minDist === d1) dest = QUEUE_COLLAPSED_Y;
        else if (minDist === d2) dest = QUEUE_HALF_Y;
        else dest = QUEUE_EXPANDED_Y;
      }
      queueTranslateY.value = withSpring(dest, { damping: 25, stiffness: 250, mass: 0.5 });
    });

  // --- Main Sheet Pan Gesture ---
  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => { cancelAnimation(translateY); contextY.value = translateY.value; })
    .onUpdate((event) => {
      let newY = contextY.value + event.translationY;
      if (newY < FULLSCREEN_Y) newY = FULLSCREEN_Y;
      if (newY > MINIPLAYER_Y) newY = MINIPLAYER_Y;
      translateY.value = newY;
    })
    .onEnd((event) => {
      const velocityY = event.velocityY;
      const midpoint = (MINIPLAYER_Y + FULLSCREEN_Y) / 2;
      let dest = translateY.value < midpoint ? FULLSCREEN_Y : MINIPLAYER_Y;
      if (velocityY < -500) dest = FULLSCREEN_Y;
      else if (velocityY > 500) dest = MINIPLAYER_Y;
      translateY.value = withSpring(dest, { damping: 25, stiffness: 250, mass: 0.5 });
    });

  const queueScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (event.contentOffset.y < -60) queueTranslateY.value = withSpring(QUEUE_COLLAPSED_Y, { damping: 25, stiffness: 250, mass: 0.5 });
    },
  });

  // ── 3. Base Animated Styles ──
  const bottomSheetStyle = useAnimatedStyle(() => {
    // Visually clamp the translateY so the sheet NEVER slips below the screen bottom
    const clampedY = Math.min(Math.max(translateY.value, FULLSCREEN_Y), MINIPLAYER_Y);
    return { transform: [{ translateY: clampedY }] };
  });

  const miniplayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [0, 0.2], [0, 20], Extrapolation.CLAMP) }],
    pointerEvents: progress.value > 0.15 ? 'none' : 'auto',
  }));

  const fullscreenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.1, 0.5], [0, 1], Extrapolation.CLAMP),
    pointerEvents: progress.value < 0.15 ? 'none' : 'auto',
  }));

  const topBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(queueProgress.value, [0, 0.3, 0.7], [1, 0.8, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(queueProgress.value, [0, 0.7], [0, -spacing.lg], Extrapolation.CLAMP) }],
    zIndex: 15,
    pointerEvents: queueProgress.value > 0.5 ? 'none' : 'auto',
  }));

  // 4. TRUE MORPH MATH (Artwork & Text)
  const ARTWORK_NORMAL_SIZE = screenWidth - 60;
  const ARTWORK_BLEED_HEIGHT = screenWidth * 0.85;
  const ARTWORK_MINI_SIZE = 48;

  const artworkStyle = useAnimatedStyle(() => {
    const width = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [ARTWORK_NORMAL_SIZE, screenWidth, ARTWORK_MINI_SIZE], Extrapolation.CLAMP);
    const height = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [ARTWORK_NORMAL_SIZE, ARTWORK_BLEED_HEIGHT, ARTWORK_MINI_SIZE], Extrapolation.CLAMP);
    const borderRadius = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [12, 0, 6], Extrapolation.CLAMP);
    const top = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [insets.top + 70, 0, insets.top + 10], Extrapolation.CLAMP);
    const left = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [30, 0, 16], Extrapolation.CLAMP);

    return {
      position: 'absolute',
      top, left, width, height, borderRadius,
      overflow: 'hidden', zIndex: 10,
    };
  });

  const textMorphStyle = useAnimatedStyle(() => {
    const top0 = Math.min(insets.top + 70 + ARTWORK_NORMAL_SIZE + 20, layoutHeight * 0.53);
    const topHalf = ARTWORK_BLEED_HEIGHT - 65;
    const top1 = insets.top + 14;
    const top = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [top0, topHalf, top1], Extrapolation.CLAMP);

    const left0 = 30;
    const leftHalf = 20;
    const left1 = 16 + ARTWORK_MINI_SIZE + 16;
    const left = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [left0, leftHalf, left1], Extrapolation.CLAMP);

    const right = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [20, 20, 120], Extrapolation.CLAMP);

    return { position: 'absolute', top, left, right, zIndex: 11, overflow: 'hidden' };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [typography.header, typography.header, typography.body], Extrapolation.CLAMP),
    marginBottom: interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [spacing.xs, spacing.xs, 0], Extrapolation.CLAMP),
  }));

  const artistAnimatedStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [typography.bodyLg, typography.bodyLg, typography.caption], Extrapolation.CLAMP),
  }));

  const state3ButtonsStyle = useAnimatedStyle(() => {
    const opacity = interpolate(queueProgress.value, [0.6, 0.9], [0, 1], Extrapolation.CLAMP);
    return {
      opacity, position: 'absolute', top: insets.top + 15, right: spacing.lg,
      flexDirection: 'row', alignItems: 'center',
      pointerEvents: queueProgress.value > 0.6 ? 'auto' : 'none', zIndex: 12,
    };
  });

  // ── 5. DISAPPEARING CONTROLS ──
  const chipsDisappearingStyle = useAnimatedStyle(() => {
    const opacity = interpolate(queueProgress.value, [0, 0.3], [1, 0], Extrapolation.CLAMP);
    return { opacity, pointerEvents: queueProgress.value > 0.25 ? 'none' : 'auto' };
  });

  const playbackDisappearingStyle = useAnimatedStyle(() => {
    const opacity = interpolate(queueProgress.value, [0, HALF_PROGRESS, 0.85], [1, 1, 0], Extrapolation.CLAMP);
    const shiftHalf = -(QUEUE_COLLAPSED_Y - QUEUE_HALF_Y);
    const shiftFull = -(QUEUE_COLLAPSED_Y - QUEUE_EXPANDED_Y);
    const translateY = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [0, shiftHalf, shiftFull], Extrapolation.CLAMP);

    return {
      opacity, transform: [{ translateY }], zIndex: 25,
      pointerEvents: queueProgress.value > 0.8 ? 'none' : 'auto',
    };
  });

  const handleExpand = useCallback(() => translateY.value = withSpring(FULLSCREEN_Y, { damping: 25, stiffness: 250, mass: 0.5 }), [FULLSCREEN_Y, translateY]);
  const handleCollapse = useCallback(() => translateY.value = withSpring(MINIPLAYER_Y, { damping: 25, stiffness: 250, mass: 0.5 }), [MINIPLAYER_Y, translateY]);
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0 && Math.abs(nextHeight - containerHeight) > 1) {
      setContainerHeight(nextHeight);
    }
  }, [containerHeight]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.wrapper, bottomSheetStyle]} pointerEvents="box-none" onLayout={handleContainerLayout}>
        <Animated.View style={[styles.miniPlayerContainer, miniplayerStyle]}>
          <MiniPlayerComponent onExpand={handleExpand} styles={styles} track={activeTrack} isPlaying={isPlaying} isLoading={isLoading} progress={miniProgress} iconColor={themeColors.text} themeColors={themeColors} />
        </Animated.View>

        <Animated.View style={[styles.fullscreenContainer, fullscreenStyle]}>
          <LinearGradient
            colors={[bgColor, '#0f0f0f']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1.2 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: darkColors.overlayLight }]} />

          <Animated.View style={[styles.topBar, { paddingTop: insets.top + 8 }, topBarStyle]}>
            <TopBarComponent onCollapse={handleCollapse} styles={styles} activeTrack={activeTrack} />
          </Animated.View>

          <Animated.View style={artworkStyle}>
            <Image source={activeTrack?.artworkUrl || activeTrack?.artwork || require('../../../../assets/default-artwork.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>

          <Animated.View style={textMorphStyle}>
            <MarqueeText style={[styles.songTitle, titleAnimatedStyle]} delay={1000}>
              {activeTrack?.title || 'Not Playing'}
            </MarqueeText>
            <Animated.Text style={[styles.songArtist, artistAnimatedStyle]} numberOfLines={1}>
              {activeTrack?.artist || 'Unknown'}
            </Animated.Text>
          </Animated.View>

          <Animated.View style={state3ButtonsStyle}>
            <TouchableOpacity style={{ padding: spacing.sm }} onPress={() => {
              if (isPlaying) usePlayerStore.getState().pause();
              else usePlayerStore.getState().resume();
            }}>
              {isLoading ? (
                <ActivityIndicator color={darkColors.white} size="small" />
              ) : isPlaying ? (
                <Pause color={darkColors.white} size={26} fill={darkColors.white} />
              ) : (
                <Play color={darkColors.white} size={26} fill={darkColors.white} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: spacing.sm, marginLeft: spacing.md }} onPress={() => useActionSheetStore.getState().openSheet('track', activeTrack!, { isCurrentlyPlaying: true, isQueueItem: true })}>
              <MoreVertical color={darkColors.white} size={26} />
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.flexBottomSpacer}>
            <Animated.View style={chipsDisappearingStyle}>
              <ActionChipsComponent
                styles={styles}
                activeTrack={activeTrack}
                isLiked={isLiked}
                onToggleLike={handleToggleLike}
                onDownload={() => { if (db && activeTrack) downloadService.startDownload(db, activeTrack as any) }}
                brandColor={themeColors.brand}
                isDownloaded={isDownloaded}
                activeDownloadState={activeDownloadState}
              />
            </Animated.View>

            <Animated.View style={playbackDisappearingStyle}>
              <PlaybackControlsComponent styles={styles} isPlaying={isPlaying} isLoading={isLoading} position={position} duration={duration} brandColor={themeColors.brand} />
            </Animated.View>
          </View>

          <Animated.View style={[styles.queueSheetWrapper, { transform: [{ translateY: queueTranslateY }] }]}>
            <GestureDetector gesture={queuePanGesture}>
              <View style={styles.queueHeader}>
                <QueueHeaderComponent styles={styles} />
              </View>
            </GestureDetector>

            <AnimatedRNGHFlatList
              data={queue}
              keyExtractor={(item: any, index: number) => item.id + index.toString()}
              renderItem={({ item }: any) => (
                <QueueItemComponent track={item} isPlayingItem={activeTrack?.id === item.id} styles={styles} />
              )}
              onScroll={queueScrollHandler}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              style={styles.queueScrollView}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
              windowSize={5}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};
