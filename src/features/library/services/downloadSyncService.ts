import { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { getAndClearCompletedDownloads, queueBatchDownload } from '../../../../modules/hyper-downloader/src';
import { getAllPendingDownloads } from '@/database/queries/downloadQueries';
import { upsertTrack, updateTrackLocalPaths, insertDownloadRecord, deleteDownloadQueueItem } from '@/database/queries';
import { useDownloadStore } from '../store/useDownloadStore';
import { downloadService } from './downloadService';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

export const downloadSyncService = {
  /**
   * Reconciles the SQLite Database with Native Kotlin's Headless Download Manager.
   * This handles the edge case where the JS thread was asleep (Doze mode) while Native 
   * successfully completed background downloads.
   * 
   * Runs on: App Launch, App Foregrounding (AppState active)
   */
  reconcileDatabase: async (db: SQLiteDatabase) => {
    try {
      const completedIds = getAndClearCompletedDownloads();
      if (!completedIds || completedIds.length === 0) return;

      for (const trackId of completedIds) {
        // Fetch track info to ensure it exists in Tracks table
        const pendingQueueRow = await db.getFirstAsync<{trackId: string, trackType: string}>(
          `SELECT t.*, q.id as queueId FROM DownloadQueue q JOIN Tracks t ON q.trackId = t.id WHERE q.trackId = ?`, 
          [trackId]
        );
        
        if (pendingQueueRow) {
          const { audioFile, artFile } = downloadService.getLocalPaths(trackId, pendingQueueRow.trackType);
          
          // Use SSOT queries to finalize download record
          await updateTrackLocalPaths(db, trackId, audioFile.uri, artFile.exists ? artFile.uri : '');
          const fileInfo = await FileSystem.getInfoAsync(audioFile.uri);
          const size = fileInfo.exists ? (fileInfo as any).size : 0;
          await insertDownloadRecord(db, trackId, size);
          
          // Use SSOT query to clear from queue
          await deleteDownloadQueueItem(db, trackId);
          
          const store = useDownloadStore.getState();
          store.incrementBatchCompleted();
          store.removeDownload(trackId);
          store.completedDownloads[trackId] = audioFile.uri;
        }
      }
      
      downloadService._syncQueue(db);
    } catch (e) {
      console.error('[Sync] Error during database reconciliation:', e);
    }
  },

  /**
   * Called ONCE strictly at App Launch.
   * If the app was killed from Recent Tasks (swiped away), Native Kotlin's foreground service was also killed.
   * This function reads the SQLite Database for any leftover 'PENDING'/'PAUSED' items 
   * and pushes them back to the Native Headless Engine so they automatically resume.
   */
  resumeOrphanedDownloads: async (db: SQLiteDatabase) => {
    try {
      const pendingTracks = await getAllPendingDownloads(db);
      if (pendingTracks.length === 0) return;

      const nativeTasks = pendingTracks.map(queueItem => {
        const isVideoContent = queueItem.trackType === 'video' || queueItem.trackType === 'podcast';
        const targetArtworkUrl = queueItem.artworkUrl || queueItem.artwork || queueItem.coverUrl || queueItem.thumbnail;

        // Restore active download UI state
        const nativeDownloadHandler = { cancel: () => {} }; // Handled internally
        const trackObj = {
          id: queueItem.trackId,
          title: queueItem.title,
          artist: queueItem.artist,
          artworkUrl: targetArtworkUrl,
          artwork: targetArtworkUrl,
          trackType: queueItem.trackType
       };
       useDownloadStore.getState().addDownload(trackObj as any, nativeDownloadHandler as any);

        return {
          id: queueItem.trackId,
          url: queueItem.url,
          title: queueItem.title,
          fileName: `${queueItem.trackId}.${isVideoContent ? 'mp4' : 'm4a'}`,
          trackType: queueItem.trackType || 'song',
          artworkUrl: targetArtworkUrl,
          quality: useSettingsStore.getState().downloadQuality
        };
      });

      queueBatchDownload(nativeTasks);
    } catch (e) {
      console.error('[Sync] Error resuming orphaned downloads:', e);
    }
  },

  /**
   * Cleans up any .tmp files in the HyperDownloads directory that do NOT belong to 
   * an active download in the SQLite DownloadQueue. This prevents SD card storage leaks.
   */
  cleanupOrphanedTemps: async (db: SQLiteDatabase) => {
    try {
      const downloadDir = FileSystem.documentDirectory + 'HyperDownloads/';
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(downloadDir);
      const tmpFiles = files.filter(f => f.endsWith('.tmp'));
      if (tmpFiles.length === 0) return;

      // Get all active downloads
      const pendingTracks = await getAllPendingDownloads(db);
      const activeTrackIds = new Set(pendingTracks.map(t => t.trackId));

      let deletedCount = 0;
      for (const file of tmpFiles) {
        // Filename format: trackId.m4a.tmp or trackId.mp4.tmp
        const trackId = file.split('.')[0];
        
        if (!activeTrackIds.has(trackId)) {
          await FileSystem.deleteAsync(downloadDir + file, { idempotent: true });
          deletedCount++;
        }
      }
    } catch (e) {
      console.error('[Sync] Error cleaning up orphaned temp files:', e);
    }
  }
};
