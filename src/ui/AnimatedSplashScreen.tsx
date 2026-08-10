import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
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
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide the native splash screen as soon as the JS one is mounted and ready
    SplashScreen.hideAsync().catch(() => {});

    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.94,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

  }, []);

  useEffect(() => {
    if (isReady) {
      // Execute exit transition
      Animated.parallel([
        Animated.timing(containerScale, {
          toValue: 1.3,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationFinish();
      });
    }
  }, [isReady]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const outerSpinStyle = {
    transform: [{ rotate: spin }],
    position: 'absolute' as const,
    width: ICON_SIZE,
    height: ICON_SIZE,
  };

  const innerPulseStyle = {
    transform: [{ scale: scale }],
    position: 'absolute' as const,
    width: ICON_SIZE,
    height: ICON_SIZE,
  };

  const containerStyle = {
    opacity: containerOpacity,
    transform: [{ scale: containerScale }],
  };

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
