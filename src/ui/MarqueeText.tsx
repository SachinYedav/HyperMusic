import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withRepeat, 
  Easing, 
  cancelAnimation 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface MarqueeTextProps {
  children: string;
  style?: any;
  delay?: number;
  fadeColors?: [string, string];
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({ children, style, delay = 2000, fadeColors }) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);

  const gap = 50; 
  const shouldAnimate = textWidth > 0 && containerWidth > 0 && textWidth > containerWidth;

  useEffect(() => {
    cancelAnimation(translateX);
    translateX.value = 0;
    
    let timeoutId: ReturnType<typeof setTimeout>;

    if (shouldAnimate) {
      const distance = textWidth + gap;
      const duration = distance * 25; 
      
      timeoutId = setTimeout(() => {
        translateX.value = withRepeat(
          withTiming(-distance, { duration, easing: Easing.linear }),
          -1, 
          false
        );
      }, delay);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [textWidth, containerWidth, children, shouldAnimate, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View 
      style={styles.container} 
      onLayout={(e) => {
        setContainerWidth(Math.round(e.nativeEvent.layout.width));
      }}
    >
      <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false}>
        <Animated.View style={[animatedStyle, { flexDirection: 'row' }]}>
          <Animated.Text
            onLayout={(e) => {
              setTextWidth(Math.round(e.nativeEvent.layout.width));
            }}
            style={style}
            numberOfLines={1}
          >
            {children}
          </Animated.Text>

          {shouldAnimate && (
            <Animated.Text 
              style={[style, { paddingLeft: gap }]}
              numberOfLines={1}
            >
              {children}
            </Animated.Text>
          )}
        </Animated.View>
      </ScrollView>

      {fadeColors && shouldAnimate && (
        <>
          <LinearGradient
            colors={[fadeColors[0], fadeColors[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fadeLeft}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[fadeColors[1], fadeColors[0]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fadeRight}
            pointerEvents="none"
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
    position: 'relative',
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
  },
});
