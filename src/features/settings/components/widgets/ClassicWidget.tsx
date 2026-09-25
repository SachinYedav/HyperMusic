import React from 'react';
import { View, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import { Play, SkipBack, SkipForward } from 'lucide-react-native';
import { typography, spacing, radius } from '@/theme';
import { darkColors } from '@/theme/colors';

interface ClassicWidgetProps {
  title?: string;
  artist?: string;
  artwork?: any;
}

export const ClassicWidget = React.memo(function ClassicWidget({
  title = "Diamond Eyes - Flutter",
  artist = "Flutter",
  artwork = require('@/assets/images/default_widget_art.webp')
}: ClassicWidgetProps) {
  const colors = darkColors;
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Image source={artwork} style={[styles.artwork, { backgroundColor: colors.surfaceMuted }]} />
      <ImageBackground
        source={artwork}
        style={styles.rightPanelBackground}
        blurRadius={40}
      >
        <View style={[styles.rightPanelOverlay, { backgroundColor: colors.overlay }]}>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>{artist}</Text>
          </View>
          <View style={styles.controls}>
            <SkipBack color={colors.text} size={20} />
            <View style={[styles.playButton, { backgroundColor: colors.highlight }]}>
              <Play color={colors.text} size={24} fill={colors.text} />
            </View>
            <SkipForward color={colors.text} size={20} />
          </View>
        </View>
      </ImageBackground>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 120,
    borderRadius: radius.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: spacing.xl,
  },
  artwork: {
    width: 120,
    height: 120,
  },
  rightPanelBackground: {
    flex: 1,
    height: 120,
  },
  rightPanelOverlay: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  textContainer: {
    paddingRight: spacing.sm,
  },
  title: {
    fontSize: typography.subtitle,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  artist: {
    fontSize: typography.body,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
