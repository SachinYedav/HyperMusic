import React, { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
} from 'react-native-reanimated';
import { usePlayerStore } from '@/store';
import { useTheme } from '@/theme';

interface AnimatedEQProps {
  color?: string;
  isOverlay?: boolean;
}

/**
 * Memoized audio equalizer animation indicating live track playback activity via oscillating vertical bars.
 */
export const AnimatedEQ = memo(({ color, isOverlay = false }: AnimatedEQProps) => {
  const { colors } = useTheme();
  const eqColor = color || colors.brand;
  const playbackState = usePlayerStore((state) => state.playbackState);
  const isPlaying = playbackState === 'playing';

  const h1 = useSharedValue(4);
  const h2 = useSharedValue(4);
  const h3 = useSharedValue(4);

  useEffect(() => {
    if (isPlaying) {
      h1.value = withRepeat(withSequence(withTiming(14, { duration: 350 }), withTiming(4, { duration: 350 })), -1, true);
      h2.value = withRepeat(withSequence(withTiming(18, { duration: 400 }), withTiming(4, { duration: 400 })), -1, true);
      h3.value = withRepeat(withSequence(withTiming(12, { duration: 300 }), withTiming(4, { duration: 300 })), -1, true);
    } else {
      cancelAnimation(h1);
      cancelAnimation(h2);
      cancelAnimation(h3);
      h1.value = withTiming(4, { duration: 300 });
      h2.value = withTiming(4, { duration: 300 });
      h3.value = withTiming(4, { duration: 300 });
    }
  }, [isPlaying]);

  return (
    <View style={[isOverlay ? styles.overlayContainer : styles.container, isOverlay && { backgroundColor: colors.overlay }]}>
      <Animated.View style={[styles.bar, { height: h1, backgroundColor: eqColor }]} />
      <Animated.View style={[styles.bar, { height: h2, backgroundColor: eqColor }]} />
      <Animated.View style={[styles.bar, { height: h3, backgroundColor: eqColor }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    height: 20,
    width: 24,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
