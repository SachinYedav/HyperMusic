import React, { useState, useCallback, useDeferredValue } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { Screen } from '@/ui/Screen';
import { WaveLoader } from '@/ui/WaveLoader';
import { LibraryFilterChips } from '../components/LibraryFilterChips';
import { LibraryListItem } from '../components/LibraryListItem';
import { LibraryEntityCard } from '../components/LibraryEntityCard';
import { LibraryGridCard } from '../components/LibraryGridCard';
import { LibrarySortBar, SortMode, ViewMode } from '../components/LibrarySortBar';
import { LibraryShortcutCard } from '../components/LibraryShortcutCard';
import { FlashList } from '@shopify/flash-list';
import { usePlayerStore } from '@/store';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { useLikedSongs, useDownloadedSongs, usePlaylists, useArtists, useAlbums, useHistory } from '@/features/library/hooks/useLibrary';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { useToastStore } from '@/store/useToastStore';
import { useNavigation } from '@react-navigation/native';
import { DynamicBackground } from '@/ui/DynamicBackground';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { deleteHistoryItem } from '../services/historyService';
import { ArrowDownCircle, Heart, ArrowDownToLine } from 'lucide-react-native';
import { useLibrarySettingsStore } from '@/store/useLibrarySettingsStore';
import { AppConfirmSheet } from '@/ui/AppConfirmSheet';
import { downloadService } from '../services/downloadService';
import { useDeviceFiles } from '../hooks/useDeviceFiles';

/**
 * Central library hub aggregating offline SQLite persistence, liked tracks, user playlists, downloaded files, and heavy rotation history.
 */
