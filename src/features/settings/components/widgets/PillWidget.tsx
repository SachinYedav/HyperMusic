import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Play } from 'lucide-react-native';
import { typography, spacing, radius } from '@/theme';
import { darkColors } from '@/theme/colors';

interface PillWidgetProps {
  title?: string;
  artist?: string;
  artwork?: any;
}

export const PillWidget = React.memo(function PillWidget({
  title = "Diamond Eyes",
  artwork = require('@/assets/images/default_widget_art.webp')
}: PillWidgetProps) {
  const colors = darkColors;
  return (
    <View style={styles.container}>
      <Image source={artwork} style={[styles.artwork, { backgroundColor: colors.surfaceMuted }]} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      </View>
      <View style={[styles.playButton, { backgroundColor: colors.highlight }]}>
        <Play color={colors.text} size={16} fill={colors.text} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 60,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    paddingRight: spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: spacing.xl,
    backgroundColor: '#2C3E50'
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: typography.body,
    fontWeight: 'bold',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
