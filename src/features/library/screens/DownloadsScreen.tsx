import React, { useState, useCallback, memo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { useToastStore } from '@/store/useToastStore';
import { Screen } from '@/ui/Screen';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { useDownloadStore } from '../store/useDownloadStore';
import { PremiumImage } from '@/ui/PremiumImage';
import { useShallow } from 'zustand/react/shallow';
import { useDownloadedSongs } from '@/features/library/hooks/useLibrary';
import { downloadService } from '../services/downloadService';
import { ArrowLeft, DownloadCloud, MoreVertical, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '@/store';
import { AppConfirmSheet } from '@/ui/AppConfirmSheet';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';
import { FlashList } from '@shopify/flash-list';
import { ActiveDownloadsSheet } from '../components/ActiveDownloadsSheet';
import { formatBytes } from '@/utils/formatters';
import { AnimatedEQ } from '@/ui/AnimatedEQ';
import { WaveLoader } from '@/ui/WaveLoader';



const CompletedDownloadRow = memo(({ item, index, colors, isPlaying, onPlay, onDelete, onMorePress }: { item: any, index: number, colors: any, isPlaying: boolean, onPlay: (item: any, index: number) => void, onDelete: (id: string) => void, onMorePress: (item: any) => void }) => {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (progress: RNAnimated.AnimatedInterpolation<number>, dragX: RNAnimated.AnimatedInterpolation<number>) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    const bgOpacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.3],
    });
    return (
      <View style={{ width: 80, height: '100%' }}>
        <RNAnimated.View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 2000, backgroundColor: colors.error, opacity: bgOpacity }} />
        <RNAnimated.View style={{ height: '100%', opacity: progress }}>
          <RectButton style={[styles.deleteAction, { backgroundColor: colors.error, height: '100%' }]} onPress={() => { swipeableRef.current?.close(); onDelete(item.id); }}>
            <RNAnimated.View style={[styles.deleteActionContent, { transform: [{ scale: trans }] }]}>
              <Trash2 color={colors.text} size={24} />
            </RNAnimated.View>
          </RectButton>
        </RNAnimated.View>
      </View>
    );
  };

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} rightThreshold={40} overshootRight={false}>
      <TouchableOpacity style={styles.itemContainer} onPress={() => onPlay(item, index)} activeOpacity={0.7}>
        {isPlaying ? (
          <View style={{ width: 24, alignItems: 'center', marginRight: spacing.sm }}>
            <AnimatedEQ />
          </View>
        ) : (
          <Text style={[styles.serialText, { color: colors.textMuted }]}>{index + 1}</Text>
        )}
        <PremiumImage source={item.localArtworkPath ? { uri: item.localArtworkPath } : item.artworkUrl} contextType="track" style={styles.artwork} fallbackIconSize={20} />
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>
            {item.artist}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
            <DownloadCloud color={colors.success} size={14} />
            <Text style={[styles.downloadedText, { color: colors.success }]}>
              {' Downloaded'}
              {item.size ? ` • ${formatBytes(item.size)}` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.actionBtn} hitSlop={10} onPress={() => onMorePress(item)}>
          <MoreVertical color={colors.text} size={20} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Swipeable>
  );
});

/**
 * Active download queue and offline local cache management screen providing granular pause, resume, and file deletion controls.
 */
export function DownloadsScreen() {
  const { colors, isDark } = useTheme();
  const db = useSafeDatabase();
  const navigation = useNavigation();
  const playList = usePlayerStore(state => state.playList);
  const activeTrack = usePlayerStore(state => state.activeTrack);
  const { openSheet } = useActionSheetStore();

  const activeDownloads = useDownloadStore(useShallow(state => Object.values(state.activeDownloads)));
  const pendingQueue = useDownloadStore(useShallow(state => state.pendingQueue));
  const completedDownloads = useDownloadedSongs();

  const totalActive = activeDownloads.length + pendingQueue.length;

  const [sheetVisible, setSheetVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    // Grace period for local SQLite extraction to prevent empty state flash
    const timer = setTimeout(() => setIsLoading(false), 250);
    return () => clearTimeout(timer);
  }, [completedDownloads]);

  const handlePlay = useCallback((track: any, index: number) => {
    const queue = completedDownloads.map((item: any) => ({
      ...item,
      artworkUrl: item.localArtworkPath || item.artworkUrl,
      artwork: item.localArtworkPath || item.artworkUrl,
      url: item.localFilePath,
      trackType: item.trackType || 'song',
    }));
    playList(queue as any[], index);
  }, [completedDownloads, playList]);

  const handleDelete = useCallback((trackId: string) => {
    setTaskToDelete(trackId);
  }, []);

  const handleMorePress = useCallback((track: any) => {
    openSheet('track', track);
  }, [openSheet]);

  const confirmDelete = async () => {
    if (taskToDelete) {
      if (!db) return;
      try {
        await downloadService.deleteDownload(db, taskToDelete);
        useToastStore.getState().showToast('Download removed', 'info');
      } catch (e) {
        useToastStore.getState().showToast('Failed to delete the download', 'error');
      }
    }
    setTaskToDelete(null);
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
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Downloads</Text>
        </View>
        <TouchableOpacity style={styles.transfersBtn} onPress={() => setSheetVisible(true)}>
          <DownloadCloud color={colors.text} size={24} />
          {totalActive > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.brand }]}>
              <Text style={styles.badgeText}>{totalActive}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <FlashList
          data={completedDownloads}
          keyExtractor={(item) => `completed_${item.id}`}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 170 }}
          showsVerticalScrollIndicator={false}
          //@ts-ignore
          estimatedItemSize={70}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyContainer}>
                <WaveLoader />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <DownloadCloud color={colors.textMuted} size={48} />
                <Text style={[styles.emptyText, { color: colors.text }]}>No Downloads Yet</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>Music you download will appear here for offline listening.</Text>
              </View>
            )
          }
          renderItem={({ item, index }) => (
            <CompletedDownloadRow
              item={item}
              index={index}
              colors={colors}
              isPlaying={activeTrack?.id === item.id}
              onPlay={handlePlay}
              onDelete={handleDelete}
              onMorePress={handleMorePress}
            />
          )}
        />
      </View>

      <ActiveDownloadsSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />

      <AppConfirmSheet
        visible={!!taskToDelete}
        title="Delete Download"
        message="Are you sure you want to delete this downloaded track from your device?"
        cancelText="Cancel"
        confirmText="Confirm"
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderBottomColor: 'rgba(150,150,150,0.2)',
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
