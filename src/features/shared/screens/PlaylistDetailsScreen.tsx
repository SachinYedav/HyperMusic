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

import { useToastStore } from '@/store/useToastStore';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { getPlaylistById, getPlaylistTracks } from '@/database/queries';
import { useLibraryStore } from '@/store/useLibraryStore';
import { CollectionDetailsTemplate } from '@/features/shared/components/CollectionDetailsTemplate';

type Props = NativeStackScreenProps<HomeStackParamList, 'PlaylistDetails'>;

export function PlaylistDetailsScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const playList = usePlayerStore((state) => state.playList);
  const activeTrack = usePlayerStore((state) => state.activeTrack);
  const db = useSafeDatabase();
  const isLocal = route.params.id.startsWith('playlist_') || route.params.id.startsWith('default_playlist_');
  const isSaved = useLibraryStore((state) => state.savedPlaylistIds.has(route.params.id));

  const { data: playlistData, isLoading, error, refetch } = useQuery({
    queryKey: ['playlist', route.params.id, !!db],
    queryFn: async ({ signal }) => {
      if (isLocal || isSaved) {
        if (!db) return null;
        const playlist = await getPlaylistById(db, route.params.id);
        
        if (playlist) {
          const tracks = await getPlaylistTracks(db, route.params.id);
          return {
            id: playlist.id,
            title: playlist.name,
            artworkUrl: playlist.coverUrl,
            thumbnail: playlist.coverUrl,
            tracks: tracks,
            creator: isLocal ? 'Local Playlist' : 'Saved Playlist',
            creatorId: undefined,
            trackCount: tracks.length.toString(),
          } as any;
        }
      }
      const data = await extractorService.getPlaylistDetails(route.params.id, { signal });
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: (isLocal || isSaved) ? !!db : true,
  });

  const { dominantColor } = useImageColors(playlistData?.artworkUrl, { fallback: colors.border });

  const optimisticData = {
    title: playlistData?.title || route.params.name || 'Loading...',
    artworkUrl: playlistData?.artworkUrl || route.params.coverUrl || '',
    creator: playlistData?.creator || '',
    trackCount: playlistData?.trackCount || '',
    creatorId: playlistData?.creatorId,
    tracks: playlistData?.tracks || [],
  };
  
  const mappedTracks = (optimisticData.tracks || []).map((t: any) => ({
    ...t,
    artwork: t.artworkUrl,
    trackType: 'song',
  }));

  const handleSave = async () => {
    if (db && playlistData) {
      await useLibraryStore.getState().togglePlaylist(
        db,
        route.params.id,
        playlistData.title,
        playlistData.artworkUrl
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
        optimisticData.creator ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            <Text
              onPress={() => {
                if (optimisticData.creatorId) {
                  navigation.navigate('ArtistProfile', { id: optimisticData.creatorId });
                }
              }}
              style={optimisticData.creatorId ? { textDecorationLine: 'underline' } : undefined}
            >
              {optimisticData.creator}
            </Text>{' '}
            {optimisticData.trackCount ? `• ${optimisticData.trackCount}` : ''}
          </Text>
        ) : null
      }
      tracks={optimisticData.tracks}
      mappedTracks={mappedTracks}
      isSaved={isSaved}
      onSave={handleSave}
      collectionId={route.params.id}
      collectionType="playlist"
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
