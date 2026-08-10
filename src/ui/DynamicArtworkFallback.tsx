import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Music3, Music4, Disc, MicSignal, User, Image as ImageIcon } from 'lucide-react-native';
import { useTheme } from '@/theme';

export type ArtworkContextType = 'track' | 'playlist' | 'album' | 'podcast' | 'podcast_show' | 'artist' | 'song';

export interface DynamicArtworkFallbackProps {
  contextType?: ArtworkContextType;
  style?: ViewStyle | ViewStyle[];
  iconSize?: number;
}

/**
 * A context-aware fallback component that displays a relevant Lucide icon 
 * on a subtle background when artwork is missing or fails to load.
 */
export const DynamicArtworkFallback: React.FC<DynamicArtworkFallbackProps> = ({
  contextType = 'track',
  style,
  iconSize = 32
}) => {
  const { colors } = useTheme();

  const getIcon = () => {
    switch (contextType) {
      case 'track':
      case 'song':
        return <Music3 size={iconSize} color={colors.textMuted} />;
      case 'playlist':
        return <Music4 size={iconSize} color={colors.textMuted} />;
      case 'album':
        return <Disc size={iconSize} color={colors.textMuted} />;
      case 'podcast':
      case 'podcast_show':
        return <MicSignal size={iconSize} color={colors.textMuted} />;
      case 'artist':
        return <User size={iconSize} color={colors.textMuted} />;
      default:
        return <ImageIcon size={iconSize} color={colors.textMuted} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.border }, style]}>
      {getIcon()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
