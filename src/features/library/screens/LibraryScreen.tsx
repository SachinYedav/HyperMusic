import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { Screen } from '@/ui/Screen';
import { LibraryFilterChips } from '../components/LibraryFilterChips';
import { LibraryListItem } from '../components/LibraryListItem';
import { LibraryEntityCard } from '../components/LibraryEntityCard';
import { FlashList } from '@shopify/flash-list';
import { usePlayerStore } from '@/store';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { useLikedSongs, usePlaylists, useArtists, useAlbums, useHistory } from '@/features/library/hooks/useLibrary';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { useToastStore } from '@/store/useToastStore';
import { useNavigation } from '@react-navigation/native';
import { DynamicBackground } from '@/ui/DynamicBackground';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { removeTrackFromHistory } from '@/database/queries';
import { DownloadCloud } from 'lucide-react-native';

/**
 * Central library hub aggregating offline SQLite persistence, liked tracks, user playlists, downloaded files, and heavy rotation history.
 */
export function LibraryScreen() {
  const { colors, isDark } = useTheme();
  const db = useSafeDatabase();
  const playTrack = usePlayerStore(state => state.playTrack);
  const { openSheet } = useActionSheetStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [filter, setFilter] = useState<string>('Songs');

  const likedSongs = useLikedSongs();
  const playlists = usePlaylists();
  const artists = useArtists();
  const albums = useAlbums();
  const history = useHistory();

  const handleTrackPress = React.useCallback((track: ExtractedTrack) => {
    playTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      artwork: track.artworkUrl,
      url: (track as any).localFilePath || '',
      trackType: (track as any).trackType || 'song',
    });
  }, [playTrack]);

  const keyExtractor = React.useCallback((item: any, index: number) => {
    if (filter === 'History') {
      return `${item.id}-${item.lastPlayedAt}-${index}`;
    }
    return item.id ? `${filter}-${item.id}-${index}` : `${filter}-fallback-${index}`;
  }, [filter]);

  const renderItem = React.useCallback(({ item }: { item: any }) => {
    if (filter === 'Songs') {
      return (
        <LibraryListItem
          track={item as ExtractedTrack}
          onPress={handleTrackPress}
          onMorePress={() => openSheet('track', item)}
        />
      );
    }
    if (filter === 'History') {
      return (
        <LibraryListItem
          track={item as ExtractedTrack}
          onPress={handleTrackPress}
          onMorePress={() => openSheet('track', item)}
          onDelete={(track) => {
            if (db) {
              removeTrackFromHistory(db, track.id);
              useToastStore.getState().showToast('Removed from history', 'info');
            }
          }}
        />
      );
    }
    if (filter === 'Artists') {
      return (
        <LibraryEntityCard
          type="artist"
          item={item}
          onPress={() => navigation.navigate('ArtistProfile', {
            id: item.id,
            artistName: item.name,
            artistThumbnail: item.avatarUrl,
            isLocal: false
          })}
          onMorePress={() => openSheet('artist', { ...item, isLocal: false })}
        />
      );
    }
    if (filter === 'Playlists') {
      return (
        <LibraryEntityCard
          type="playlist"
          item={item}
          onPress={() => navigation.navigate('PlaylistDetails', {
            id: item.id,
            title: item.name
          })}
          onMorePress={() => openSheet('playlist', { ...item, isLocal: true })}
        />
      );
    }
    if (filter === 'Albums') {
      return (
        <LibraryEntityCard
          type="album"
          item={item}
          onPress={() => navigation.navigate('AlbumDetails', {
            id: item.id,
            albumTitle: item.title,
            artistName: item.artist
          })}
          onMorePress={() => openSheet('album', { ...item, isLocal: true })}
        />
      );
    }
    return null;
  }, [filter, handleTrackPress, navigation, openSheet]);

  const data = filter === 'Songs' ? likedSongs : filter === 'Artists' ? artists : filter === 'Playlists' ? playlists : filter === 'Albums' ? albums : filter === 'History' ? history : [];

  return (
    <Screen disableSafeAreaBottom>
      <DynamicBackground />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Library</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('DownloadsScreen')}
            hitSlop={10}
            style={styles.downloadsButton}
          >
            <DownloadCloud color={colors.text} size={18} />
            <Text style={[styles.downloadsText, { color: colors.text }]}>Downloads</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <LibraryFilterChips selected={filter} onSelect={(f) => setFilter(f || 'Songs')} />
        <FlashList
          data={data as any[]}
          keyExtractor={keyExtractor}
          getItemType={() => filter}
          // @ts-ignore
          estimatedItemSize={filter === 'Artists' ? 88 : filter === 'Playlists' ? 220 : filter === 'Albums' ? 220 : 80}
          drawDistance={1000}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted }}>No data found for {filter}.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 170 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    borderRadius: radius.xl,
  },
  downloadsText: {
    fontSize: typography.bodySm,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});
