import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import * as SplashScreen from 'expo-splash-screen';

interface AnimatedSplashScreenProps {
  isReady: boolean;
  onAnimationFinish: () => void;
}

const ICON_SIZE = 100;

/**
 * Custom animated splash screen masking native handover with smooth continuous ring rotation and pulse effects.
 */
export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  isReady,
  onAnimationFinish,
}) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.94, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Frame-synced hand-off: Drop native splash exactly when the Reanimated frame is fully painted on the screen
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (isReady) {
      // Execute exit transition
      containerScale.value = withTiming(1.3, { duration: 400, easing: Easing.out(Easing.ease) });
      containerOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }, () => {
        runOnJS(onAnimationFinish)();
      });
    }
  }, [isReady]);

  const outerSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
  }));

  const innerPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.iconContainer}>
        <Animated.View style={outerSpinStyle}>
          <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 2a10 10 0 1 1-10 10"
              stroke="#DC143C"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>

        <Animated.View style={innerPulseStyle}>
          <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="6" stroke="#DC143C" strokeWidth={2.5} />
            <Path d="M10.5 9.5 15 12l-4.5 2.5v-5z" fill="#DC143C" stroke="none" />
          </Svg>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
  },
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
