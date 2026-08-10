import { useState } from 'react';
import { Image } from 'expo-image';
import { SQLiteDatabase } from 'expo-sqlite';
import { useToastStore } from '@/store/useToastStore';
import { clearAllPlaybackHistory } from '@/database/queries/historyQueries';
import { getDownloadedTracks } from '@/database/queries/downloadQueries';
import { downloadService } from '@/features/library/services/downloadService';

export function useStorageActions(db: SQLiteDatabase | null, onRefreshStats: () => void) {
  const [sheetConfig, setSheetConfig] = useState<{ visible: boolean; title: string; message: string; onConfirm: () => void }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setSheetConfig({ visible: true, title, message, onConfirm });
  };

  const handleClearCache = () => confirmAction(
    'Clear Cache',
    'Are you sure you want to clear the app cache? This will not delete your downloaded tracks.',
    async () => {
      setSheetConfig(prev => ({ ...prev, visible: false }));
      try {
        await Image.clearMemoryCache();
        await Image.clearDiskCache();
        useToastStore.getState().showToast('Cache Cleared', 'success');
        onRefreshStats();
      } catch (error) {
        console.error('Failed to clear cache', error);
        useToastStore.getState().showToast('Failed to clear cache', 'error');
      }
    }
  );

  const handleClearHistory = () => confirmAction(
    'Clear Playback History',
    'Are you sure you want to clear all your playback history? This cannot be undone.',
    () => {
      setSheetConfig(prev => ({ ...prev, visible: false }));
      try {
        if (db) clearAllPlaybackHistory(db);
        useToastStore.getState().showToast('History Cleared', 'success');
        onRefreshStats();
      } catch (e) {
        console.error(e);
        useToastStore.getState().showToast('Failed to clear history', 'error');
      }
    }
  );

  const handleDeleteAllDownloads = () => confirmAction(
    'Remove All Downloads',
    'Are you sure you want to delete all downloaded tracks? You will need an internet connection to listen to them again.',
    async () => {
      setSheetConfig(prev => ({ ...prev, visible: false }));
      try {
        if (db) {
          const downloaded = await getDownloadedTracks(db);
          for (const track of downloaded) {
            await downloadService.deleteDownload(db, track.id);
          }
        }
        useToastStore.getState().showToast('Downloads Removed', 'success');
        onRefreshStats();
      } catch (e) {
        console.error(e);
        useToastStore.getState().showToast('Failed to remove downloads', 'error');
      }
    }
  );

  return {
    sheetConfig,
    setSheetConfig,
    handleClearCache,
    handleClearHistory,
    handleDeleteAllDownloads,
  };
}
