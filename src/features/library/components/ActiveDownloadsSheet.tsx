import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { AppBottomSheet } from '@/ui/AppBottomSheet';
import { useDownloadStore } from '../store/useDownloadStore';
import { useShallow } from 'zustand/react/shallow';
import { downloadService } from '../services/downloadService';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { deleteDownloadQueueItem } from '@/database/queries/downloadQueries';
import { PremiumImage } from '@/ui/PremiumImage';
import { Play, Pause, X, RefreshCw, DownloadCloud } from 'lucide-react-native';
import { useToastStore } from '@/store/useToastStore';

const ActiveDownloadRow = memo(({ item, colors, db, onCancel }: { item: any, colors: any, db: any, onCancel: (item: any) => void }) => {
  const isError = item.status === 'error';
  const isPaused = item.status === 'paused';

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
    <View style={styles.itemContainer}>
      <PremiumImage source={item.track.artworkUrl} contextType="track" style={styles.artwork} fallbackIconSize={20} />
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

const WaitingDownloadRow = memo(({ item, colors, onCancel }: { item: any, colors: any, onCancel: (item: any) => void }) => {
  return (
    <View style={[styles.itemContainer, { opacity: 0.6 }]}>
      <PremiumImage source={item.artworkUrl || item.artwork} contextType="track" style={styles.artwork} fallbackIconSize={20} />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>{item.artist}</Text>
        <Text style={[styles.progressText, { color: colors.textMuted }]}>
          {item.status === 'PAUSED' ? 'Paused' : 'Waiting...'}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onCancel(item)}>
          <X color={colors.textMuted} size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

interface ActiveDownloadsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ActiveDownloadsSheet({ visible, onClose }: ActiveDownloadsSheetProps) {
  const { colors } = useTheme();
  const db = useSafeDatabase();

  const activeDownloads = useDownloadStore(useShallow(state => Object.values(state.activeDownloads)));
  const pendingQueue = useDownloadStore(useShallow(state => state.pendingQueue));

  const activeIds = new Set(activeDownloads.map(a => a.trackId));
  const waitingTracks = pendingQueue.filter(p => !activeIds.has(p.trackId)).map(p => ({ ...p, isWaiting: true }));

  const combinedQueue = [...activeDownloads, ...waitingTracks];

  const handleCancel = useCallback(async (item: any) => {
    if (!db) return;
    try {
      if (item.isWaiting) {
        await deleteDownloadQueueItem(db, item.trackId);
        downloadService._syncQueue(db);
      } else {
        await downloadService.cancelDownload(db, item.trackId);
      }
    } catch (e) {
      useToastStore.getState().showToast('Failed to safely cancel the download', 'error');
    }
  }, [db]);

  const headerComponent = (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Active Transfers</Text>
      {combinedQueue.length > 0 && (
        <TouchableOpacity style={styles.batchBtn} onPress={() => { if (db) downloadService.clearEntireQueue(db); }}>
          <Text style={[styles.batchBtnText, { color: colors.error }]}>Clear All</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      detached={false}
      headerComponent={headerComponent}
      minHeight={250}
      flatListProps={{
        data: combinedQueue,
        keyExtractor: (item: any) => 'progress' in item ? `active_${item.trackId}` : `waiting_${item.trackId}`,
        contentContainerStyle: [
          { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
          combinedQueue.length === 0 && { paddingVertical: spacing.md }
        ],
        showsVerticalScrollIndicator: false,
        ListEmptyComponent: (
          <View style={styles.emptyContainer}>
            <DownloadCloud color={colors.textMuted} size={48} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No active downloads</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Your ongoing and pending transfers will appear here.</Text>
          </View>
        ),
        renderItem: ({ item }: { item: any }) => {
          if ('progress' in item) {
            return <ActiveDownloadRow item={item} colors={colors} db={db} onCancel={handleCancel} />;
          } else {
            return <WaitingDownloadRow item={item} colors={colors} onCancel={handleCancel} />;
          }
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
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
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: radius.xs,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionBtn: {
    padding: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
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
});