export function LibraryScreen() {
  const { colors, isDark } = useTheme();
  const db = useSafeDatabase();
  const playList = usePlayerStore(state => state.playList);
  const { openSheet } = useActionSheetStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [activeChip, setActiveChip] = useState<string | null>(null);
  const deferredChip = useDeferredValue(activeChip);
  const isLoading = activeChip !== deferredChip;

  const handleFilterChange = useCallback((f: string | null) => {
    setActiveChip(f);
  }, []);

  const { sortMode, viewMode, setSortMode, setViewMode } = useLibrarySettingsStore();
  const downloadedSongs = useDownloadedSongs();
  const likedSongs = useLikedSongs();
  const playlists = usePlaylists();
  const artists = useArtists();
  const albums = useAlbums();
  const history = useHistory();
  const { files: deviceFiles, permissionStatus, requestPermission, isScanning } = useDeviceFiles(deferredChip === 'From Device');

  const [downloadToDelete, setDownloadToDelete] = useState<ExtractedTrack | null>(null);

  const keyExtractor = React.useCallback((item: any, index: number) => {
    if (deferredChip === 'History') {
      return `${item.id}-${item.lastPlayedAt}-${index}`;
    }
    if (deferredChip === null) {
      return `overview-${item.entityType}-${item.id}-${index}`;
    }
    return item.id ? `${deferredChip}-${item.id}-${index}` : `${deferredChip}-fallback-${index}`;
  }, [deferredChip]);

  const handleSortChange = useCallback((mode: SortMode) => {
    setSortMode(mode);
  }, [setSortMode]);

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, [setViewMode]);

  // 1. Base Data: Force wipe instantly while loading. For Overview (null), mix latest playlists, albums, and artists.
  const baseData = React.useMemo(() => {
    if (isLoading) return [];
    if (deferredChip === null) {
      const recentPlaylists = playlists.map(p => ({ ...p, entityType: 'playlist', timeStamp: p.updatedAt || p.createdAt || 0 }));
      const recentAlbums = albums.map(a => ({ ...a, entityType: 'album', timeStamp: a.updatedAt || a.createdAt || 0 }));
      const recentArtists = artists.map(a => ({ ...a, entityType: 'artist', timeStamp: a.savedAt || 0 }));

      const mixed = [...recentPlaylists, ...recentAlbums, ...recentArtists];
      mixed.sort((a, b) => b.timeStamp - a.timeStamp);
      return mixed.slice(0, 20);
    }
    return deferredChip === 'Downloads' ? downloadedSongs : deferredChip === 'Artists' ? artists : deferredChip === 'Playlists' ? playlists : deferredChip === 'Albums' ? albums : deferredChip === 'History' ? history : deferredChip === 'From Device' ? deviceFiles : [];
  }, [isLoading, deferredChip, history, downloadedSongs, artists, playlists, albums, deviceFiles]);

  // 2. Sort Filter
  const data = React.useMemo(() => {
    if (sortMode === 'Alphabetical') {
      return [...baseData].sort((a: any, b: any) => {
        const aTitle = (a.title || a.name || '').toLowerCase();
        const bTitle = (b.title || b.name || '').toLowerCase();
        return aTitle.localeCompare(bTitle);
      });
    }
    return baseData;
  }, [baseData, sortMode]);

  const handleTrackListPress = React.useCallback((index: number) => {
    const queue = data.map((d: any) => ({
      id: d.id,
      title: d.title,
      artist: d.artist,
      duration: d.duration,
      artwork: d.localArtworkPath ? (d.localArtworkPath.startsWith('file://') ? d.localArtworkPath : `file://${d.localArtworkPath}`) : d.artworkUrl,
      url: d.trackType?.startsWith('local_device') ? d.url : (d.localFilePath ? (d.localFilePath.startsWith('file://') ? d.localFilePath : `file://${d.localFilePath}`) : ''),
      trackType: d.trackType || 'song',
    }));
    playList(queue as any[], index);
  }, [data, playList]);

  const renderItem = React.useCallback(({ item, index }: { item: any; index: number }) => {
    if (deferredChip === 'Downloads') {
      return (
        <LibraryListItem
          track={item as ExtractedTrack}
          onPress={() => handleTrackListPress(index)}
          onMorePress={() => openSheet('track', item)}
          onDelete={(track) => setDownloadToDelete(track)}
        />
      );
    }
    if (deferredChip === 'From Device') {
      return (
        <LibraryListItem
          track={item as ExtractedTrack}
          onPress={() => handleTrackListPress(index)}
          onMorePress={undefined} // Hidden to prevent unsupported DB actions
        />
      );
    }
    if (deferredChip === 'History') {
      return (
        <LibraryListItem
          track={item as ExtractedTrack}
          onPress={() => handleTrackListPress(index)}
          onMorePress={() => openSheet('track', item)}
          onDelete={async (track) => {
            if (db) {
              await deleteHistoryItem(db, track.id);
              useToastStore.getState().showToast('Removed from history', 'info');
            }
          }}
        />
      );
    }
    if (deferredChip === null) {
      const CardComponent = viewMode === 'grid' ? LibraryGridCard : LibraryEntityCard;
      if (item.entityType === 'artist') {
        return (
          <CardComponent
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
      } else if (item.entityType === 'playlist') {
        return (
          <CardComponent
            type="playlist"
            item={item}
            onPress={() => navigation.navigate('PlaylistDetails', { id: item.id, title: item.name })}
            onMorePress={() => openSheet('playlist', { ...item, isLocal: true })}
          />
        );
      } else if (item.entityType === 'album') {
        return (
          <CardComponent
            type="album"
            item={item}
            onPress={() => navigation.navigate('AlbumDetails', { id: item.id, albumTitle: item.title, artistName: item.artist })}
            onMorePress={() => openSheet('album', { ...item, isLocal: true })}
          />
        );
      }
      return null;
    }
    if (deferredChip === 'Artists') {
      const CardComponent = viewMode === 'grid' ? LibraryGridCard : LibraryEntityCard;
      return (
        <CardComponent
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
    if (deferredChip === 'Playlists') {
      const CardComponent = viewMode === 'grid' ? LibraryGridCard : LibraryEntityCard;
      return (
        <CardComponent
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
    if (deferredChip === 'Albums') {
      const CardComponent = viewMode === 'grid' ? LibraryGridCard : LibraryEntityCard;
      return (
        <CardComponent
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
  }, [deferredChip, viewMode, handleTrackListPress, navigation, openSheet, db]);

  const renderListHeader = useCallback(() => {
    if (isLoading || deferredChip !== null) return null;
    return (
      <View style={{ marginBottom: spacing.md, gap: spacing.md }}>
        <LibraryShortcutCard
          title="Liked Songs"
          subtitle={`${likedSongs.length} song${likedSongs.length === 1 ? '' : 's'}`}
          icon={<Heart color={colors.white} size={32} fill={colors.white} />}
          gradientColors={['#4F46E5', '#7C3AED']}
          onPress={() => navigation.navigate('LikedSongsScreen')}
        />
        <LibraryShortcutCard
          title="Downloaded"
          subtitle={`${downloadedSongs.length} song${downloadedSongs.length === 1 ? '' : 's'} offline`}
          icon={<ArrowDownToLine color={colors.white} size={32} />}
          gradientColors={['#3B82F6', '#2563EB']}
          onPress={() => handleFilterChange('Downloads')}
        />
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
          <Text style={{ fontSize: typography.bodyLg, fontWeight: 'bold', color: colors.text }}>Recent activity</Text>
        </View>
      </View>
    );
  }, [isLoading, deferredChip, likedSongs.length, downloadedSongs.length, colors, navigation, handleFilterChange]);

  const renderListEmpty = useCallback(() => {
    if (isLoading || (deferredChip === 'From Device' && isScanning)) return null;
    return (
      <View style={{ padding: 32, alignItems: 'center', gap: spacing.md }}>
        {deferredChip === 'From Device' && permissionStatus !== 'granted' ? (
          <>
            <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Permission required to show local device files.</Text>
            <TouchableOpacity
              style={{ padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.sm }}
              onPress={requestPermission}
            >
              <Text style={{ color: colors.text }}>Grant Storage Permission</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={{ color: colors.textMuted }}>No data found.</Text>
        )}
      </View>
    );
  }, [isLoading, deferredChip, isScanning, permissionStatus, requestPermission, colors]);

  const isGridView = viewMode === 'grid' && (deferredChip === 'Albums' || deferredChip === 'Artists' || deferredChip === 'Playlists' || deferredChip === null);

  return (
    <Screen disableSafeAreaBottom>
      <DynamicBackground />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Library</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('DownloadsScreen')}
            hitSlop={10}
            style={styles.iconButton}
          >
            <ArrowDownCircle color={colors.text} size={22} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <LibraryFilterChips selected={activeChip} onSelect={handleFilterChange} />

        <LibrarySortBar
          sortMode={sortMode}
          viewMode={viewMode}
          onSortChange={handleSortChange}
          onViewChange={handleViewChange}
          showViewToggle={activeChip === 'Albums' || activeChip === 'Artists' || activeChip === 'Playlists' || activeChip === null}
        />

        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, opacity: isLoading ? 0.4 : 1 }}>
            <FlashList
              data={data as any[]}
              key={isGridView ? 'grid' : 'list'}
              keyExtractor={keyExtractor}
              getItemType={() => deferredChip || 'overview'}
              numColumns={isGridView ? 2 : 1}
              // @ts-ignore
              estimatedItemSize={isGridView ? 200 : 80}
              drawDistance={1000}
              renderItem={renderItem}
              ListHeaderComponent={renderListHeader}
              ListEmptyComponent={renderListEmpty}
              contentContainerStyle={{
                paddingBottom: 170,
                paddingHorizontal: isGridView ? spacing.md : 0,
              }}
              columnWrapperStyle={isGridView ? { justifyContent: 'space-between' } : undefined}
              showsVerticalScrollIndicator={false}
            />
          </View>
          {isLoading && (
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
              <WaveLoader />
            </View>
          )}
        </View>
      </View>
      <AppConfirmSheet
        visible={!!downloadToDelete}
        title="Delete Download"
        message="Are you sure you want to delete this downloaded track from your device?"
        cancelText="Cancel"
        confirmText="Confirm"
        onCancel={() => setDownloadToDelete(null)}
        onConfirm={async () => {
          if (downloadToDelete && db) {
            try {
              await downloadService.deleteDownload(db, downloadToDelete.id);
              useToastStore.getState().showToast('Download removed', 'info');
            } catch (e) {
              useToastStore.getState().showToast('Failed to delete download', 'error');
            }
          }
          setDownloadToDelete(null);
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
    gap: spacing.md,
  },
  iconButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
});
