import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PremiumImage } from '@/ui/PremiumImage';
import { useTheme, spacing, radius, typography } from '@/theme';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { MoreVertical, CheckCircle2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { AnimatedEQ } from '@/ui/AnimatedEQ';
import { useDownloadStore } from '@/features/library/store/useDownloadStore';

interface TrackResultCardProps {
  track: ExtractedTrack;
  onPress: (track: ExtractedTrack) => void;
  isPlaying?: boolean;
  hideEQOverlay?: boolean;
}

export const TrackResultCard: React.FC<TrackResultCardProps> = React.memo(({ track, onPress, isPlaying = false, hideEQOverlay = false }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { openSheet } = useActionSheetStore();
  
  const isDownloaded = useDownloadStore(state => !!state.completedDownloads[track.id]);

  const handleArtistPress = () => {
    if (track.artists && track.artists.length > 1) {
      import('@/store/useArtistSelectionStore').then(({ useArtistSelectionStore }) => {
        useArtistSelectionStore.getState().openSheet(track.artists!);
      });
      return;
    }

    const artistId = (track.artists && track.artists.length === 1) ? track.artists[0].id : track.artistId;
    const artistName = (track.artists && track.artists.length === 1) ? track.artists[0].name : track.artist;

    if (artistId) {
      if ((track as any).type === 'artist') {
        navigation.navigate('ArtistProfile', { 
          id: artistId, 
          artistName: track.title, 
          artworkUrl: track.artworkUrl 
        });
      } else {
        navigation.navigate('ArtistProfile', { 
          id: artistId, 
          artistName: artistName 
        });
      }
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(track)}
      activeOpacity={0.7}
    >
      <View>
        <PremiumImage 
          source={{ uri: track.artworkUrl }} 
          contextType={(track as any).type === 'artist' ? 'artist' : ((track as any).type || 'track')}
          style={[styles.artwork, { backgroundColor: colors.border }]} 
          fallbackIconSize={20}
        />
        {isPlaying && !hideEQOverlay && (
          <View style={[StyleSheet.absoluteFill, { borderRadius: radius.xs, overflow: 'hidden' }]}>
            <AnimatedEQ isOverlay />
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {track.title}
        </Text>
        <TouchableOpacity 
          onPress={handleArtistPress} 
          disabled={!track.artistId}
          hitSlop={{ top: 5, bottom: 5, left: 0, right: 0 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {isDownloaded && <CheckCircle2 size={14} color={colors.success} />}
            <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>
              {track.artist}{track.album && !track.artist.includes(track.album) ? ` • ${track.album}` : ''}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        style={styles.moreButton} 
        hitSlop={10}
        onPress={() => {
          const contextType = (track as any).type === 'artist' ? 'artist' 
            : (track as any).type === 'album' ? 'album'
            : (track as any).type === 'playlist' ? 'playlist'
            : 'track';
          openSheet(contextType, track);
        }}
      >
        <MoreVertical color={colors.text} size={20} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: radius.xs,
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.body,
    fontWeight: '500',
  },
  artist: {
    fontSize: typography.captionLg,
    marginTop: 2,
  },
  moreButton: {
    padding: spacing.xs,
  },
});
