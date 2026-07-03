import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { Screen } from '@/ui/Screen';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { useDownloadStore } from '../store/useDownloadStore';
import { useShallow } from 'zustand/react/shallow';
import { downloadService } from '../services/downloadService';
import { libraryEmitter } from '../services/libraryService';
import { Image } from 'expo-image';
import { Play, Pause, ArrowLeft, DownloadCloud, RefreshCw, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '@/store';
import { AppConfirmModal } from '@/ui/AppConfirmModal';

const ActiveDownloadRow = memo(({ item, colors, db, onCancel }: { item: any, colors: any, db: any, onCancel: (item: any) => void }) => {
  const isError = item.status === 'error';
  const isPaused = item.status === 'paused';

  const handleAction = () => {
    if (isError) {
      useDownloadStore.getState().removeDownload(item.trackId);
      downloadService.startDownload(db, item.track);
    } else if (isPaused) {
      downloadService.resumeDownload(db, item.trackId);
    } else {
      downloadService.pauseDownload(item.trackId);
    }
  };

  return (
    <View style={styles.itemContainer}>
      <Image source={item.track.artworkUrl} style={styles.artwork} contentFit="cover" />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.track.title}</Text>
        <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>{item.track.artist}</Text>

        {!isError && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${item.progress}%`, backgroundColor: colors.brand }]} />
          </View>
        )}
        <Text style={[styles.progressText, { color: isError ? colors.brand : colors.textMuted }]}>
          {isPaused ? 'Paused' : isError ? 'Download Failed' : `${Math.round(item.progress)}% Downloading...`}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
          {isError ? (
            <RefreshCw color={colors.brand} size={24} />
          ) : isPaused ? (
            <Play color={colors.text} size={24} />
          ) : (
            <Pause color={colors.text} size={24} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onCancel(item)}>
          <X color={colors.textMuted} size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prev, next) => prev.item.status === next.item.status && prev.item.progress === next.item.progress);

const CompletedDownloadRow = memo(({ item, index, colors, onPlay, onDelete }: { item: any, index: number, colors: any, onPlay: (item: any, index: number) => void, onDelete: (id: string) => void }) => (
  <TouchableOpacity style={styles.itemContainer} onPress={() => onPlay(item, index)}>
    <Image source={item.localArtworkPath ? { uri: item.localArtworkPath } : item.artworkUrl} style={styles.artwork} contentFit="cover" />
    <View style={styles.info}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
      <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>{item.artist}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
        <DownloadCloud color={colors.brand} size={14} />
        <Text style={[styles.downloadedText, { color: colors.brand }]}> Downloaded</Text>
      </View>
    </View>
    <View style={styles.actions}>
      <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(item.id)}>
        <X color={colors.textMuted} size={24} />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
));

/**
 * Active download queue and offline local cache management screen providing granular pause, resume, and file deletion controls.
 */
export function DownloadsScreen() {
  const { colors, isDark } = useTheme();
  const db = useSafeDatabase();
  const navigation = useNavigation();
  const playList = usePlayerStore(state => state.playList);

  const activeDownloads = useDownloadStore(useShallow(state => Object.values(state.activeDownloads)));
  const [completedDownloads, setCompletedDownloads] = useState<any[]>([]);

  const [taskToCancel, setTaskToCancel] = useState<any | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const fetchCompleted = useCallback(async () => {
    if (!db) return;
    try {
      const rows = await db.getAllAsync(`
        SELECT t.*, d.downloadedAt
        FROM Tracks t
        INNER JOIN Downloads d ON t.id = d.trackId
        ORDER BY d.downloadedAt DESC
      `);
      setCompletedDownloads(rows);
    } catch (e) {
      console.error('Failed to fetch completed downloads:', e);
    }
  }, [db]);

  useEffect(() => {
    fetchCompleted();
    const unsubscribe = libraryEmitter.subscribe(fetchCompleted);
    return () => unsubscribe();
  }, [fetchCompleted]);

  const handlePlay = useCallback((track: any, index: number) => {
    const queue = completedDownloads.map(item => ({
      ...item,
      artworkUrl: item.localArtworkPath || item.artworkUrl,
      artwork: item.localArtworkPath || item.artworkUrl,
      url: item.localFilePath,
    }));
    playList(queue as any[], index);
  }, [completedDownloads, playList]);

  const handleDelete = useCallback((trackId: string) => {
    setTaskToDelete(trackId);
  }, []);

  const handleCancel = useCallback((item: any) => {
    setTaskToCancel(item);
  }, []);

  const confirmDelete = async () => {
    if (taskToDelete) {
      if (!db) return;
      try {
        await downloadService.deleteDownload(db, taskToDelete);
      } catch (e) {
        Alert.alert('Error', 'Failed to delete the download.');
      }
    }
    setTaskToDelete(null);
  };

  const confirmCancel = async () => {
    if (taskToCancel) {
      try {
        await downloadService.cancelDownload(taskToCancel.trackId);
      } catch (e) {
        Alert.alert('Error', 'Failed to safely cancel the download.');
      }
    }
    setTaskToCancel(null);
  };

  return (
    <Screen disableSafeAreaBottom>
      <LinearGradient
        colors={[colors.surfaceMuted, colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.3 }}
      />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Downloads</Text>
      </View>

      <FlatList
        data={[...activeDownloads, ...completedDownloads]}
        keyExtractor={(item) => 'progress' in item ? `active_${item.trackId}` : `completed_${item.id}`}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 170 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <DownloadCloud color={colors.textMuted} size={48} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No Downloads Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Music you download will appear here for offline listening.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          if ('progress' in item) {
            return <ActiveDownloadRow item={item} colors={colors} db={db} onCancel={handleCancel} />;
          } else {
            return <CompletedDownloadRow item={item} index={index - activeDownloads.length} colors={colors} onPlay={handlePlay} onDelete={handleDelete} />;
          }
        }}
      />
      <AppConfirmModal
        visible={!!taskToCancel}
        title="Cancel Download"
        message="Are you sure you want to cancel and delete this download?"
        cancelText="No"
        confirmText="Yes"
        isDestructive
        onCancel={() => setTaskToCancel(null)}
        onConfirm={confirmCancel}
      />

      <AppConfirmModal
        visible={!!taskToDelete}
        title="Delete Download"
        message="Are you sure you want to delete this downloaded track from your device?"
        cancelText="No"
        confirmText="Yes"
        isDestructive
        onCancel={() => setTaskToDelete(null)}
        onConfirm={confirmDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backBtn: {
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(150,150,150,0.2)',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  artist: {
    fontSize: typography.captionLg,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(150,150,150,0.2)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  progressText: {
    fontSize: typography.captionSm,
    marginTop: 4,
  },
  downloadedText: {
    fontSize: typography.captionSm,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionBtn: {
    padding: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: typography.title,
    fontWeight: 'bold',
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: typography.bodySm,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: 40,
  }
});
