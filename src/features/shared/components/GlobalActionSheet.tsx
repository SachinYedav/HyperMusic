import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, TouchableOpacity } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { downloadService } from '@/features/library/services/downloadService';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { DynamicArtworkFallback } from '@/ui/DynamicArtworkFallback';
import { shareContent } from '@/utils/shareUtils';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { usePlaylistSelectionStore } from '@/store/usePlaylistSelectionStore';
import { useArtistSelectionStore } from '@/store/useArtistSelectionStore';
import { usePlayerStore } from '@/store';
import { useToastStore } from '@/store/useToastStore';
import { useDownloadedSongs } from '@/features/library/hooks/useLibrary';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useDownloadStore } from '@/features/library/store/useDownloadStore';
import { useTheme, spacing, radius, typography } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { extractorService } from '@/services/api/extractorService';
import {
  Heart, UserStar, CheckCircle2, Shuffle, UserPlus,
  ListStart, ListMusic, FolderPlus, ArrowDownToLine, Disc3,
  Share2, PlayCircle, BookmarkPlus, BookmarkMinus, UserCheck
} from 'lucide-react-native';

/**
 * Singleton bottom sheet controller rendering multi-context entity actions, library persistency workflows, and background download triggers.
 * Features robust layout race-condition prevention to guarantee precise dismissal upon entity removal without side effects.
 */
