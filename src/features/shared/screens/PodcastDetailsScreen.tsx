import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, typography, radius } from '@/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '@/navigation/types';
import { useImageColors } from '@/hooks/useImageColors';
import { TrackResultCard } from '../../search/components/TrackResultCard';
import { usePlayerStore } from '@/store';
import { useQuery } from '@tanstack/react-query';
import { extractorService } from '@/services/api/extractorService';

import { useSafeDatabase } from '@/database/useSafeDatabase';
import { useToastStore } from '@/store/useToastStore';
import { CollectionDetailsTemplate } from '@/features/shared/components/CollectionDetailsTemplate';

type Props = NativeStackScreenProps<HomeStackParamList, 'PodcastDetails'>;

export function PodcastDetailsScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const db = useSafeDatabase();
  const isSaved = false;

  const playList = usePlayerStore((state) => state.playList);
  const activeTrack = usePlayerStore((state) => state.activeTrack);

  const { data: podcastData, isLoading, error, refetch } = useQuery({
    queryKey: ['podcast', route.params.id, !!db],
    queryFn: async ({ signal }) => {
      const data = await extractorService.getPodcastDetails(route.params.id, { signal });
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: true,
  });

  const { dominantColor } = useImageColors(podcastData?.artworkUrl, { fallback: colors.border });

  const optimisticData = {
    title: podcastData?.title || route.params.name || 'Loading...',
    artworkUrl: podcastData?.artworkUrl || route.params.coverUrl || '',
    creator: podcastData?.creator || '',
    creatorId: podcastData?.creatorId,
    episodes: podcastData?.episodes || [],
  };

  const mappedTracks = (optimisticData.episodes || []).map((t: any) => ({
    ...t,
    artwork: t.artworkUrl,
    trackType: 'podcast',
  }));

  const handleSave = async () => {
    useToastStore.getState().showToast('Podcast saving not supported yet', 'info');
  };

  const renderEpisodesHeader = () => (
    <View style={styles.episodesHeader}>
      <Text style={[styles.episodesTitle, { color: colors.text }]}>All Episodes</Text>
      <Text style={[styles.episodesCount, { color: colors.textMuted }]}>{optimisticData.episodes.length || 0} episodes</Text>
    </View>
  );

  const renderTrackItem = ({ item, index }: { item: any; index: number }) => {
    const isPlaying = activeTrack?.id === item.id;
    return (
      <View style={[styles.trackWrapper, { backgroundColor: isPlaying ? colors.overlayLight : 'transparent' }]}>
        <View style={{ flex: 1 }}>
          <TrackResultCard
            track={item}
            isPlaying={isPlaying}
            hideEQOverlay={true}
            onPress={() => {
              if (optimisticData.episodes.length > 0) {
                const mappedTracks = optimisticData.episodes.length > 0 ? optimisticData.episodes.map((t: any) => ({
                  ...t,
                  artwork: t.artworkUrl,
                  trackType: 'podcast',
                })) : [];
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
            Podcast •{' '}
            <Text
              onPress={() => {
                if (optimisticData.creatorId) {
                  navigation.navigate('ArtistProfile', { id: optimisticData.creatorId });
                }
              }}
              style={[{ color: colors.text }, optimisticData.creatorId ? { textDecorationLine: 'underline' } : undefined]}
            >
              {optimisticData.creator}
            </Text>
          </Text>
        ) : null
      }
      tracks={optimisticData.episodes}
      mappedTracks={mappedTracks}
      isSaved={isSaved || false}
      onSave={handleSave}
      collectionId={route.params.id}
      collectionType="podcast"
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      renderItem={renderTrackItem}
      ListHeaderComponent={renderEpisodesHeader()}
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
  episodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  episodesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  episodesCount: {
    fontSize: typography.bodySm,
  },
  trackWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
