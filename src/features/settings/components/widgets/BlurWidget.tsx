import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { Play, SkipBack, SkipForward } from 'lucide-react-native';
import { typography, spacing, radius } from '@/theme';
import { darkColors } from '@/theme/colors';

interface BlurWidgetProps {
  title?: string;
  artist?: string;
  artwork?: any;
}

export const BlurWidget = React.memo(function BlurWidget({
  title = "Diamond Eyes - Flutter",
  artist = "Flutter",
  artwork = require('@/assets/images/default_widget_art.webp')
}: BlurWidgetProps) {
  const colors = darkColors;
  return (
    <View style={styles.container}>
      <ImageBackground
        source={artwork}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        blurRadius={20}
      >
        <View style={[styles.overlay, { backgroundColor: colors.overlayLight }]}>
          <View style={styles.header}>
            <Text style={[styles.appName, { color: colors.textMuted }]}>HyperMusic</Text>
          </View>
          <View style={styles.spacer} />
          <View style={styles.bottomRow}>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
              <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>{artist}</Text>
            </View>

            <View style={styles.controls}>
              <View style={[styles.controlButton, { backgroundColor: colors.highlight }]}>
                <SkipBack color={colors.text} size={16} />
              </View>
              <View style={[styles.controlButton, styles.playButton, { backgroundColor: colors.highlightStrong }]}>
                <Play color={colors.text} size={20} fill={colors.text} />
              </View>
              <View style={[styles.controlButton, { backgroundColor: colors.highlight }]}>
                <SkipForward color={colors.text} size={16} />
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
    height: 160,
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
  },
  backgroundImage: {
    borderRadius: radius.xl,
  },
  overlay: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
  },
  appName: {
    fontSize: typography.caption,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  spacer: {
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    fontSize: typography.title,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  artist: {
    fontSize: typography.body,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  }
});
