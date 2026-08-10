import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, useWindowDimensions, StyleSheet, LayoutChangeEvent, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GestureDetector } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import Animated, {
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useDerivedValue,
  interpolate,
  Extrapolation,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, typography } from '@/theme';
import { darkColors } from '@/theme/colors';
import { createStyles } from './PlayerBottomSheet.styles';
import { downloadService } from '@/features/library/services/downloadService';
import { usePlayerStore, useSettingsStore } from '@/store';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { useToastStore } from '@/store/useToastStore';
import { getBottomTabBarHeight } from '@/navigation/layout';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { useLikedSongs, useDownloadedSongs } from '@/features/library/hooks/useLibrary';
import { useDownloadStore } from '@/features/library/store/useDownloadStore';
import { LinearGradient } from 'expo-linear-gradient';



const MINI_PLAYER_HEIGHT = 60;
const QUEUE_COLLAPSED_VISIBLE_HEIGHT = 85;

import { usePlayerPhysics } from './hooks/usePlayerPhysics';
import { useQueuePhysics } from './hooks/useQueuePhysics';
import { usePlayerColors } from './hooks/usePlayerColors';

import { MiniPlayerComponent } from './components/MiniPlayer/MiniPlayer';
import { TopBarComponent } from './components/Fullscreen/TopBar';
import { ActionChipsComponent } from './components/Fullscreen/ActionChips';
import { PlaybackControlsComponent } from './components/Fullscreen/PlaybackControls';
import { FullscreenArtworkComponent } from './components/Fullscreen/FullscreenArtwork';
import { QueueItemComponent } from './components/Queue/QueueItem';
import { QueueHeaderComponent, AutoPlayHeaderComponent } from './components/Queue/QueueHeader';
import { QueueAutoPlayFooter } from './components/Queue/QueueAutoPlayFooter';



/**
 * Interactive bottom sheet player governing gesture-driven detents, dynamic artwork morphing, and queue interactions.
 */