export function GlobalActionSheet() {
  const { data, contextType, options, closeSheet } = useActionSheetStore();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const isClosingRef = useRef(false);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const db = useSafeDatabase();

  // Dynamically track saved state
  const downloadedSongs = useDownloadedSongs();
  const activeDownloads = useDownloadStore(state => state.activeDownloads);

  const isPlaylistSaved = useLibraryStore(s => data ? s.savedPlaylistIds.has(data.id) : false);
  const isAlbumSaved = useLibraryStore(s => data ? s.savedAlbumIds.has(data.id) : false);
  const isTrackLiked = useLibraryStore(s => data ? s.likedTrackIds.has(data.id) : false);
  const isArtistSaved = useLibraryStore(s => data ? s.followedArtistIds.has(data.id || data.artistId || '') : false);
  const isTrackDownloaded = data ? downloadedSongs.some(s => s.id === data.id) : false;
  const activeDownloadState = (contextType === 'track' && data) ? activeDownloads[data.id] : null;

  const queue = usePlayerStore(state => state.queue);
  const activeTrack = usePlayerStore(state => state.activeTrack);
  const isCurrentlyPlaying = options?.isCurrentlyPlaying || (activeTrack && data && activeTrack.id === data.id);
  const isAlreadyInQueue = options?.isQueueItem || (data && queue.some(t => t.id === data.id));

  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Present/Dismiss logic
  useEffect(() => {
    let backHandler: any = null;

    if (data) {
      isClosingRef.current = false;
      bottomSheetRef.current?.expand();

      // Handle Android hardware back button to close sheet
      backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        isClosingRef.current = true;
        bottomSheetRef.current?.close();
        closeSheet();
        return true;
      });
    } else {
      isClosingRef.current = true;
      bottomSheetRef.current?.close();
      if (backHandler) backHandler.remove();
    }

    return () => {
      if (backHandler) backHandler.remove();
    };
  }, [data, closeSheet]);

  const handleContentLayout = useCallback((e: any) => {
    if (e.nativeEvent.layout.height > 0 && data && !isClosingRef.current) {
      bottomSheetRef.current?.expand();
    }
  }, [data]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      isClosingRef.current = true;
      closeSheet();
    }
  }, [closeSheet]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const renderHeader = () => {
    if (!data) return null;

    let title = '';
    let subtitle = '';
    let artwork: any = null;

    if (contextType === 'track') {
      title = data.title || data.name || '';
      subtitle = data.artist || data.subtitle || '';
      if (data.album && !subtitle.includes(data.album)) {
        subtitle += ` • ${data.album}`;
      }
      artwork = data.artwork || data.artworkUrl || data.thumbnail || data.image || data.coverUrl;
    } else if (contextType === 'playlist') {
      title = data.title || data.name || '';
      subtitle = data.subtitle || 'Playlist';
      artwork = data.artwork || data.artworkUrl || data.thumbnail || data.image || data.coverUrl;
    } else if (contextType === 'album') {
      title = data.title || data.name || '';
      subtitle = data.subtitle || data.artist || 'Album';
      artwork = data.artwork || data.artworkUrl || data.thumbnail || data.image || data.coverUrl;
    } else if (contextType === 'artist') {
      title = data.title || data.name || data.artist || '';
      subtitle = data.subscriberCount || data.subtitle || 'Artist';
      artwork = data.avatarUrl || data.avatar || data.artwork || data.artworkUrl || data.thumbnail || data.image || data.coverUrl;
    } else if (contextType === 'podcast' || contextType === 'podcast_show') {
      title = data.title || data.name || '';
      subtitle = data.artist || data.creator || data.subtitle || (contextType === 'podcast' ? 'Podcast Episode' : 'Podcast Show');
      artwork = data.artwork || data.artworkUrl || data.thumbnail || data.image || data.coverUrl;
    }

    return (
      <View style={styles.headerContainer}>
        {artwork ? (
          <Image
            source={artwork}
            style={[styles.headerArtwork, { backgroundColor: colors.highlight }]}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <DynamicArtworkFallback contextType={contextType as any} style={[styles.headerArtwork, { backgroundColor: colors.highlight }]} iconSize={24} />
        )}
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
    );
  };

  const renderActionRow = (Icon: any, label: string, onPress: () => void, isLoading: boolean = false, disabled: boolean = false, iconColor?: string, fillColor?: string) => (
    <TouchableOpacity style={[styles.actionRow, disabled && { opacity: 0.8 }]} onPress={onPress} disabled={disabled || isLoading}>
      {isLoading ? (
        <ActivityIndicator color={iconColor || colors.text} size="small" />
      ) : (
        <Icon color={iconColor || colors.text} size={24} fill={fillColor || 'none'} />
      )}
      <Text style={[styles.actionText, { color: colors.text, marginLeft: 16 }]}>{label}</Text>
    </TouchableOpacity>
  );

  const handlePlayNext = async () => {
    if (contextType === 'track' && data) {
      if (isAlreadyInQueue) {
        useToastStore.getState().showToast('Already in Queue', 'info');
      } else {
        usePlayerStore.getState().insertNext(data as any);
        useToastStore.getState().showToast(`Added "${data.title}" to play next`, 'success');
      }
    }
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleAddToQueue = async () => {
    if (contextType === 'track' && data) {
      if (isAlreadyInQueue) {
        useToastStore.getState().showToast('Already in Queue', 'info');
      } else {
        usePlayerStore.getState().appendToQueue(data as any);
        useToastStore.getState().showToast(`Added "${data.title}" to queue`, 'success');
      }
    }
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleToggleLike = async () => {
    if (!db || !data || contextType !== 'track') return;
    await useLibraryStore.getState().toggleTrackLike(db, data);
    useToastStore.getState().showToast(!isTrackLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs', !isTrackLiked ? 'liked' : 'info');
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleAddToPlaylist = () => {
    if (contextType === 'track' && data) {
      isClosingRef.current = true;
      bottomSheetRef.current?.close();
      closeSheet();
      setTimeout(() => {
        usePlaylistSelectionStore.getState().openSheet(data as any);
      }, 50);
    }
  };

  const handleDownloadList = (type: 'playlist' | 'album' | 'podcast', id: string, initialTracks?: any[]) => {
    if (!db) return;
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();

    setTimeout(async () => {
      useToastStore.getState().showToast(`Fetching ${type} tracks...`, 'info');
      const tracks = await fetchTracksIfMissing(type, id, initialTracks);

      if (tracks && tracks.length > 0) {
        await downloadService.startBatchDownload(db, tracks);
      } else {
        useToastStore.getState().showToast('No tracks available to download', 'error');
      }
    }, 200);
  };

  const handleToggleArtistSaved = async () => {
    if (!db || !data) return;
    const artistId = data.id || data.artistId || data.browseId;
    const name = data.title || data.name || data.artist;
    const avatarUrl = data.avatarUrl || data.avatar || data.artworkUrl || data.coverUrl || data.thumbnail;

    if (artistId && name) {
      await useLibraryStore.getState().toggleArtist(db, { id: artistId, name, avatarUrl });
      useToastStore.getState().showToast(isArtistSaved ? 'Artist unfollowed' : 'Artist followed', 'success');
    }
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };


  const fetchTracksIfMissing = async (type: 'playlist' | 'album' | 'podcast', id: string, providedTracks?: any[]) => {
    let tracksToProcess = providedTracks && providedTracks.length > 0 ? providedTracks : [];

    if (tracksToProcess.length === 0) {
      if (data?.isLocal) {
        if (db) {
          if (type === 'playlist') {
            const res = await db.getAllAsync(`
              SELECT t.* FROM Tracks t 
              JOIN PlaylistTracks pt ON t.id = pt.trackId 
              WHERE pt.playlistId = ? ORDER BY pt.order_index ASC
            `, [id]);
            tracksToProcess = res || [];
          } else if (type === 'album') {
            const res = await db.getAllAsync(`
              SELECT t.* FROM Tracks t 
              JOIN AlbumTracks at ON t.id = at.trackId 
              WHERE at.albumId = ? ORDER BY at.order_index ASC
            `, [id]);
            tracksToProcess = res || [];
          }
        }
      } else {
        try {
          if (type === 'playlist') {
            const details = await extractorService.getPlaylistDetails(id);
            tracksToProcess = details.tracks || [];
          } else if (type === 'album') {
            const details = await extractorService.getAlbumDetails(id);
            tracksToProcess = details.tracks || [];
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    const contextArtwork = data?.artwork || data?.artworkUrl || data?.coverUrl || data?.image || data?.thumbnail;

    return tracksToProcess.map((t: any) => ({
      ...t,
      artwork: t.artwork || t.artworkUrl || t.thumbnails?.[0]?.url || contextArtwork,
      trackType: t.trackType || 'song'
    }));
  };

  const handlePlayList = (type: 'playlist' | 'album' | 'podcast', id: string, initialTracks?: any[]) => {
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();

    setTimeout(async () => {
      useToastStore.getState().showToast(`Loading ${type}...`, 'info');
      const tracks = await fetchTracksIfMissing(type, id, initialTracks);

      if (tracks && tracks.length > 0) {
        const safeTracks = tracks.slice(0, 100); // Safe limit
        usePlayerStore.getState().playList(safeTracks);
      } else {
        useToastStore.getState().showToast('No tracks available', 'error');
      }
    }, 200);
  };

  const handleShuffleList = (type: 'playlist' | 'album' | 'podcast', id: string, initialTracks?: any[]) => {
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();

    setTimeout(async () => {
      useToastStore.getState().showToast(`Loading ${type}...`, 'info');
      const tracks = await fetchTracksIfMissing(type, id, initialTracks);

      if (tracks && tracks.length > 0) {
        const safeTracks = tracks.slice(0, 100); // Safe limit
        usePlayerStore.getState().playList(safeTracks, 0, true);
      } else {
        useToastStore.getState().showToast('No tracks available', 'error');
      }
    }, 200);
  };

  const handlePlayNextList = (type: 'playlist' | 'album' | 'podcast', id: string, initialTracks?: any[]) => {
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();

    setTimeout(async () => {
      useToastStore.getState().showToast(`Loading ${type}...`, 'info');
      const tracks = await fetchTracksIfMissing(type, id, initialTracks);

      if (tracks && tracks.length > 0) {
        const safeTracks = tracks.slice(0, 50); // Aggressive limit to prevent queue bloat
        usePlayerStore.getState().insertListNext(safeTracks);
        useToastStore.getState().showToast(`Added ${safeTracks.length} tracks to play next`, 'success');
      } else {
        useToastStore.getState().showToast('No tracks available', 'error');
      }
    }, 200);
  };

  const handleAddListToQueue = (type: 'playlist' | 'album' | 'podcast', id: string, initialTracks?: any[]) => {
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();

    setTimeout(async () => {
      useToastStore.getState().showToast(`Loading ${type}...`, 'info');
      const tracks = await fetchTracksIfMissing(type, id, initialTracks);

      if (tracks && tracks.length > 0) {
        const safeTracks = tracks.slice(0, 50); // Aggressive limit to prevent queue bloat
        usePlayerStore.getState().appendTracks(safeTracks);
        useToastStore.getState().showToast(`Added ${safeTracks.length} tracks to queue`, 'success');
      } else {
        useToastStore.getState().showToast('No tracks available', 'error');
      }
    }, 200);
  };

  const handleShare = async () => {
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
    if (data) {
      let id = '';
      if (contextType === 'track') id = data.id;
      else if (contextType === 'playlist') id = data.id;
      else if (contextType === 'artist') id = data.id || data.artistId;

      let name = data.title || data.name || data.artist;
      setTimeout(async () => {
        await shareContent(contextType as any, id, name);
      }, 50);
    }
  };

  const handleSavePlaylist = async () => {
    if (!db || contextType !== 'playlist' || !data) return;
    await useLibraryStore.getState().togglePlaylist(db, data.id, data.name || data.title, data.coverUrl || data.artworkUrl);
    useToastStore.getState().showToast({
      message: 'Playlist saved to library',
      type: 'success',
      action: {
        label: 'View', onPress: () => {
          usePlayerStore.getState().collapsePlayer();
          navigation.navigate('Library', { screen: 'LibraryMain' });
        }
      }
    });
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleDeletePlaylist = async () => {
    if (!db || contextType !== 'playlist' || !data) return;
    await useLibraryStore.getState().togglePlaylist(db, data.id, data.name || data.title, data.coverUrl || data.artworkUrl);
    useToastStore.getState().showToast('Playlist removed', 'info');
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleSaveAlbum = async () => {
    if (!db || contextType !== 'album' || !data) return;
    await useLibraryStore.getState().toggleAlbum(db, data.id, data.title || data.name, data.artist, data.coverUrl || data.artworkUrl);
    useToastStore.getState().showToast({
      message: 'Album saved to library',
      type: 'success',
      action: {
        label: 'View', onPress: () => {
          usePlayerStore.getState().collapsePlayer();
          navigation.navigate('Library', { screen: 'LibraryMain' });
        }
      }
    });
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleDeleteAlbum = async () => {
    if (!db || contextType !== 'album' || !data) return;
    await useLibraryStore.getState().toggleAlbum(db, data.id, data.title || data.name, data.artist, data.coverUrl || data.artworkUrl);
    useToastStore.getState().showToast('Album removed', 'info');
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleGoToArtist = () => {
    if (data?.artists && data.artists.length > 1) {
      isClosingRef.current = true;
      bottomSheetRef.current?.close();
      closeSheet();
      setTimeout(() => {
        useArtistSelectionStore.getState().openSheet(data.artists);
      }, 50);
      return;
    }

    const artistId = (data?.artists && data.artists.length === 1)
      ? data.artists[0].id
      : (data?.artistId || (contextType === 'artist' ? data?.id : undefined));

    const name = (data?.artists && data.artists.length === 1)
      ? data.artists[0].name
      : (contextType === 'artist' ? (data?.title || data?.name) : (data?.artist || data?.name));

    if (artistId) {
      isClosingRef.current = true;
      bottomSheetRef.current?.close();
      closeSheet();
      setTimeout(() => {
        usePlayerStore.getState().collapsePlayer();
        navigation.navigate('ArtistProfile', {
          id: artistId,
          artistName: name,
          artworkUrl: data?.artworkUrl || data?.coverUrl || data?.avatar
        });
      }, 50);
    } else {
      useToastStore.getState().showToast('Artist information unavailable', 'error');
      isClosingRef.current = true;
      bottomSheetRef.current?.close();
      closeSheet();
    }
  };

  const handleGoToAlbum = () => {
    if (contextType === 'track' && data) {
      if (data.albumId) {
        usePlayerStore.getState().collapsePlayer();
        navigation.navigate('AlbumDetails', {
          id: data.albumId,
          albumTitle: data.album,
          artistName: data.artist
        });
      } else {
        useToastStore.getState().showToast('Album information unavailable', 'error');
      }
    }
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleDownload = () => {
    if (!db || contextType !== 'track' || !data) return;

    if (isTrackDownloaded) {
      useToastStore.getState().showToast('Already downloaded', 'info');
    } else if (activeDownloadState) {
      if (activeDownloadState.status === 'error') {
        useDownloadStore.getState().removeDownload(data.id);
        useToastStore.getState().showToast({
          message: 'Retrying download...',
          type: 'info',
          action: {
            label: 'View', onPress: () => {
              usePlayerStore.getState().collapsePlayer();
              navigation.navigate('Library', { screen: 'DownloadsScreen' });
            }
          }
        });
      } else {
        useToastStore.getState().showToast({
          message: 'Download in progress...',
          type: 'info',
          action: {
            label: 'View', onPress: () => {
              usePlayerStore.getState().collapsePlayer();
              navigation.navigate('Library', { screen: 'DownloadsScreen' });
            }
          }
        });
      }
    } else {
      downloadService.startDownload(db, data as any);
      useToastStore.getState().showToast({
        message: 'Downloading...',
        type: 'info',
        action: {
          label: 'View', onPress: () => {
            usePlayerStore.getState().collapsePlayer();
            navigation.navigate('Library', { screen: 'DownloadsScreen' });
          }
        }
      });
    }

    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const renderOptions = () => {
    if (contextType === 'track') {
      const downloadLabel = isTrackDownloaded ? "Downloaded" : activeDownloadState ? (activeDownloadState.status === 'error' ? "Retry Download" : `Downloading ${Math.round(activeDownloadState.progress)}%`) : "Download";
      const downloadIcon = isTrackDownloaded ? CheckCircle2 : ArrowDownToLine;

      return (
        <>
          {renderActionRow(ListStart, "Play Next", handlePlayNext)}
          {renderActionRow(ListMusic, "Add to Queue", handleAddToQueue)}
          {renderActionRow(FolderPlus, "Add to Playlist", handleAddToPlaylist)}
          {renderActionRow(Heart, isTrackLiked ? "Unlike" : "Like", handleToggleLike, processingAction === 'like')}

          {renderActionRow(downloadIcon, downloadLabel, handleDownload, !!(activeDownloadState && activeDownloadState.status !== 'error'))}

          {renderActionRow(UserStar, "Go to Artist", handleGoToArtist)}
          {renderActionRow(Disc3, "Go to Album", handleGoToAlbum)}
          {renderActionRow(Share2, "Share", handleShare)}
        </>
      );
    } else if (contextType === 'playlist') {
      const isLocal = !!data?.isLocal || isPlaylistSaved;
      return (
        <>
          {renderActionRow(PlayCircle, "Play All", () => handlePlayList('playlist', data.id, data.tracks))}
          {renderActionRow(Shuffle, "Shuffle Play", () => handleShuffleList('playlist', data.id, data.tracks))}
          {renderActionRow(ListStart, "Play Next", () => handlePlayNextList('playlist', data.id, data.tracks))}
          {renderActionRow(ListMusic, "Add to Queue", () => handleAddListToQueue('playlist', data.id, data.tracks))}
          {renderActionRow(ArrowDownToLine, "Download Offline", () => handleDownloadList(contextType as any, data.id, data.tracks))}
          {renderActionRow(Share2, "Share", handleShare)}
          {isLocal
            ? renderActionRow(BookmarkMinus, "Remove Playlist", handleDeletePlaylist, processingAction === 'deletePlaylist')
            : renderActionRow(BookmarkPlus, "Save Playlist", handleSavePlaylist, processingAction === 'savePlaylist')
          }
        </>
      );
    } else if (contextType === 'album') {
      const isLocal = !!data?.isLocal || isAlbumSaved;
      return (
        <>
          {renderActionRow(PlayCircle, "Play Album", () => handlePlayList('album', data.id, data.tracks))}
          {renderActionRow(Shuffle, "Shuffle Play", () => handleShuffleList('album', data.id, data.tracks))}
          {renderActionRow(ListStart, "Play Next", () => handlePlayNextList('album', data.id, data.tracks))}
          {renderActionRow(ListMusic, "Add to Queue", () => handleAddListToQueue('album', data.id, data.tracks))}
          {renderActionRow(ArrowDownToLine, "Download Offline", () => handleDownloadList(contextType as any, data.id, data.tracks))}
          {renderActionRow(UserStar, "View Artist", handleGoToArtist)}
          {renderActionRow(Share2, "Share", handleShare)}
          {isLocal
            ? renderActionRow(BookmarkMinus, "Remove Album", handleDeleteAlbum, processingAction === 'deleteAlbum')
            : renderActionRow(BookmarkPlus, "Save Album", handleSaveAlbum, processingAction === 'saveAlbum')
          }
        </>
      );
    } else if (contextType === 'artist') {
      return (
        <>
          {renderActionRow(UserStar, "View Profile", handleGoToArtist)}
          {renderActionRow(isArtistSaved ? UserCheck : UserPlus, isArtistSaved ? "Unfollow Artist" : "Follow Artist", handleToggleArtistSaved, processingAction === 'saveArtist')}
          {renderActionRow(Share2, "Share", handleShare)}
        </>
      );
    } else if (contextType === 'podcast') {
      const downloadLabel = isTrackDownloaded ? "Downloaded" : activeDownloadState ? (activeDownloadState.status === 'error' ? "Retry Download" : `Downloading ${Math.round(activeDownloadState.progress)}%`) : "Download";
      const downloadIcon = isTrackDownloaded ? CheckCircle2 : ArrowDownToLine;

      return (
        <>
          {renderActionRow(ListStart, "Play Next", handlePlayNext)}
          {renderActionRow(ListMusic, "Add to Queue", handleAddToQueue)}
          {renderActionRow(downloadIcon, downloadLabel, handleDownload, !!(activeDownloadState && activeDownloadState.status !== 'error'))}
          {renderActionRow(Share2, "Share", handleShare)}
        </>
      );
    } else if (contextType === 'podcast_show') {
      return (
        <>
          {renderActionRow(PlayCircle, "Play Latest", () => handlePlayList('podcast', data.id, data.episodes))}
          {renderActionRow(Share2, "Share", handleShare)}
        </>
      );
    }
    return null;
  };

  if (!data) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      enableDynamicSizing={true}
      enablePanDownToClose={true}
      detached={true}
      containerStyle={{ zIndex: 9999, elevation: 9999 }}
      bottomInset={insets.bottom + spacing.md}
      style={{ marginHorizontal: spacing.sm }}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: isDark ? colors.surface : colors.background,
        borderRadius: radius.md
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.textMuted,
        width: 40,
        height: 4
      }}
      animateOnMount={true}
    >
      <BottomSheetView
        style={[styles.contentContainer, { minHeight: 200 }]}
        onLayout={handleContentLayout}
      >
        {renderHeader()}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {renderOptions()}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTextContainer: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  headerArtwork: {
    width: 44,
    height: 44,
    borderRadius: radius.xs,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: typography.bodyLg,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: typography.bodySm,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionText: {
    fontSize: typography.bodyLg,
    marginLeft: spacing.lg,
    fontWeight: '500',
  },
});
