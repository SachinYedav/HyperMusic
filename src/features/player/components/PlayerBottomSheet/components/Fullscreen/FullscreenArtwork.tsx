import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { HyperVideoView } from 'react-native-hyper-player';
import { Play, Pause, MoreVertical } from 'lucide-react-native';
import { MarqueeText } from '@/ui/MarqueeText';
import { DynamicArtworkFallback } from '@/ui/DynamicArtworkFallback';
import { spacing } from '@/theme';

/**
 * FullscreenArtwork handles the dynamic artwork morphing layer, including video view,
 * title/artist typography, and the center state action buttons (Play/Pause/Menu).
 */
export const FullscreenArtworkComponent = React.memo(({
  activeTrack,
  isVideoMode,
  isPlaying,
  isLoading,
  onPlayPause,
  onOpenMenu,
  styles,
  darkColors,
  artworkStyle,
  artworkOverlayStyle,
  textMorphStyle,
  titleAnimatedStyle,
  artistAnimatedStyle,
  state3ButtonsStyle,
}: any) => {
  return (
    <>
      <Animated.View style={artworkStyle} pointerEvents="none">
        {isVideoMode ? (
          <HyperVideoView style={localStyles.full} />
        ) : activeTrack?.artwork ? (
          <Image source={activeTrack.artwork} style={localStyles.full} contentFit="cover" />
        ) : (
          <DynamicArtworkFallback contextType="track" style={localStyles.full} iconSize={64} />
        )}

        <Animated.View style={artworkOverlayStyle}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View style={textMorphStyle}>
        <MarqueeText style={[styles.songTitle, titleAnimatedStyle]} delay={1000}>
          {activeTrack?.title || 'Not Playing'}
        </MarqueeText>
        <Animated.Text style={[styles.songArtist, artistAnimatedStyle]} numberOfLines={1}>
          {activeTrack?.artist || 'Unknown'}{activeTrack?.album && !activeTrack.artist?.includes(activeTrack.album) ? ` • ${activeTrack.album}` : ''}
        </Animated.Text>
      </Animated.View>

      <Animated.View style={state3ButtonsStyle}>
        <TouchableOpacity style={{ padding: spacing.sm }} onPress={onPlayPause}>
          {isLoading ? (
            <ActivityIndicator color={darkColors.white} size="small" />
          ) : isPlaying ? (
            <Pause color={darkColors.white} size={26} fill={darkColors.white} />
          ) : (
            <Play color={darkColors.white} size={26} fill={darkColors.white} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: spacing.sm, marginLeft: spacing.md }} onPress={onOpenMenu}>
          <MoreVertical color={darkColors.white} size={26} />
        </TouchableOpacity>
      </Animated.View>
    </>
  );
});

const localStyles = StyleSheet.create({
  full: { flex: 1, width: '100%', height: '100%' }
});
