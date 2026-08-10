import React, { useMemo } from 'react';
import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useDownloadStore } from '@/features/library/store/useDownloadStore';
import { ArrowDownToLine, CheckCircle2, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { downloadService } from '@/features/library/services/downloadService';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { useToastStore } from '@/store/useToastStore';

export function BatchDownloadButton({ 
  collectionId, 
  mappedTracks, 
  onPressDownload 
}: { 
  collectionId: string, 
  mappedTracks: any[], 
  onPressDownload: () => void 
}) {
  const { colors } = useTheme();
  const db = useSafeDatabase();
  
  const completedDownloads = useDownloadStore(state => state.completedDownloads);
  const activeDownloads = useDownloadStore(state => state.activeDownloads);
  const pendingQueue = useDownloadStore(state => state.pendingQueue);
  
  const metrics = useMemo(() => {
    let completed = 0;
    let downloading = 0;
    
    if (mappedTracks.length === 0) return { completed: 0, downloading: 0, total: 0 };
    
    for (const track of mappedTracks) {
      if (completedDownloads[track.id]) {
        completed++;
      } else if (activeDownloads[track.id] || pendingQueue.some(q => q.trackId === track.id)) {
        downloading++;
      }
    }
    
    return {
      completed,
      downloading,
      total: mappedTracks.length
    };
  }, [mappedTracks, completedDownloads, activeDownloads, pendingQueue]);

  const isAllDownloaded = metrics.total > 0 && metrics.completed === metrics.total;
  const isBatchActive = metrics.downloading > 0;
  
  const handlePress = async () => {
    if (isAllDownloaded) {
      useToastStore.getState().showToast('All tracks are downloaded', 'success');
      return;
    }
    
    if (isBatchActive) {
      if (!db) return;
      const tracksToCancel = mappedTracks.filter(t => activeDownloads[t.id] || pendingQueue.some(q => q.trackId === t.id));
      tracksToCancel.forEach(t => {
        downloadService.cancelDownload(db, t.id);
      });
      useToastStore.getState().showToast(`Cancelled ${tracksToCancel.length} downloads`, 'info');
      return;
    }
    
    onPressDownload();
  };

  return (
    <Pressable
      style={[styles.circleBtn, { backgroundColor: colors.border }]}
      onPress={handlePress}
    >
      {isAllDownloaded ? (
        <CheckCircle2 color={colors.success} size={20} />
      ) : isBatchActive ? (
        <X color={colors.text} size={20} />
      ) : (
        <ArrowDownToLine color={colors.text} size={20} />
      )}
      {isBatchActive && (
         <ActivityIndicator 
           size="large" 
           color={colors.brand} 
           style={StyleSheet.absoluteFill} 
         />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  }
});
