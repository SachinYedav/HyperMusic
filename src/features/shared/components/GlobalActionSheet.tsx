import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, TouchableOpacity } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { downloadService } from '@/features/library/services/downloadService';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import TrackPlayer from 'react-native-track-player';
import { toggleLike, deletePlaylist, saveRemotePlaylist, saveRemoteAlbum, deleteAlbum } from '@/features/library/services/libraryService';
import { shareContent } from '@/utils/shareUtils';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { usePlaylistSelectionStore } from '@/store/usePlaylistSelectionStore';
import { usePlayerStore } from '@/store';
import { usePlaylists, useAlbums, useLikedSongs, useDownloadedSongs } from '@/features/library/hooks/useLibrary';
import { useDownloadStore } from '@/features/library/store/useDownloadStore';
import { useTheme, spacing, radius, typography } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Play, ListPlus, PlusCircle, Heart, Download,
  User, Disc, Share2, Trash2, CheckCircle2
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
  const savedPlaylists = usePlaylists();
  const savedAlbums = useAlbums();
  const likedSongs = useLikedSongs();
  const downloadedSongs = useDownloadedSongs();
  const activeDownloads = useDownloadStore(state => state.activeDownloads);

  const isPlaylistSaved = data ? savedPlaylists.some(p => p.id === data.id) : false;
  const isAlbumSaved = data ? savedAlbums.some(a => a.id === data.id) : false;
  const isTrackLiked = data ? likedSongs.some(s => s.id === data.id) : false;
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
      title = data.title;
      subtitle = data.artist;
      artwork = data.artwork || data.artworkUrl || data.thumbnail || data.image || data.coverUrl;
    } else if (contextType === 'playlist') {
      title = data.name;
      subtitle = 'Playlist';
      artwork = data.artwork || data.artworkUrl || data.thumbnail || data.image || data.coverUrl;
    } else if (contextType === 'album') {
      title = data.title || data.name;
      subtitle = data.artist || 'Album';
      artwork = data.artwork || data.artworkUrl || data.thumbnail || data.image || data.coverUrl;
    } else if (contextType === 'artist') {
      title = data.artist || data.name;
      subtitle = 'Artist';
      artwork = data.avatar || data.artwork || data.artworkUrl || data.thumbnail || data.image || data.coverUrl;
    }

    return (
      <View style={styles.headerContainer}>
        <Image
          source={artwork || require('../../../../assets/default-artwork.png')}
          style={[styles.headerArtwork, { backgroundColor: colors.highlight }]}
          contentFit="cover"
          transition={200}
        />
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
      usePlayerStore.getState().insertNext(data as any);
    }
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleAddToQueue = async () => {
    if (contextType === 'track' && data) {
      usePlayerStore.getState().appendToQueue(data as any);
    }
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleToggleLike = async () => {
    if (!db || !data || contextType !== 'track' || processingAction) return;
    setProcessingAction('like');
    await toggleLike(db, data);
    setProcessingAction(null);
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
    if (!db || contextType !== 'playlist' || !data || processingAction) return;
    setProcessingAction('savePlaylist');
    await saveRemotePlaylist(db, data.id, data.name || data.title, data.coverUrl || data.artworkUrl);
    setProcessingAction(null);
  };

  const handleDeletePlaylist = async () => {
    if (!db || contextType !== 'playlist' || !data || processingAction) return;
    setProcessingAction('deletePlaylist');
    await deletePlaylist(db, data.id);
    setProcessingAction(null);
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleSaveAlbum = async () => {
    if (!db || contextType !== 'album' || !data || processingAction) return;
    setProcessingAction('saveAlbum');
    await saveRemoteAlbum(db, data.id, data.title || data.name, data.artist, data.coverUrl || data.artworkUrl);
    setProcessingAction(null);
  };

  const handleDeleteAlbum = async () => {
    if (!db || contextType !== 'album' || !data || processingAction) return;
    setProcessingAction('deleteAlbum');
    await deleteAlbum(db, data.id);
    setProcessingAction(null);
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleGoToArtist = () => {
    if (contextType === 'track' && data && data.artistId) {
      navigation.navigate('ArtistProfile', {
        id: data.artistId,
        artistName: data.artist,
        artistThumbnail: data.artworkUrl
      });
    }
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const handleGoToAlbum = () => {
    if (contextType === 'track' && data && data.albumId) {
      navigation.navigate('AlbumDetails', {
        id: data.albumId,
        albumTitle: data.album,
        artistName: data.artist
      });
    }
    isClosingRef.current = true;
    bottomSheetRef.current?.close();
    closeSheet();
  };

  const renderOptions = () => {
    if (contextType === 'track') {
      return (
        <>
          {!isCurrentlyPlaying && !isAlreadyInQueue && renderActionRow(Play, "Play Next", handlePlayNext)}
          {!isCurrentlyPlaying && !isAlreadyInQueue && renderActionRow(ListPlus, "Add to Queue", handleAddToQueue)}
          {!isCurrentlyPlaying && isAlreadyInQueue && renderActionRow(CheckCircle2, "Already in Queue", () => { }, false, true, colors.brand)}
          {renderActionRow(PlusCircle, "Add to Playlist", handleAddToPlaylist)}
          {renderActionRow(Heart, isTrackLiked ? "Unlike" : "Like", handleToggleLike, processingAction === 'like', false, isTrackLiked ? colors.brand : colors.text, isTrackLiked ? colors.brand : 'none')}

          {isTrackDownloaded ? (
            renderActionRow(CheckCircle2, "Downloaded", () => { }, false, true, colors.brand)
          ) : activeDownloadState ? (
            activeDownloadState.status === 'error' ? (
              renderActionRow(Download, "Retry Download", () => {
                if (!db) return;
                useDownloadStore.getState().removeDownload(data.id);
                downloadService.startDownload(db, data as any);
                isClosingRef.current = true;
                bottomSheetRef.current?.close();
                closeSheet();
              }, false, false, colors.brand)
            ) : (
              renderActionRow(Download, `Downloading ${Math.round(activeDownloadState.progress)}%`, () => { }, true, true, colors.brand)
            )
          ) : (
            renderActionRow(Download, "Download", () => {
              if (!db) return;
              downloadService.startDownload(db, data as any);
              isClosingRef.current = true;
              bottomSheetRef.current?.close();
              closeSheet();
            })
          )}

          {!!data.artistId && renderActionRow(User, "Go to Artist", handleGoToArtist)}
          {!!data.albumId && renderActionRow(Disc, "Go to Album", handleGoToAlbum)}
          {renderActionRow(Share2, "Share", handleShare)}
        </>
      );
    } else if (contextType === 'playlist') {
      const isLocal = !!data?.isLocal || isPlaylistSaved;
      return (
        <>
          {renderActionRow(Play, "Play All", () => {
            if (data?.tracks?.length > 0) {
              usePlayerStore.getState().playList(data.tracks);
            }
            isClosingRef.current = true;
            bottomSheetRef.current?.close();
            closeSheet();
          })}
          {renderActionRow(Share2, "Share", handleShare)}
          {isLocal
            ? renderActionRow(Trash2, "Remove Playlist", handleDeletePlaylist, processingAction === 'deletePlaylist')
            : renderActionRow(PlusCircle, "Save Playlist", handleSavePlaylist, processingAction === 'savePlaylist')
          }
        </>
      );
    } else if (contextType === 'album') {
      const isLocal = !!data?.isLocal || isAlbumSaved;
      return (
        <>
          {renderActionRow(Play, "Play Album", () => {
            if (data?.tracks?.length > 0) {
              usePlayerStore.getState().playList(data.tracks);
            }
            isClosingRef.current = true;
            bottomSheetRef.current?.close();
            closeSheet();
          })}
          {renderActionRow(Share2, "Share", handleShare)}
          {isLocal
            ? renderActionRow(Trash2, "Remove Album", handleDeleteAlbum, processingAction === 'deleteAlbum')
            : renderActionRow(PlusCircle, "Save Album", handleSaveAlbum, processingAction === 'saveAlbum')
          }
        </>
      );
    } else if (contextType === 'artist') {
      return (
        <>
          {renderActionRow(Play, "Play Artist", async () => {
            isClosingRef.current = true;
            bottomSheetRef.current?.close();
            closeSheet();
            if (data?.isLocal && db) {
              const artistQueryName = data.name || data.artist;
              if (artistQueryName) {
                const tracks = await db.getAllAsync<any>(
                  `SELECT * FROM Tracks WHERE (isLiked = 1 OR id IN (SELECT trackId FROM Downloads)) AND artist LIKE ?`,
                  [`%${artistQueryName}%`]
                );
                if (tracks && tracks.length > 0) {
                  usePlayerStore.getState().playList(tracks.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    artist: t.artist,
                    duration: t.duration || 0,
                    artwork: t.artworkUrl,
                    url: t.localFilePath || ''
                  })));
                }
              }
            } else if (data?.shelves) {
              const songShelf = data.shelves.find((shelf: any) =>
                shelf.items && shelf.items.length > 0 &&
                (shelf.items[0].type === 'song' || shelf.items[0].type === 'video')
              );
              if (songShelf) {
                const tracksToPlay = songShelf.items.map((item: any) => ({
                  id: item.id,
                  title: item.title,
                  artist: item.artists?.[0]?.name || data.name || 'Unknown Artist',
                  duration: item.duration || 0,
                  artwork: item.thumbnails?.[0]?.url || data.coverUrl || '',
                  url: ''
                }));
                usePlayerStore.getState().playList(tracksToPlay);
              }
            }
          })}
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
      style={{ marginHorizontal: spacing.sm}}
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
