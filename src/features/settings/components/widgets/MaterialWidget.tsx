import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { Play, SkipBack, SkipForward } from 'lucide-react-native';
import { typography, spacing, radius } from '@/theme';
import { darkColors } from '@/theme/colors';

interface MaterialWidgetProps {
  title?: string;
  artist?: string;
  artwork?: any;
}

export const MaterialWidget = React.memo(function MaterialWidget({
  title = "Diamond Eyes - Flutter",
  artist = "Flutter",
  artwork = require('@/assets/images/default_widget_art.webp')
}: MaterialWidgetProps) {
  const colors = darkColors;
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ImageBackground
        source={artwork}
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        <View style={[styles.overlay, { backgroundColor: colors.overlayLight }]}>
          <View style={styles.topRow}>
            <Text style={[styles.appName, { color: colors.textMuted }]}>HyperMusic</Text>
            <View style={[styles.controlButton, styles.playButton, { backgroundColor: colors.brand, shadowColor: colors.brand }]}>
              <Play color={colors.text} size={24} fill={colors.text} />
            </View>
          </View>
          <View style={styles.spacer} />
          <View style={styles.bottomRow}>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
              <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>{artist}</Text>
            </View>
            <View style={styles.secondaryControls}>
              <View style={[styles.smallControlButton, { backgroundColor: colors.highlight }]}>
                <SkipBack color={colors.text} size={20} />
              </View>
              <View style={[styles.smallControlButton, { backgroundColor: colors.highlight }]}>
                <SkipForward color={colors.text} size={20} />
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 180,
    borderRadius: radius.xl,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: spacing.xl,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    borderRadius: radius.xl,
  },
  overlay: {
    flex: 1,
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appName: {
    fontSize: typography.body,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  spacer: {
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    fontSize: typography.subtitle,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  artist: {
    fontSize: typography.body,
  },
  secondaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  smallControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  }
});
