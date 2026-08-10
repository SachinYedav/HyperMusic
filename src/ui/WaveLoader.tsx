import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated as RNAnimated, Text } from 'react-native';
import { useTheme, spacing, typography } from '@/theme';

export const WaveLoader: React.FC = () => {
  const { colors } = useTheme();

  const anims = useRef([...Array(5)].map(() => new RNAnimated.Value(0.4))).current;

  useEffect(() => {
    const createAnimation = (anim: RNAnimated.Value, delay: number) => {
      return RNAnimated.sequence([
        RNAnimated.delay(delay),
        RNAnimated.loop(
          RNAnimated.sequence([
            RNAnimated.timing(anim, { toValue: 1.5, duration: 400, useNativeDriver: true }),
            RNAnimated.timing(anim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
          ])
        )
      ]);
    };

    RNAnimated.parallel([
      createAnimation(anims[0], 0),
      createAnimation(anims[1], 150),
      createAnimation(anims[2], 300),
      createAnimation(anims[3], 450),
      createAnimation(anims[4], 600),
    ]).start();
  }, []);

  return (
    <View style={styles.centerOverlay}>
      <View style={styles.waveContainer}>
        {anims.map((anim, idx) => (
          <RNAnimated.View
            key={idx}
            style={[styles.waveBar, { backgroundColor: colors.text, transform: [{ scaleY: anim }] }]}
          />
        ))}
      </View>
      <Text style={[styles.waveText, { color: colors.textMuted }]}>Wait a sec...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  centerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    marginBottom: spacing.sm,
  },
  waveBar: {
    width: 5,
    height: 20,
    borderRadius: 3,
  },
  waveText: {
    fontSize: typography.bodySm,
    fontWeight: '600',
    letterSpacing: 0.5,
  }
});
