import React, { memo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, RotateCcw } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useProgress } from '@/features/player/hooks/usePlayerEngine';
import { usePlayerStore } from '@/store';
import { darkColors } from '@/theme/colors';
import { spacing, radius, typography } from '@/theme';

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Fullscreen playback controls including the timeline slider, play/pause, 
 * skip previous/next, shuffle, and repeat toggles. Handles optimistic UI seeking.
 */
export const PlaybackControlsComponent = memo(({ isPlaying, isLoading, isResolving, brandColor }: { isPlaying: boolean, isLoading: boolean, isResolving: boolean, brandColor: string }) => {
  const isShuffle = usePlayerStore((state) => state.isShuffle);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const activeTrack = usePlayerStore((state) => state.activeTrack);

  const rawProgress = useProgress();
  const position = isResolving ? 0 : rawProgress.position;
  const duration = isResolving ? 0 : rawProgress.duration;

  const [isSliding, setIsSliding] = useState(false);
  const [localPosition, setLocalPosition] = useState(0);
  const [optimisticPosition, setOptimisticPosition] = useState<number | null>(null);

  const togglePlayPause = () => {
    if (playbackState === 'error' && activeTrack) {
      usePlayerStore.getState().playTrack(activeTrack);
    } else if (isPlaying) {
      usePlayerStore.getState().pause();
    } else {
      usePlayerStore.getState().resume();
    }
  };

  const onSlidingStart = () => {
    setIsSliding(true);
    setLocalPosition(optimisticPosition !== null ? optimisticPosition : position);
  };

  const onValueChange = (val: number) => {
    setLocalPosition(val);
  };

  const onSlidingComplete = (value: number) => {
    setIsSliding(false);
    setOptimisticPosition(value);
    usePlayerStore.getState().seekTo(value * 1000); // HyperPlayer takes Ms
  };

  useEffect(() => {
    // Clear optimistic position when real position catches up or starts playing
    if (optimisticPosition !== null && (Math.abs(position - optimisticPosition) < 3 || isPlaying)) {
      setOptimisticPosition(null);
    }
  }, [position, isPlaying, optimisticPosition]);

  const sweepTranslateX = useSharedValue(-200);

  useEffect(() => {
    if (isLoading) {
      sweepTranslateX.value = withRepeat(
        withTiming(400, { duration: 1500 }),
        -1, 
        false
      );
    } else {
      sweepTranslateX.value = -200;
    }
  }, [isLoading]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweepTranslateX.value }],
  }));

  const displayPosition = isSliding ? localPosition : (optimisticPosition !== null ? optimisticPosition : position);

  return (
    <>
      <View style={styles.timelineContainer}>
        <View style={{ height: 40, justifyContent: 'center' }}>
          {isLoading ? (
            <View style={{ width: '100%', height: 4, backgroundColor: darkColors.white, opacity: 0.2, borderRadius: 2, overflow: 'hidden' }}>
              <Animated.View style={[{ width: 150, height: '100%', backgroundColor: darkColors.white, opacity: 0.8 }, sweepStyle]} />
            </View>
          ) : (
            <View collapsable={false} style={{ width: '100%', height: 40 }}>
              <Slider
                style={{ width: '100%', height: 40 }}
                value={displayPosition}
                minimumValue={0}
                maximumValue={duration || 1}
                onSlidingStart={onSlidingStart}
                onValueChange={onValueChange}
                onSlidingComplete={onSlidingComplete}
                minimumTrackTintColor={darkColors.white}
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor={darkColors.white}
              />
            </View>
          )}
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>{formatTime(displayPosition)}</Text>
          <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.playbackRow}>
        <TouchableOpacity onPress={() => usePlayerStore.getState().toggleShuffle()}>
          <Shuffle size={24} color={isShuffle ? brandColor : darkColors.white} opacity={isShuffle ? 1 : 0.5} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => usePlayerStore.getState().skipToPrevious()}>
          <SkipBack size={32} color={darkColors.white} fill={darkColors.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.playCircle} onPress={togglePlayPause}>
          {playbackState === 'error' ? (
            <RotateCcw size={28} color={darkColors.error} />
          ) : isLoading ? (
            <ActivityIndicator color={darkColors.background} size="large" />
          ) : isPlaying ? (
            <Pause size={32} color={darkColors.background} fill={darkColors.background} />
          ) : (
            <Play size={32} color={darkColors.background} fill={darkColors.background} style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => usePlayerStore.getState().skipToNext()}>
          <SkipForward size={32} color={darkColors.white} fill={darkColors.white} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => usePlayerStore.getState().toggleRepeat()}>
          {repeatMode === 'one' ? (
            <Repeat1 size={24} color={brandColor} />
          ) : (
            <Repeat size={24} color={repeatMode === 'all' ? brandColor : darkColors.white} opacity={repeatMode === 'all' ? 1 : 0.5} />
          )}
        </TouchableOpacity>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  timelineContainer: { paddingHorizontal: spacing.xl },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  timeLabel: { color: darkColors.white, opacity: 0.5, fontSize: typography.caption, fontWeight: '500' },
  playbackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  playCircle: { width: 68, height: 68, backgroundColor: darkColors.white, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center' },
});
