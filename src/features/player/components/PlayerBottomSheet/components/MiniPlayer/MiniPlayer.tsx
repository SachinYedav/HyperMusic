import React, { memo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react-native';
import { useProgress } from '@/features/player/hooks/usePlayerEngine';
import { usePlayerStore } from '@/store';
import { MarqueeText } from '@/ui/MarqueeText';
import { spacing, typography, radius } from '@/theme';
import { darkColors } from '@/theme/colors';

/**
 * The compact player view visible at the bottom of the screen when the sheet is collapsed.
 * Displays track info, play/pause controls, and a minimal progress bar.
 */
export const MiniPlayerComponent = memo(({
  onExpand, track, isPlaying, isLoading, isResolving, iconColor, isVideoMode
}: {
  onExpand: () => void, track: any, isPlaying: boolean, isLoading: boolean, isResolving: boolean, iconColor: string, isVideoMode: boolean
}) => {
  const rawProgress = useProgress();
  const position = isResolving ? 0 : rawProgress.position;
  const duration = isResolving ? 0 : rawProgress.duration;
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const playbackState = usePlayerStore((state) => state.playbackState);
  const togglePlayPause = () => {
    if (playbackState === 'error' && track) {
      usePlayerStore.getState().playTrack(track);
    } else if (isPlaying) {
      usePlayerStore.getState().pause();
    } else {
      usePlayerStore.getState().resume();
    }
  };

  const skipNext = () => usePlayerStore.getState().skipToNext();

  const widthAnim = useSharedValue(isVideoMode ? 85 : 48);
  useEffect(() => {
    widthAnim.value = withTiming(isVideoMode ? 85 : 48, { duration: 300 });
  }, [isVideoMode]);

  const artStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
    height: 48,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#000',
  }));

  return (
    <>
      <TouchableOpacity
        style={styles.miniPlayerInner}
        activeOpacity={0.95}
        onPress={onExpand}
      >
        <Animated.View style={artStyle} />
        <View style={styles.miniInfo}>
          <MarqueeText style={[styles.miniTitle, { color: iconColor }]}>{track?.title || 'Not Playing'}</MarqueeText>
          <Text style={[styles.miniArtist, { color: iconColor, opacity: 0.9 }]} numberOfLines={1}>{track?.artist || 'Unknown'}{track?.album && !track.artist?.includes(track.album) ? ` • ${track.album}` : ''}</Text>
        </View>
        <TouchableOpacity style={styles.miniBtn} onPress={togglePlayPause}>
          {playbackState === 'error' ? (
            <RotateCcw color={darkColors.error} size={22} />
          ) : isLoading ? (
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
        <View style={[styles.miniProgressFill, { width: `${progress}%`, backgroundColor: iconColor }]} />
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  miniPlayerInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
  },
  miniInfo: { flex: 1, flexShrink: 1, marginLeft: spacing.md, marginRight: spacing.sm, justifyContent: 'center', overflow: 'hidden' },
  miniTitle: { fontSize: typography.body, fontWeight: '700', letterSpacing: -0.2 },
  miniArtist: { fontSize: typography.captionLg, marginTop: 1 },
  miniBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.xs, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.5, shadowRadius: 3, elevation: 4 },
  miniProgressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  miniProgressFill: { height: '100%' },
});
