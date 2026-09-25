import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useTheme, spacing, typography, radius } from '@/theme';
import { PremiumImage } from '@/ui/PremiumImage';
import { useNavigation } from '@react-navigation/native';
import { useImageColors } from '@/hooks/useImageColors';
import { TrackResultCard } from '@/features/search/components/TrackResultCard';
import { usePlayerStore } from '@/store';

interface QuickPreviewCardProps {
  shelf: any;
  isSingleCard?: boolean;
}

const { width } = Dimensions.get('window');

export const QuickPreviewCard = React.memo(({ shelf, isSingleCard = false }: QuickPreviewCardProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const palette = useImageColors(shelf.artworkUrl, { fallback: colors.surface });
  const dominantColor = palette.dominantColor;
  const textContrastColor = palette.textContrastColor;

  const handleCardPress = () => {
    if (shelf.type === 'liked') {
      navigation.navigate('Library', { screen: 'LikedSongsScreen' });
    } else if (shelf.type === 'playlist') {
      navigation.navigate('PlaylistDetails', { id: shelf.id });
    } else if (shelf.type === 'album') {
      navigation.navigate('AlbumDetails', { id: shelf.id });
    }
  };

  const playList = usePlayerStore((state) => state.playList);
  const displayTracks = shelf.items?.slice(0, 3) || [];

  const handleTrackPress = (track: any, index: number) => {
    const formattedTracks = displayTracks.map((t: any) => ({
      id: t.id,
      title: t.title,
      artist: t.artist || t.subtitle || '',
      artwork: t.artworkUrl || t.thumbnail || '',
      url: '',
    }));
    playList(formattedTracks, index);
  };

  const cardWidth = isSingleCard ? width - (spacing.md * 2) : width * 0.85;

  return (
    <View style={[styles.container, { width: cardWidth }]}>
      <View style={[styles.card, { backgroundColor: dominantColor }]}>
        <Pressable
          onPress={handleCardPress}
          style={({ pressed }) => [styles.headerRow, { opacity: pressed ? 0.7 : 1 }]}
        >
          <PremiumImage
            source={{ uri: shelf.artworkUrl || '' }}
            contextType="playlist"
            fallbackIconSize={24}
            style={styles.headerArtwork}
          />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: textContrastColor }]} numberOfLines={1}>
              {shelf.title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: textContrastColor, opacity: 0.8 }]} numberOfLines={1}>
              {shelf.type === 'liked' ? 'Playlist • You' :
                shelf.type === 'playlist' ? 'Playlist' : 'Album'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.trackList}>
          {displayTracks.map((track: any, index: number) => (
            <TrackResultCard
              key={track.id + '-' + index}
              track={track}
              onPress={(t) => handleTrackPress(t, index)}
              textColor={textContrastColor}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.md,
  },
  card: {
    borderRadius: radius.md,
    overflow: 'hidden',
    padding: spacing.sm,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  headerArtwork: {
    width: 120,
    height: 120,
    borderRadius: radius.sm,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: typography.bodySm,
  },
  trackList: {
    gap: 4,
    borderRadius: radius.sm,
    minHeight: 180,
    padding: spacing.xs,
  }
});
