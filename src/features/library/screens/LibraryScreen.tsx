import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { Screen } from '@/ui/Screen';
import { AppConfirmModal } from '@/ui/AppConfirmModal';
import { LibraryFilterChips } from '../components/LibraryFilterChips';
import { LibraryListItem } from '../components/LibraryListItem';
import { LibraryPlaylistCard } from '../components/LibraryPlaylistCard';
import { LibraryAlbumCard } from '../components/LibraryAlbumCard';
import { LibraryArtistRow } from '../components/LibraryArtistRow';
import { FlashList } from '@shopify/flash-list';
import { usePlayerStore } from '@/store';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { useLikedSongs, usePlaylists, useArtists, useAlbums, useHistory } from '@/features/library/hooks/useLibrary';
import { clearHistory } from '@/features/library/services/historyService';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DownloadCloud, Trash2 } from 'lucide-react-native';

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
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
    });
  }, [playTrack]);

  const keyExtractor = React.useCallback((item: any, index: number) => {
    if (filter === 'Songs') return `song-${item.id}`;
    if (filter === 'Artists') return `artist-${item.artist}`;
    if (filter === 'Playlists') return `playlist-${item.id}`;
    if (filter === 'Albums') return `album-${item.id}`;
    if (filter === 'History') return `history-${item.id}-${index}`;
    return index.toString();
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
        />
      );
    }
    if (filter === 'Artists') {
      return (
        <LibraryArtistRow
          artist={item as any}
          onPress={() => navigation.navigate('ArtistProfile', {
            id: item.artistId || item.artist,
            artistName: item.artist,
            isLocal: true
          })}
          onMorePress={() => openSheet('artist', { ...item, isLocal: true })}
        />
      );
    }
    if (filter === 'Playlists') {
      return (
        <LibraryPlaylistCard
          playlist={item as any}
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
        <LibraryAlbumCard
          album={item as any}
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
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={
            isDark
              ? ['rgba(99, 102, 241, 0.25)', 'rgba(139, 92, 246, 0.18)', 'rgba(217, 70, 239, 0.08)', colors.background]
              : ['rgba(99, 102, 241, 0.12)', 'rgba(139, 92, 246, 0.08)', 'rgba(217, 70, 239, 0.04)', colors.background]
          }
          locations={[0, 0.25, 0.5, 0.8]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
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
          {filter === 'History' && history.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowClearConfirm(true)}
              hitSlop={10}
              style={styles.clearButton}
            >
              <Trash2 color={colors.text} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <LibraryFilterChips selected={filter} onSelect={(f) => setFilter(f || 'Songs')} />
        <FlashList
          data={data as any[]}
          keyExtractor={keyExtractor}
          getItemType={() => filter}
          // @ts-ignore
          estimatedItemSize={80}
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

      <AppConfirmModal
        visible={showClearConfirm}
        title="Clear History"
        message="Are you sure you want to clear your entire listening history? This will reset your Heavy Rotation and recent vibes."
        cancelText="Cancel"
        confirmText="Clear"
        isDestructive
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={() => {
          if (db) clearHistory(db);
          setShowClearConfirm(false);
        }}
      />
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
  clearButton: {
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 50, 50, 0.15)',
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
