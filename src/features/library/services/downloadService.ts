/**
 * @file downloadService.ts
 * @description Master orchestration service for managing background native downloads, offline local cache,
 * SQLite persistence, and automatic HTTP 403 stream URL recovery loops.
 */

import { File, Directory, Paths } from 'expo-file-system';
import { getFreeDiskStorageAsync } from 'expo-file-system/legacy';
import { SQLiteDatabase } from 'expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { extractorService } from '@/services/api/extractorService';
import { useDownloadStore } from '../store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useToastStore } from '@/store/useToastStore';
import * as Network from 'expo-network';
import { upsertTrack, clearTrackLocalPaths } from '@/database/queries';
import {
  addToQueue,
  clearEntireQueue,
  getAllPendingDownloads,
  pauseAllPending,
  removeFromQueue,
  resumeAllPaused,
  updateQueueStatus,
  markTrackDownloaded,
  deleteDownloadRecord
} from '@/database/queries/downloadQueries';
import {
  queueBatchDownload,
  pauseNativeDownload,
  resumeNativeDownload,
  cancelNativeDownload,
  addDownloadProgressListener,
  addDownloadStateListener,
  addDownloadActionListener,
  DownloadProgressEvent,
  DownloadStateEvent,
  cancelBatchNative,
  pauseBatchNative,
  resumeBatchNative
} from '../../../../modules/hyper-downloader/src';

/** Dedicated root directory for HyperMusic offline audio and artwork cache */
const DOWNLOAD_DIR = new Directory(Paths.document, 'HyperDownloads');

/** Ensures native event listeners are attached exactly once to avoid memory leaks */
let listenersInitialized = false;

/** Tracks retry attempts for HTTP 403 auto-recovery loops to prevent infinite loops */
const retryTrackers: Record<string, number> = {};

/**
 * Initializes native event listeners for monitoring background download progress and state transitions.
 * Dynamically opens ephemeral SQLite connections to ensure robust background processing without stale state.
 */
function initNativeListeners(): void {
  if (listenersInitialized) return;
  listenersInitialized = true;

  addDownloadActionListener(async (event) => {
    let db: SQLiteDatabase | null = null;
    try {
      db = await SQLite.openDatabaseAsync('hypermusic.db', { useNewConnection: true } as any);
      
      if (event.action === 'cancelBatch') {
        await downloadService.clearEntireQueue(db);
      } else if (event.action === 'pauseBatch') {
        const store = useDownloadStore.getState();
        const activeIds = Object.keys(store.activeDownloads);
        for (const id of activeIds) {
          pauseNativeDownload(id);
        }
        await pauseAllPending(db);
        await downloadService._syncQueue(db);
      } else if (event.action === 'resumeBatch') {
        await resumeAllPaused(db);
        await downloadService._syncQueue(db);
      }
    } catch (e) {
      console.error('[DownloadService] Action listener error:', e);
    } finally {
      if (db) {
        try { await db.closeAsync(); } catch (_) {}
      }
    }
  });

  // Listen to native high-frequency progress updates
  addDownloadProgressListener((event: DownloadProgressEvent) => {
    const { id, bytesWritten, totalBytes } = event;
    const percent = totalBytes > 0 ? (bytesWritten / totalBytes) * 100 : 0;
    const store = useDownloadStore.getState();
    store.updateProgress(id, percent);
  });

  // Listen to state transitions
  addDownloadStateListener(async (event: DownloadStateEvent) => {
    const { id, state, error, finalUri, artworkUri } = event;
    const store = useDownloadStore.getState();
    const activeDownload = store.activeDownloads[id];

    if (state === 'QUEUED') {
      store.setDownloadStatus(id, 'paused');
    } else if (state === 'DOWNLOADING') {
      store.setDownloadStatus(id, 'downloading');
    } else if (state === 'PAUSED') {
      store.setDownloadStatus(id, 'paused');
    } else if (state === 'COMPLETED') {
      delete retryTrackers[id];
      store.incrementBatchCompleted();
      if (activeDownload) {
        const track = activeDownload.track;
        let db: SQLiteDatabase | null = null;
        try {
          db = await SQLite.openDatabaseAsync('hypermusic.db', { useNewConnection: true } as any);
          let fileSize = 0;
          if (finalUri) {
            const file = new File(finalUri);
            if (file.exists) {
              fileSize = file.size;
            }
          }
          await upsertTrack(db, track);
          await markTrackDownloaded(db, id, finalUri || '', artworkUri || '', fileSize);
          await removeFromQueue(db, `q_*_${id}`); // Clean up Native queue state
          await downloadService._syncQueue(db);
        } catch (e) {
          console.error(`[DownloadService] Failed to persist completed download to DB for ${id}`, e);
        } finally {
          if (db) {
             try { await db.closeAsync(); } catch (_) {}
          }
        }
        
        store.removeDownload(id);
        store.completedDownloads[id] = finalUri ?? '';
        useLibraryStore.setState({ libraryRevision: Date.now() });
      }
    } else if (state === 'FAILED') {
      // Auto-recovery loop for expired YouTube stream URLs (HTTP 403)
      if (error === 'HTTP_403') {
        const retries = retryTrackers[id] || 0;
        if (retries < 2) {
          retryTrackers[id] = retries + 1;
          try {
            const freshUrl = await extractorService.getStreamUrl(id, { isDownload: true });
            if (freshUrl) {
              resumeNativeDownload(id, freshUrl);
              return;
            }
          } catch (e) {
            console.error(`[DownloadService] Failed to recover expired download for ${id}:`, e);
          }
        } else {
          delete retryTrackers[id];
        }
      }

      // Handle graceful cancellations
      if (error === 'Cancelled by user') {
        store.removeDownload(id);
        return;
      }

      console.error(`[DownloadService] Download failed for ${id}:`, error);
      store.setDownloadStatus(id, 'error');

      let db: SQLiteDatabase | null = null;
      try {
        db = await SQLite.openDatabaseAsync('hypermusic.db', { useNewConnection: true } as any);
        // Mark as failed in queue so the conductor can move on
        const queueRows = await db.getAllAsync<{ id: string }>(`SELECT id FROM DownloadQueue WHERE trackId = ?`, [id]);
        for (const row of queueRows) {
          await updateQueueStatus(db, row.id, 'FAILED');
        }
      } catch (e) {
         console.error(`[DownloadService] Failed to update failed state in DB for ${id}`, e);
      } finally {
        if (db) {
           try { await db.closeAsync(); } catch (_) {}
        }
      }
    }
  });
}

