import React, { useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { Screen } from '@/ui/Screen';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { useDownloadStore } from '../store/useDownloadStore';
import { PremiumImage } from '@/ui/PremiumImage';
import { useShallow } from 'zustand/react/shallow';
import { downloadService } from '../services/downloadService';
import { ArrowLeft, ArrowDownToLine, Play, Pause, X, RefreshCw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import { pauseBatchNative, resumeBatchNative, cancelBatchNative } from '../../../../modules/hyper-downloader/src';



const ActiveDownloadRow = memo(({ item, colors, db, onCancel }: { item: any, colors: any, db: any, onCancel: (item: any) => void }) => {
  const isError = item.status === 'error';
  const isPaused = item.status === 'paused';
  const isQueued = item.status === 'queued';

  const handleAction = () => {
    if (!db) return;
    if (isError) {
      useDownloadStore.getState().removeDownload(item.trackId);
      downloadService.startDownload(db, item.track);
    } else if (isPaused) {
      downloadService.resumeDownload(db, item.trackId);
    } else {
      downloadService.pauseDownload(db, item.trackId);
    }
  };

  return (
    <View style={[styles.itemContainer, { borderBottomColor: colors.border }]}>
      <PremiumImage source={item.track.artworkUrl} contextType="track" style={[styles.artwork, { backgroundColor: colors.highlightSubtle }]} fallbackIconSize={20} />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.track.title}</Text>
        <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>{item.track.artist}</Text>

        {!isError && (
          <View style={[styles.progressTrack, { backgroundColor: colors.highlightStrong }]}>
            <View style={[styles.progressBar, { width: `${item.progress}%`, backgroundColor: colors.brand }]} />
          </View>
        )}
        <Text style={[styles.progressText, { color: isError ? colors.brand : colors.textMuted }]}>
          {isPaused ? 'Paused' : isError ? 'Download Failed' : isQueued ? 'Waiting in Queue...' : `${Math.round(item.progress)}% Downloading...`}
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


/**
 * Active download queue and offline local cache management screen providing granular pause, resume, and file deletion controls.
 */
export function DownloadsScreen() {
  const { colors, isDark } = useTheme();
  const db = useSafeDatabase();
  const navigation = useNavigation();

  const activeDownloads = useDownloadStore(useShallow(state => Object.values(state.activeDownloads)));
  const pendingQueue = useDownloadStore(useShallow(state => state.pendingQueue));

  const activeIds = new Set(activeDownloads.map(a => a.trackId));
  const waitingTracks = pendingQueue.filter(p => !activeIds.has(p.trackId)).map(p => ({
    trackId: p.trackId,
    track: p,
    progress: 0,
    status: p.status === 'PAUSED' ? 'paused' : 'queued',
    isWaiting: true
  }));

  const combinedQueue = [...activeDownloads, ...waitingTracks];
  const totalActive = combinedQueue.length;

  const handleCancelAll = useCallback(() => {
    useDownloadStore.getState().clearActiveDownloads();
    useDownloadStore.getState().setPendingQueue([]);
    cancelBatchNative();
  }, []);

  const handlePauseAll = useCallback(() => {
    pauseBatchNative();
  }, []);

  const handleResumeAll = useCallback(() => {
    resumeBatchNative();
  }, []);

  const hasPaused = combinedQueue.some(item => item.status?.toLowerCase() === 'paused');

  const handleCancel = useCallback(async (item: any) => {
    if (item.isWaiting) {
      const state = useDownloadStore.getState();
      state.setPendingQueue(state.pendingQueue.filter(p => p.trackId !== item.trackId));
      if (db) {
        try {
          const { deleteDownloadQueueItem } = require('@/database/queries/downloadQueries');
          await deleteDownloadQueueItem(db, item.trackId);
        } catch (e) { }
      }
    } else {
      if (db) {
        downloadService.cancelDownload(db, item.trackId);
      }
    }
  }, [db]);

  return (
    <Screen disableSafeAreaBottom>
      <LinearGradient
        colors={[colors.surfaceMuted, colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.3 }}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Active Downloads</Text>
        </View>
        {totalActive > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.brand }]}>
            <Text style={styles.badgeText}>{totalActive}</Text>
          </View>
        )}
      </View>

      {totalActive > 0 && (
        <View style={styles.macroControls}>
          {hasPaused ? (
            <TouchableOpacity style={[styles.macroBtn, { backgroundColor: colors.surface }]} onPress={handleResumeAll}>
              <Play color={colors.text} size={20} />
              <Text style={[styles.macroText, { color: colors.text }]}>Resume All</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.macroBtn, { backgroundColor: colors.surface }]} onPress={handlePauseAll}>
              <Pause color={colors.text} size={20} />
              <Text style={[styles.macroText, { color: colors.text }]}>Pause All</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.macroBtn, { backgroundColor: colors.surface }]} onPress={handleCancelAll}>
            <X color={colors.brand} size={20} />
            <Text style={[styles.macroText, { color: colors.brand }]}>Cancel All</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <FlashList
          data={combinedQueue}
          keyExtractor={(item) => (item as any).isWaiting ? `waiting_${item.trackId}` : `active_${item.trackId}`}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 170 }}
          showsVerticalScrollIndicator={false}
          //@ts-ignore
          estimatedItemSize={70}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ArrowDownToLine color={colors.textMuted} size={48} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No Active Downloads</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>Ongoing and pending downloads will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ActiveDownloadRow item={item} colors={colors} db={db} onCancel={handleCancel} />
          )}
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  macroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    gap: 6,
  },
  macroText: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  transfersBtn: {
    padding: spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
    borderBottomColor: 'transparent',
  },
  serialText: {
    fontSize: typography.body,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
    marginRight: spacing.sm,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: radius.xs,
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
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteActionContent: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  batchControls: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  batchTitle: {
    fontSize: typography.body,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  batchActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  batchBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,50,50,0.1)',
  },
  batchBtnText: {
    fontSize: typography.bodySm,
    fontWeight: 'bold',
  }
});
