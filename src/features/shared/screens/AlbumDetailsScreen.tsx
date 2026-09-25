import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, typography } from '@/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '@/navigation/types';
import { useImageColors } from '@/hooks/useImageColors';
import { TrackResultCard } from '../../search/components/TrackResultCard';
import { usePlayerStore } from '@/store';
import { useQuery } from '@tanstack/react-query';
import { extractorService } from '@/services/api/extractorService';
import { AnimatedEQ } from '@/ui/AnimatedEQ';

import { useSafeDatabase } from '@/database/useSafeDatabase';
import { getAlbumById, getAlbumTracks } from '@/database/queries';
import { useToastStore } from '@/store/useToastStore';
import { useArtistSelectionStore } from '@/store/useArtistSelectionStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { CollectionDetailsTemplate } from '@/features/shared/components/CollectionDetailsTemplate';

type Props = NativeStackScreenProps<HomeStackParamList, 'AlbumDetails'>;

export function AlbumDetailsScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const db = useSafeDatabase();
  const isLocal = route.params.id.startsWith('album_');
  const isSaved = useLibraryStore((state) => state.savedAlbumIds.has(route.params.id));

  const playList = usePlayerStore((state) => state.playList);
  const activeTrack = usePlayerStore((state) => state.activeTrack);

  const { data: albumData, isLoading, error, refetch } = useQuery({
    queryKey: ['album', route.params.id],
    queryFn: async ({ signal }) => {
      if (isLocal || isSaved) {
        if (!db) return null;
        const album = await getAlbumById(db, route.params.id);

        if (album) {
          const tracks = await getAlbumTracks(db, route.params.id);
          return {
            id: album.id,
            title: album.title,
            artworkUrl: album.coverUrl,
            thumbnail: album.coverUrl,
            artist: album.artist,
            year: album.year?.toString() || '',
            tracks: tracks,
            trackCount: tracks.length.toString(),
          } as any;
        }
      }

      const data = await extractorService.getAlbumDetails(route.params.id, { signal });
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: (isLocal || isSaved) ? !!db : true,
  });

  const { dominantColor } = useImageColors(albumData?.artworkUrl, { fallback: colors.border });

  const optimisticData = {
    title: albumData?.title || route.params.name || 'Loading...',
    artworkUrl: albumData?.artworkUrl || route.params.coverUrl || '',
    artist: albumData?.artist || '',
    year: albumData?.year || '',
    artistId: albumData?.artistId,
    artists: albumData?.artists,
    tracks: albumData?.tracks || [],
  };

  const mappedTracks = (optimisticData.tracks || []).map((t: any) => ({
    ...t,
    artwork: t.artworkUrl,
    trackType: 'song',
  }));

  const handleSave = async () => {
    if (db && albumData) {
      await useLibraryStore.getState().toggleAlbum(
        db,
        route.params.id,
        albumData.title,
        albumData.artist,
        albumData.artworkUrl
      );
      useToastStore.getState().showToast(isSaved ? 'Removed from library' : 'Added to library', isSaved ? 'info' : 'success');
    }
  };

  const renderTrackItem = ({ item, index }: { item: any; index: number }) => {
    const isPlaying = activeTrack?.id === item.id;
    return (
      <View style={styles.trackWrapper}>
        {isPlaying ? (
          <AnimatedEQ />
        ) : (
          <Text style={[styles.trackIndex, { color: colors.textMuted }]}>{index + 1}</Text>
        )}
        <View style={{ flex: 1 }}>
          <TrackResultCard
            track={item}
            isPlaying={isPlaying}
            hideEQOverlay={true}
            onPress={() => {
              if (optimisticData.tracks) {
                const mappedTracks = optimisticData.tracks.map((t: any) => ({
                  ...t,
                  artwork: t.artworkUrl,
                  trackType: 'song',
                }));
                playList(mappedTracks as unknown as any[], index);
              }
            }}
          />
        </View>
      </View>
    );
  };

  return (
    <CollectionDetailsTemplate
      title={optimisticData.title}
      artworkUrl={optimisticData.artworkUrl}
      dominantColor={dominantColor}
      subtitleComponent={
        optimisticData.artist ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Album •{' '}
            <Text
              onPress={() => {
                if (optimisticData.artists && optimisticData.artists.length > 1) {
                  useArtistSelectionStore.getState().openSheet(optimisticData.artists);
                } else if (optimisticData.artistId) {
                  navigation.navigate('ArtistProfile', {
                    id: (optimisticData.artists && optimisticData.artists.length === 1) ? optimisticData.artists[0].id : optimisticData.artistId,
                    artistName: (optimisticData.artists && optimisticData.artists.length === 1) ? optimisticData.artists[0].name : optimisticData.artist
                  });
                }
              }}
              style={optimisticData.artistId ? { textDecorationLine: 'underline' } : undefined}
            >
              {optimisticData.artist}
            </Text>{' '}
            {optimisticData.year ? `• ${optimisticData.year}` : ''}
          </Text>
        ) : null
      }
      tracks={optimisticData.tracks}
      mappedTracks={mappedTracks}
      isSaved={isSaved}
      onSave={handleSave}
      collectionId={route.params.id}
      collectionType="album"
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      renderItem={renderTrackItem}
      onPlay={(mapped) => playList(mapped)}
      onShuffle={(mapped) => playList(mapped, 0, true)}
    />
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: typography.bodySm,
    marginTop: spacing.xs,
  },
  trackWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  trackIndex: {
    width: 30,
    textAlign: 'center',
    fontSize: typography.bodySm,
    fontWeight: '600',
  },
});
