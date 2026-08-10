import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { DynamicArtworkFallback, ArtworkContextType } from './DynamicArtworkFallback';
import { useTheme } from '@/theme';

export interface PremiumImageProps extends ImageProps {
  contextType?: ArtworkContextType;
  fallbackIconSize?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * A universal wrapper for expo-image that provides a context-aware 
 * premium fallback (DynamicArtworkFallback) while the image loads,
 * preventing black boxes on slow connections or broken URLs.
 */
export const PremiumImage: React.FC<PremiumImageProps> = ({
  source,
  contextType = 'track',
  style,
  containerStyle,
  fallbackIconSize = 24,
  transition = 200,
  contentFit = 'cover',
  ...restProps
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle, style]}>
      {/* Background Fallback (Always renders) */}
      <DynamicArtworkFallback
        contextType={contextType}
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceMuted }]}
        iconSize={fallbackIconSize}
      />

      {/* Foreground Network Image (Fades in over fallback on load) */}
      {source ? (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={transition}
          {...restProps}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden', // Ensures inner absolute elements respect borders/radius of the passed style
  },
});