export const PlayerBottomSheet: React.FC = () => {
  const { colors: themeColors } = useTheme();
  const styles = React.useMemo(() => createStyles(themeColors), [themeColors]);
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [containerHeight, setContainerHeight] = useState(screenHeight);
  const navigation = useNavigation<any>();

  // --- Global Stores & State ---
  const queue = usePlayerStore((state) => state.queue);
  const implicitStartIndex = usePlayerStore((state) => state.implicitStartIndex);
  const loadMoreAutoPlayTracks = usePlayerStore((state) => state.loadMoreAutoPlayTracks);

  const activeTrack = usePlayerStore((state) => state.activeTrack);
  const isMiniPlayerVisible = usePlayerStore((state) => state.isMiniPlayerVisible);
  const setExpanded = usePlayerStore((state) => state.setExpanded);
  const isVideoMode = usePlayerStore((state) => state.isVideoMode);
  const setIsVideoMode = usePlayerStore((state) => state.setIsVideoMode);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const expandPlayerSignal = usePlayerStore((state) => state.expandPlayerSignal);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isLoading = usePlayerStore((state) => state.isBuffering);

  const explicitQueue = useMemo(() => implicitStartIndex !== -1 ? queue.slice(0, implicitStartIndex) : queue, [queue, implicitStartIndex]);
  const autoPlayQueue = useMemo(() => implicitStartIndex !== -1 ? queue.slice(implicitStartIndex) : [], [queue, implicitStartIndex]);

  const handleDragEnd = useCallback(({ data, from, to }: any) => {
    if (from === to) {
      usePlayerStore.setState({ queue: [...data, ...autoPlayQueue] }); // Ensure sync
      return;
    }

    // Re-append AutoPlay tracks to maintain queue integrity after explicit reordering
    usePlayerStore.setState({ queue: [...data, ...autoPlayQueue] });

    // Push to native engine via SSOT method
    usePlayerStore.getState().reorderQueue(from, to, true);
  }, [autoPlayQueue]);

  const collapsePlayerSignal = usePlayerStore((state) => state.collapsePlayerSignal);

  // --- Derived & Interpolated State ---
  const isResolving = playbackState === 'resolving' || playbackState === 'loading' || isLoading;

  // --- Memoized List Props ---
  const keyExtractor = useCallback((item: any) => item._queueId || item.id, []);
  const contentContainerStyle = React.useMemo(() => [styles.scrollContent], [styles.scrollContent]);

  // --- Library & Downloads ---
  const db = useSafeDatabase();

  const downloadedSongs = useDownloadedSongs();
  const activeDownloads = useDownloadStore(state => state.activeDownloads);

  const isLiked = useLibraryStore(s => activeTrack ? s.likedTrackIds.has(activeTrack.id) : false);
  const isDownloaded = !!(activeTrack && downloadedSongs.some((t: any) => t.id === activeTrack.id));
  const activeDownloadState = activeTrack ? activeDownloads[activeTrack.id] : null;

  const handleToggleLike = useCallback(async () => {
    if (!db || !activeTrack) return;
    await useLibraryStore.getState().toggleTrackLike(db, activeTrack as any);
    useToastStore.getState().showToast(isLiked ? 'Removed from Liked Songs' : 'Added to Liked Songs', isLiked ? 'info' : 'liked');
  }, [db, activeTrack, isLiked]);

  const handleDownload = useCallback(async () => {
    if (!db || !activeTrack) return;

    if (isDownloaded) {
      useToastStore.getState().showToast('Already downloaded', 'info');
    } else if (activeDownloadState) {
      if (activeDownloadState.status === 'error') {
        useDownloadStore.getState().removeDownload(activeTrack.id);
        await downloadService.startDownload(db, activeTrack as any);
        useToastStore.getState().showToast({
          message: 'Retrying download...',
          type: 'info',
          action: { label: 'View', onPress: () => navigation.navigate('Library', { screen: 'DownloadsScreen' }) }
        });
      } else {
        useToastStore.getState().showToast({
          message: 'Download in progress...',
          type: 'info',
          action: { label: 'View', onPress: () => navigation.navigate('Library', { screen: 'DownloadsScreen' }) }
        });
      }
    } else {
      await downloadService.startDownload(db, activeTrack as any);
      useToastStore.getState().showToast({
        message: 'Downloading...',
        type: 'info',
        action: { label: 'View', onPress: () => navigation.navigate('Library', { screen: 'DownloadsScreen' }) }
      });
    }
  }, [activeTrack, db, isDownloaded, activeDownloadState]);

  // --- Dynamic UI Hooks & Physics ---
  const bgColor = usePlayerColors(activeTrack);

  const layoutHeight = Math.max(containerHeight || screenHeight, 500); // Failsafe minimum height
  const bottomTabBarHeight = getBottomTabBarHeight(insets.bottom) || 0;
  const MINI_PLAYER_BOTTOM_MARGIN = 2;

  const {
    queueTranslateY,
    QUEUE_COLLAPSED_Y,
    QUEUE_HALF_Y,
    QUEUE_EXPANDED_Y,
    queueProgress,
    queuePanGesture,
    HALF_PROGRESS,
  } = useQueuePhysics({ layoutHeight, insets, QUEUE_COLLAPSED_VISIBLE_HEIGHT });

  const {
    translateY,
    MINIPLAYER_Y,
    FULLSCREEN_Y,
    progress,
    panGesture,
  } = usePlayerPhysics({
    layoutHeight,
    bottomTabBarHeight,
    MINI_PLAYER_HEIGHT,
    MINI_PLAYER_BOTTOM_MARGIN,
    queueTranslateY,
    QUEUE_COLLAPSED_Y,
    isMiniPlayerVisible
  });




  // --- Hardware Back Button Handling ---
  useEffect(() => {
    const onBackPress = () => {
      if (queueTranslateY.value < QUEUE_COLLAPSED_Y - 100) {
        cancelAnimation(queueTranslateY);
        queueTranslateY.value = withSpring(QUEUE_COLLAPSED_Y, { damping: 25, stiffness: 250, mass: 0.5 });
        return true;
      }

      if (translateY.value < MINIPLAYER_Y - 100) {
        cancelAnimation(translateY);
        translateY.value = withSpring(MINIPLAYER_Y, { damping: 25, stiffness: 250, mass: 0.5 });
        queueTranslateY.value = withSpring(QUEUE_COLLAPSED_Y, { damping: 25, stiffness: 250, mass: 0.5 });
        return true;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [queueTranslateY, translateY, QUEUE_COLLAPSED_Y, MINIPLAYER_Y]);

  // --- Gesture Handlers ---
  // Gestures are now managed within the usePlayerPhysics and useQueuePhysics hooks

  const queueScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (event.contentOffset.y < -60) queueTranslateY.value = withSpring(QUEUE_COLLAPSED_Y, { damping: 25, stiffness: 250, mass: 0.5 });
    },
  });

  const queueFooterStyle = useAnimatedStyle(() => {
    return {
      height: queueTranslateY.value + insets.bottom + 45,
    };
  });

  // --- Base Animated Styles ---
  const bottomSheetStyle = useAnimatedStyle(() => {
    const clampedY = Math.min(Math.max(translateY.value, FULLSCREEN_Y), MINIPLAYER_Y);
    return { transform: [{ translateY: clampedY }] };
  });

  const miniplayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [0, 0.2], [0, 20], Extrapolation.CLAMP) }],
    pointerEvents: progress.value > 0.15 ? 'none' : 'auto',
  }));

  const fullscreenStyle = useAnimatedStyle(() => ({
    pointerEvents: progress.value < 0.15 ? 'none' : 'auto',
  }));

  const fullscreenBackgroundStyle = useAnimatedStyle(() => ({
    // Physically move the solid background out of bounds when collapsed to prevent Tab Bar overlays
    transform: [{ translateY: interpolate(progress.value, [0, 1], [layoutHeight, 0], Extrapolation.CLAMP) }],
  }));

  const topBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.1, 0.5], [0, 1], Extrapolation.CLAMP) * interpolate(queueProgress.value, [0, 0.3, 0.7], [1, 0.8, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(queueProgress.value, [0, 0.7], [0, -spacing.lg], Extrapolation.CLAMP) }],
    zIndex: 15,
    pointerEvents: queueProgress.value > 0.5 ? 'none' : 'auto',
  }));

  const queueSheetWrapperStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: queueTranslateY.value }],
  }));

  // --- Universal Morph Animations ---
  const isVideoModeAnim = useDerivedValue(() => {
    return isVideoMode ? 1 : 0;
  }, [isVideoMode]);

  const artworkStyle = useAnimatedStyle(() => {
    const isVideo = isVideoModeAnim.value;

    // State 1 (Miniplayer)
    const miniPlayerWidth = interpolate(isVideo, [0, 1], [48, 85]);
    const miniPlayerHeight = 48;
    const miniPlayerTop = 6;
    const miniPlayerLeft = 24;
    const miniPlayerRadius = 4;

    // Normal State (State 2)
    const normalWidth = interpolate(isVideo, [0, 1], [screenWidth - 60, screenWidth - 10]);
    const normalHeight = interpolate(isVideo, [0, 1], [screenWidth - 60, (screenWidth - 10) * (9 / 16)]);
    const normalLeft = interpolate(isVideo, [0, 1], [30, 5]);

    // Half State (State 3)
    const bleedWidth = screenWidth;
    const bleedHeight = interpolate(isVideo, [0, 1], [screenWidth * 0.85, screenWidth * (9 / 16)]);

    // Mini State (State 4 - queue full)
    const miniWidth = interpolate(isVideo, [0, 1], [48, 85]);
    const miniHeight = 48;

    const widthState2 = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [normalWidth, bleedWidth, miniWidth], Extrapolation.CLAMP);
    const heightState2 = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [normalHeight, bleedHeight, miniHeight], Extrapolation.CLAMP);
    const radiusState2 = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [12, 0, 6], Extrapolation.CLAMP);

    const videoTop0 = insets.top + 70 + (screenWidth - 60) + 20;
    const videoTopState2 = videoTop0 - normalHeight - 20;
    const imageTopState2 = insets.top + 70;
    const calculatedTopState2 = interpolate(isVideo, [0, 1], [imageTopState2, videoTopState2]);
    const topState2 = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [calculatedTopState2, 0, insets.top + 10], Extrapolation.CLAMP);

    const leftState2 = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [normalLeft, 0, 16], Extrapolation.CLAMP);

    const width = interpolate(progress.value, [0, 1], [miniPlayerWidth, widthState2], Extrapolation.CLAMP);
    const height = interpolate(progress.value, [0, 1], [miniPlayerHeight, heightState2], Extrapolation.CLAMP);
    const borderRadius = interpolate(progress.value, [0, 1], [miniPlayerRadius, radiusState2], Extrapolation.CLAMP);
    const top = interpolate(progress.value, [0, 1], [miniPlayerTop, topState2], Extrapolation.CLAMP);
    const left = interpolate(progress.value, [0, 1], [miniPlayerLeft, leftState2], Extrapolation.CLAMP);

    return {
      position: 'absolute',
      top, left, width, height, borderRadius,
      overflow: 'hidden', zIndex: 10,
    };
  });

  const artworkOverlayStyle = useAnimatedStyle(() => {
    // Only fade in during HALF_PROGRESS (State 3)
    const opacity = interpolate(
      queueProgress.value,
      [0, HALF_PROGRESS, 1],
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    // Ensure text overlay is hidden in Video Mode for proper visual hierarchy
    const videoOpacity = interpolate(isVideoModeAnim.value, [0, 1], [1, 0], Extrapolation.CLAMP);

    return {
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      height: 90, // Enough height for the gradient to smoothly fade behind text
      opacity: opacity * videoOpacity,
      zIndex: 2,
    };
  });

  const textMorphStyle = useAnimatedStyle(() => {
    const isVideo = isVideoModeAnim.value;
    // Calculate base height based on video vs artwork aspect ratio
    const normalHeight = interpolate(isVideo, [0, 1], [screenWidth - 60, (screenWidth - 10) * (9 / 16)]);

    // Fade out text entirely when sheet is collapsing into mini-player
    const opacity = interpolate(progress.value, [0.1, 0.5], [0, 1], Extrapolation.CLAMP);

    // --- State 2: Normal Fullscreen Player ---
    // Position text directly below the artwork/video
    const imageTop0 = insets.top + 70 + (screenWidth - 60) + 20;
    const videoTop0 = imageTop0;
    const top0 = interpolate(isVideo, [0, 1], [imageTop0, videoTop0]);

    // --- State 3: Queue Half-Open ---
    // Shift text upwards to sit tightly against the morphing artwork bleed
    const bleedHeight = interpolate(isVideo, [0, 1], [screenWidth * 0.85, screenWidth * (9 / 16)]);
    const topHalfImage = bleedHeight - 65;
    const topHalfVideo = bleedHeight + 15;
    const topHalf = interpolate(isVideo, [0, 1], [topHalfImage, topHalfVideo]);

    // --- State 4: Queue Fully Open ---
    // Snap text to the very top, acting as a small header bar
    const top1 = insets.top + 14;
    const top = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [top0, topHalf, top1], Extrapolation.CLAMP);

    // Calculate horizontal morphing (left padding)
    const left0 = interpolate(isVideo, [0, 1], [30, 16]); // Slightly align left in video mode
    const leftHalf = 20;
    const miniWidth = interpolate(isVideo, [0, 1], [48, 85]);
    const left1 = 16 + miniWidth + 16; // Shift text right to make room for the mini-artwork
    const left = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [left0, leftHalf, left1], Extrapolation.CLAMP);

    // Calculate horizontal morphing (right padding to avoid overlapping buttons)
    const right0 = 20;
    const rightHalf = 20;
    const right1 = 120; // Massive right padding when queue is fully open to avoid state3 buttons
    const right = interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [right0, rightHalf, right1], Extrapolation.CLAMP);

    return {
      position: 'absolute', top, left, right, zIndex: 11, overflow: 'hidden', opacity,
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    // Shrink header font size as queue covers the screen
    fontSize: interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [typography.header, typography.header, typography.body], Extrapolation.CLAMP),
    marginBottom: interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [spacing.xs, spacing.xs, 0], Extrapolation.CLAMP),
  }));

  const artistAnimatedStyle = useAnimatedStyle(() => ({
    // Shrink artist font size as queue covers the screen
    fontSize: interpolate(queueProgress.value, [0, HALF_PROGRESS, 1], [typography.bodyLg, typography.bodyLg, typography.caption], Extrapolation.CLAMP),
  }));

  const state3ButtonsStyle = useAnimatedStyle(() => {
    // Buttons (Play/More) only appear at the top right when queue is fully expanded
    const opacity = interpolate(queueProgress.value, [0.6, 0.9], [0, 1], Extrapolation.CLAMP);
    return {
      opacity, position: 'absolute', top: insets.top + 15, right: spacing.lg,
      flexDirection: 'row', alignItems: 'center',
      pointerEvents: queueProgress.value > 0.6 ? 'auto' : 'none', zIndex: 12,
    };
  });

  // --- Disappearing Controls ---
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

  // --- Action Handlers ---
  const handleExpand = useCallback(() => {
    translateY.value = withSpring(FULLSCREEN_Y, { damping: 25, stiffness: 250, mass: 0.5 });
    setExpanded(true);
  }, [FULLSCREEN_Y, translateY, setExpanded]);
  const handleCollapse = useCallback(() => {
    translateY.value = withSpring(MINIPLAYER_Y, { damping: 25, stiffness: 250, mass: 0.5 });
    queueTranslateY.value = withSpring(QUEUE_COLLAPSED_Y, { damping: 25, stiffness: 250, mass: 0.5 });
    setExpanded(false);
  }, [MINIPLAYER_Y, translateY, QUEUE_COLLAPSED_Y, queueTranslateY, setExpanded]);
  const handleToggleQueue = useCallback(() => {
    // If the queue is near the collapsed position (within 10px to account for float inaccuracy), open it to half
    if (Math.abs(queueTranslateY.value - QUEUE_COLLAPSED_Y) < 10) {
      queueTranslateY.value = withSpring(QUEUE_HALF_Y, { damping: 25, stiffness: 250, mass: 0.5 });
    } else {
      // Otherwise, close it fully
      queueTranslateY.value = withSpring(QUEUE_COLLAPSED_Y, { damping: 25, stiffness: 250, mass: 0.5 });
    }
  }, [QUEUE_COLLAPSED_Y, QUEUE_HALF_Y, queueTranslateY]);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0 && Math.abs(nextHeight - containerHeight) > 1) {
      setContainerHeight(nextHeight);
    }
  }, [containerHeight]);

  // --- Render Methods ---
  const renderQueueItem = useCallback(({ item, drag, isActive }: RenderItemParams<any>) => {
    return (
      <ScaleDecorator activeScale={1}>
        <QueueItemComponent
          track={item}
          isPlayingItem={activeTrack?.id === item.id}
          themeColors={themeColors}
          drag={drag}
          isActive={isActive}
        />
      </ScaleDecorator>
    );
  }, [activeTrack?.id, styles, themeColors]);

  const onScrollOffsetChange = useCallback((offset: number) => {
    if (offset < -60) queueTranslateY.value = withSpring(QUEUE_COLLAPSED_Y, { damping: 25, stiffness: 250, mass: 0.5 });
  }, [QUEUE_COLLAPSED_Y, queueTranslateY]);

  // --- Main Component Render ---
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.wrapper, bottomSheetStyle]} pointerEvents="box-none" onLayout={handleContainerLayout}>
        <Animated.View style={[styles.miniPlayerContainer, miniplayerStyle, { backgroundColor: bgColor }]}>
          <MiniPlayerComponent onExpand={handleExpand} track={activeTrack} isPlaying={isPlaying} isLoading={isLoading} isResolving={isResolving} iconColor={darkColors.white} isVideoMode={isVideoMode} />
        </Animated.View>

        <Animated.View style={[styles.fullscreenContainer, fullscreenStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, fullscreenBackgroundStyle, { backgroundColor: darkColors.background }]}>
            <LinearGradient
              colors={[bgColor, darkColors.background]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1.2 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: darkColors.overlayLight }]} />
          </Animated.View>

          <Animated.View style={[styles.topBar, { paddingTop: insets.top + 8 }, topBarStyle]}>
            <TopBarComponent onCollapse={handleCollapse} activeTrack={activeTrack} isVideoMode={isVideoMode} setIsVideoMode={setIsVideoMode} />
          </Animated.View>

          <FullscreenArtworkComponent
            activeTrack={activeTrack}
            isVideoMode={isVideoMode}
            isPlaying={isPlaying}
            isLoading={isLoading}
            onPlayPause={() => {
              if (isPlaying) usePlayerStore.getState().pause();
              else usePlayerStore.getState().resume();
            }}
            onOpenMenu={() => useActionSheetStore.getState().openSheet('track', activeTrack!, { isCurrentlyPlaying: true, isQueueItem: true })}
            styles={styles}
            darkColors={darkColors}
            artworkStyle={artworkStyle}
            artworkOverlayStyle={artworkOverlayStyle}
            textMorphStyle={textMorphStyle}
            titleAnimatedStyle={titleAnimatedStyle}
            artistAnimatedStyle={artistAnimatedStyle}
            state3ButtonsStyle={state3ButtonsStyle}
          />

          <View style={[styles.flexBottomSpacer, { paddingBottom: QUEUE_COLLAPSED_VISIBLE_HEIGHT + insets.bottom + 45 }]}>
            <Animated.View style={chipsDisappearingStyle}>
              <ActionChipsComponent
                activeTrack={activeTrack}
                isLiked={isLiked}
                onToggleLike={handleToggleLike}
                onDownload={handleDownload}
                themeColors={themeColors}
                isDownloaded={isDownloaded}
                activeDownloadState={activeDownloadState}
              />
            </Animated.View>

            <Animated.View style={playbackDisappearingStyle}>
              <PlaybackControlsComponent isPlaying={isPlaying} isLoading={isLoading} isResolving={isResolving} brandColor={themeColors.brand} />
            </Animated.View>
          </View>

          <Animated.View style={[styles.queueSheetWrapper, queueSheetWrapperStyle, { backgroundColor: darkColors.background }]}>
            <LinearGradient
              colors={[bgColor, darkColors.background]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1.2 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: darkColors.overlayLight }]} />

            <GestureDetector gesture={queuePanGesture}>
              <View style={styles.queueHeader}>
                <QueueHeaderComponent onToggleQueue={handleToggleQueue} queueProgress={queueProgress} brandColor={themeColors.brand} />
              </View>
            </GestureDetector>

            <DraggableFlatList
              data={explicitQueue}
              keyExtractor={keyExtractor}
              autoscrollThreshold={60}
              autoscrollSpeed={150}
              activationDistance={0}
              onDragEnd={handleDragEnd}
              renderItem={renderQueueItem}
              onScrollOffsetChange={onScrollOffsetChange}
              showsVerticalScrollIndicator={false}
              containerStyle={styles.queueScrollView}
              contentContainerStyle={contentContainerStyle}
              windowSize={5}
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              onEndReached={() => {
                const autoplay = useSettingsStore.getState().autoplay;
                if (autoplay) {
                  usePlayerStore.getState().loadMoreAutoPlayTracks();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                <QueueAutoPlayFooter
                  autoPlayQueue={autoPlayQueue}
                  activeTrack={activeTrack}
                  themeColors={themeColors}
                  styles={styles}
                  queueFooterStyle={queueFooterStyle}
                />
              }
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};