/**
 * Download Service interface exposing elegant, robust operations for managing offline audio files.
 */
export const downloadService = {
  /**
   * Syncs the SQLite pending queue to the UI Zustand store.
   */
  _syncQueue: async (db: SQLiteDatabase) => {
    try {
      const pending = await getAllPendingDownloads(db);
      useDownloadStore.getState().setPendingQueue(pending);
    } catch (e) {
      console.error('Failed to sync download queue:', e);
    }
  },

  init: async (): Promise<void> => {
    if (!DOWNLOAD_DIR.exists) {
      DOWNLOAD_DIR.create();
    }
    initNativeListeners();
  },

  getLocalPaths: (trackId: string, trackType?: string) => {
    const ext = (trackType === 'video' || trackType === 'podcast') ? 'mp4' : 'm4a';
    const audioFile = new File(DOWNLOAD_DIR, `${trackId}.${ext}`);
    const artFile = new File(DOWNLOAD_DIR, `${trackId}_art.jpg`);
    return { audioFile, artFile };
  },



  /**
   * Safe batch queueing system with ENOSPC and Duplicate preventions.
   */
  startBatchDownload: async (db: SQLiteDatabase, tracks: ExtractedTrack[]): Promise<void> => {
    initNativeListeners();

    // 1. Storage ENOSPC pre-check (Assume 8MB per track avg)
    try {
      const freeDiskSpace = await getFreeDiskStorageAsync();
      const requiredSpace = tracks.length * 8 * 1024 * 1024;
      if (freeDiskSpace < requiredSpace) {
        useToastStore.getState().showToast(`Storage Full: Need ${(requiredSpace / 1024 / 1024).toFixed(0)}MB for ${tracks.length} tracks.`, 'error');
        return;
      }
    } catch (e) {
      console.warn("Could not check free disk space", e);
    }

    // 2. Wi-Fi Check
    const settings = useSettingsStore.getState();
    let shouldPauseImmediately = false;
    if (settings.downloadWifiOnly) {
      const netState = await Network.getNetworkStateAsync();
      if (netState.type !== Network.NetworkStateType.WIFI) {
        useToastStore.getState().showToast('Download queued: Waiting for Wi-Fi', 'info');
        shouldPauseImmediately = true;
      }
    }

    // 3. Duplicate Filtering
    if (tracks.length > 1) {
      useToastStore.getState().showToast(`Queueing ${tracks.length} tracks...`, 'info');
    }

    let queuedCount = 0;

    const nativeTasks = [];

    for (const track of tracks) {
      // Check if already downloaded
      const existing = await db.getFirstAsync<{ trackId: string }>(`SELECT trackId FROM Downloads WHERE trackId = ?`, [track.id]);
      if (!existing) {
        // Persist base track info
        await upsertTrack(db, track);
        await addToQueue(db, track.id, 1);
        queuedCount++;

        const tAny = track as any;
        const targetArtworkUrl = tAny.artworkUrl || tAny.artwork || tAny.coverUrl || tAny.thumbnail;
        const isVideoContent = tAny.trackType === 'video' || tAny.trackType === 'podcast';
        const currentQuality = useSettingsStore.getState().downloadQuality;

        const nativeDownloadHandler = { cancel: () => cancelNativeDownload(track.id) };
        useDownloadStore.getState().addDownload(track as any, nativeDownloadHandler as any);

        nativeTasks.push({
          id: track.id,
          url: tAny.url, // Native Kotlin will Auto-JIT extract this if undefined!
          title: track.title,
          fileName: `${track.id}.${isVideoContent ? 'mp4' : 'm4a'}`,
          trackType: tAny.trackType || 'song',
          artworkUrl: targetArtworkUrl,
          quality: currentQuality
        });
      }
    }

    if (queuedCount > 0) {
      if (tracks.length > 1) {
        useToastStore.getState().showToast(`Added ${queuedCount} tracks to download queue`, 'success');
      }
      const store = useDownloadStore.getState();
      store.setBatchMetrics(store.batchSessionTotal + queuedCount, store.batchSessionCompleted);
      downloadService._syncQueue(db);

      // Pass the entire batch array to True Headless Kotlin Engine
      queueBatchDownload(nativeTasks);

      if (shouldPauseImmediately) {
        // Pauses both native tasks and updates DB status to PAUSED
        downloadService.pauseBatch(db);
      }
    } else {
      if (tracks.length > 1) {
        useToastStore.getState().showToast(`All tracks already downloaded`, 'success');
      }
    }
  },

  startDownload: async (db: SQLiteDatabase, track: ExtractedTrack): Promise<void> => {
    await downloadService.startBatchDownload(db, [track]);
  },

  /**
   * Gracefully cancels all pending batch downloads and wipes the entire queue.
   */
  clearEntireQueue: async (db: SQLiteDatabase): Promise<void> => {
    cancelBatchNative();
    await clearEntireQueue(db);
    useDownloadStore.getState().clearActiveDownloads();
    useDownloadStore.getState().resetBatchMetrics();
    downloadService._syncQueue(db);
    useToastStore.getState().showToast('Download queue cleared', 'info');
  },

  pauseBatch: async (db: SQLiteDatabase): Promise<void> => {
    pauseBatchNative();
    await pauseAllPending(db);
    downloadService._syncQueue(db);
  },

  resumeBatch: async (db: SQLiteDatabase): Promise<void> => {
    resumeBatchNative();
    await resumeAllPaused(db);
    downloadService._syncQueue(db);
  },

  pauseDownload: async (db: SQLiteDatabase, trackId: string): Promise<void> => {
    pauseNativeDownload(trackId);
    const queueRows = await db.getAllAsync<{ id: string }>(`SELECT id FROM DownloadQueue WHERE trackId = ?`, [trackId]);
    for (const row of queueRows) await updateQueueStatus(db, row.id, 'PAUSED');
  },

  resumeDownload: async (db: SQLiteDatabase, trackId: string): Promise<void> => {
    initNativeListeners();
    resumeNativeDownload(trackId, null);
    const queueRows = await db.getAllAsync<{ id: string }>(`SELECT id FROM DownloadQueue WHERE trackId = ?`, [trackId]);
    for (const row of queueRows) await updateQueueStatus(db, row.id, 'PENDING');
  },

  deleteDownload: async (db: SQLiteDatabase, trackId: string): Promise<void> => {
    const { audioFile: m4aFile, artFile } = downloadService.getLocalPaths(trackId, 'song');
    const { audioFile: mp4File } = downloadService.getLocalPaths(trackId, 'video');
    if (m4aFile.exists) m4aFile.delete();
    if (mp4File.exists) mp4File.delete();
    if (artFile.exists) artFile.delete();

    await deleteDownloadRecord(db, trackId);
    await clearTrackLocalPaths(db, trackId);

    useDownloadStore.setState((state) => {
      const newCompleted = { ...state.completedDownloads };
      delete newCompleted[trackId];
      return { completedDownloads: newCompleted };
    });

    useLibraryStore.setState({ libraryRevision: Date.now() });
  },

  cancelDownload: async (db: SQLiteDatabase, trackId: string): Promise<void> => {
    try {
      cancelNativeDownload(trackId);
      const queueRows = await db.getAllAsync<{ id: string }>(`SELECT id FROM DownloadQueue WHERE trackId = ?`, [trackId]);
      for (const row of queueRows) await removeFromQueue(db, row.id);

      const { audioFile: m4aFile, artFile } = downloadService.getLocalPaths(trackId, 'song');
      const { audioFile: mp4File } = downloadService.getLocalPaths(trackId, 'video');
      if (m4aFile.exists) m4aFile.delete();
      if (mp4File.exists) mp4File.delete();
      if (artFile.exists) artFile.delete();
      
      useDownloadStore.getState().removeDownload(trackId);
    } catch (e) {
      console.error(`Error during cancel cleanup for ${trackId}`, e);
    }
  }
};
