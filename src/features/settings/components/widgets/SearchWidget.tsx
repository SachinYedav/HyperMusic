import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Play, Search } from 'lucide-react-native';
import { typography, spacing, radius } from '@/theme';
import { darkColors } from '@/theme/colors';

interface SearchWidgetProps {
  title?: string;
  artist?: string;
  artwork?: any;
}

export const SearchWidget = React.memo(function SearchWidget({
  title = "Diamond Eyes - Flutter",
  artist = "Flutter",
  artwork = require('@/assets/images/default_widget_art.webp'),
}: SearchWidgetProps) {
  const colors = darkColors;

  return (
    <View style={styles.container}>
      <View style={styles.currentTrackContainer}>
        <Image source={artwork} style={[styles.artwork, { backgroundColor: colors.surfaceMuted }]} />
        <View style={styles.textContainer}>
          <Text style={[styles.nowPlayingLabel, { color: colors.brand }]}>NOW PLAYING</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>{artist}</Text>
        </View>
        <View style={styles.controls}>
          <View style={[styles.playButton, { backgroundColor: colors.highlight }]}>
            <Play color={colors.text} size={24} fill={colors.text} />
          </View>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.highlightSubtle }]} />
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.highlight }]}>
          <Search color={colors.textSubtle} size={16} />
          <Text style={[styles.searchPlaceholder, { color: colors.textSubtle }]}>Search for music, artists...</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    backgroundColor: '#2C3E50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: spacing.lg,
  },
  currentTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  nowPlayingLabel: {
    fontSize: typography.captionSm,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    fontSize: typography.subtitle,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  artist: {
    fontSize: typography.body,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginBottom: spacing.md,
  },
  searchContainer: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  searchBar: {
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchPlaceholder: {
    fontSize: typography.body,
    fontWeight: '500',
    marginLeft: spacing.sm,
  }
});
