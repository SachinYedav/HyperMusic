/**
 * @file downloadService.ts
 * @description Master orchestration service for managing background native downloads, offline local cache,
 * SQLite persistence, and automatic HTTP 403 stream URL recovery loops.
 */

import { File, Directory, Paths, DownloadTask as ExpoDownloadTask } from 'expo-file-system';
import { SQLiteDatabase } from 'expo-sqlite';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { extractorService } from '@/services/api/extractorService';
import { useDownloadStore } from '../store/useDownloadStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import * as Network from 'expo-network';
import { Alert } from 'react-native';
import { upsertTrack, libraryEmitter } from './libraryService';
import {
  startNativeDownload,
  pauseNativeDownload,
  resumeNativeDownload,
  cancelNativeDownload,
  addDownloadProgressListener,
  addDownloadStateListener,
  DownloadProgressEvent,
  DownloadStateEvent
} from '../../../../modules/hyper-downloader/src';

/** Dedicated root directory for HyperMusic offline audio and artwork cache */
const DOWNLOAD_DIR = new Directory(Paths.document, 'HyperDownloads');

/** Ensures native event listeners are attached exactly once to avoid memory leaks */
let listenersInitialized = false;

/** Ephemeral reference to active SQLite instance for background state persistence */
let globalDbInstance: SQLiteDatabase | null = null;

/** Tracks retry attempts for HTTP 403 auto-recovery loops to prevent infinite loops */
const retryTrackers: Record<string, number> = {};

/**
 * Initializes native event listeners for monitoring background download progress and state transitions.
 * Binds directly to the HyperDownloader native module events.
 */
function initNativeListeners(): void {
  if (listenersInitialized) return;
  listenersInitialized = true;

  // Listen to native high-frequency progress updates (throttled natively to 1000ms)
  addDownloadProgressListener((event: DownloadProgressEvent) => {
    const { id, bytesWritten, totalBytes } = event;
    const percent = totalBytes > 0 ? (bytesWritten / totalBytes) * 100 : 0;
    useDownloadStore.getState().updateProgress(id, percent);
  });

  // Listen to state transitions (QUEUED, DOWNLOADING, PAUSED, COMPLETED, FAILED)
  addDownloadStateListener(async (event: DownloadStateEvent) => {
    const { id, state, error, finalUri } = event;
    const store = useDownloadStore.getState();
    const activeDownload = store.activeDownloads[id];
    if (!activeDownload) return;

    if (state === 'QUEUED') {
      store.setDownloadStatus(id, 'paused');
    } else if (state === 'DOWNLOADING') {
      store.setDownloadStatus(id, 'downloading');
    } else if (state === 'PAUSED') {
      store.setDownloadStatus(id, 'paused');
    } else if (state === 'COMPLETED') {
      delete retryTrackers[id];
      const track = activeDownload.track;
      const { artFile } = downloadService.getLocalPaths(id);
      const targetArtworkUrl = track.artworkUrl || (track as any).artwork || (track as any).coverUrl || (track as any).thumbnail;

      // Download artwork via Expo FileSystem 
      let localArtworkPath = null;
      if (targetArtworkUrl) {
        try {
          const artTask = new ExpoDownloadTask(targetArtworkUrl, artFile);
          await artTask.downloadAsync();
          if (artFile.exists) {
            localArtworkPath = artFile.uri;
          }
        } catch (artErr) {
          console.warn(`Failed to download artwork for ${id}`, artErr);
        }
      }

      // Persist completed download metadata to SQLite Tracks and Downloads tables
      if (globalDbInstance) {
        try {
          await upsertTrack(globalDbInstance, track);
          await globalDbInstance.runAsync(
            `UPDATE Tracks SET localFilePath = ?, localArtworkPath = ? WHERE id = ?`,
            [finalUri ?? null, localArtworkPath, id]
          );
          await globalDbInstance.runAsync(
            `INSERT OR REPLACE INTO Downloads (trackId, downloadedAt, size, status) VALUES (?, ?, ?, 'completed')`,
            [id, Date.now(), null]
          );
          libraryEmitter.emit();
        } catch (dbErr) {
          console.error(`Failed to persist completed download to DB for ${id}`, dbErr);
        }
      }

      store.removeDownload(id);
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
              return; // Successfully back in queue
            }
          } catch (e) {
            console.error(`Failed to recover expired download for ${id}:`, e);
          }
        } else {
          delete retryTrackers[id];
        }
      }

      console.error(`Download failed for ${id}:`, error);
      store.setDownloadStatus(id, 'error');
    }
  });
}

/**
 * Download Service interface exposing elegant, robust operations for managing offline audio files.
 */
export const downloadService = {
  /**
   * Initializes the root download directory and attaches native event listeners.
   */
  init: async (): Promise<void> => {
    if (!DOWNLOAD_DIR.exists) {
      DOWNLOAD_DIR.create();
    }
    initNativeListeners();
  },

  /**
   * Resolves local file system objects for offline audio and artwork cache.
   * @param trackId Unique identifier of the track
   * @returns Object containing audioFile and artFile File instances
   */
  getLocalPaths: (trackId: string) => {
    const audioFile = new File(DOWNLOAD_DIR, `${trackId}.m4a`);
    const artFile = new File(DOWNLOAD_DIR, `${trackId}_art.jpg`);
    return { audioFile, artFile };
  },

  /**
   * Initiates a new background native download with Wi-Fi safeguard checks and auto-extraction.
   * @param db Active SQLite database instance
   * @param track ExtractedTrack metadata object
   */
  startDownload: async (db: SQLiteDatabase, track: ExtractedTrack): Promise<void> => {
    try {
      globalDbInstance = db;
      initNativeListeners();
      const store = useDownloadStore.getState();

      if (store.activeDownloads[track.id]) {
        return;
      }

      // Verify Wi-Fi connectivity if downloadWifiOnly setting is active
      const settings = useSettingsStore.getState();
      if (settings.downloadWifiOnly) {
        const netState = await Network.getNetworkStateAsync();
        if (netState.type !== Network.NetworkStateType.WIFI) {
          Alert.alert('Download Paused', 'Download over Wi-Fi is enabled but you are not connected to Wi-Fi.');
          return;
        }
      }

      // Extract fresh stream URL if not already present in track object
      let streamUrl = (track as any).url;
      if (!streamUrl) {
        streamUrl = await extractorService.getStreamUrl(track.id, { isDownload: true });
        if (!streamUrl) throw new Error("Failed to extract stream URL");
      }

      // Normalize artworkUrl on track object to support TrackPlayer activeTrack structures
      const normalizedArtwork = track.artworkUrl || (track as any).artwork || (track as any).coverUrl || (track as any).thumbnail;
      const normalizedTrack = {
        ...track,
        artworkUrl: normalizedArtwork,
        artwork: normalizedArtwork
      };

      const nativeDownloadHandler = { cancel: () => cancelNativeDownload(track.id) };
      store.addDownload(normalizedTrack as any, nativeDownloadHandler as any);

      startNativeDownload(track.id, streamUrl, track.title, `${track.id}.m4a`);
    } catch (e) {
      console.error("Download start failed:", e);
      useDownloadStore.getState().setDownloadStatus(track.id, 'error');
    }
  },

  /**
   * Pauses an active background download in the native engine.
   * @param trackId Unique identifier of the track
   */
  pauseDownload: async (trackId: string): Promise<void> => {
    pauseNativeDownload(trackId);
  },

  /**
   * Resumes a paused or failed download in the native engine.
   * @param db Active SQLite database instance
   * @param trackId Unique identifier of the track
   */
  resumeDownload: async (db: SQLiteDatabase, trackId: string): Promise<void> => {
    globalDbInstance = db;
    initNativeListeners();
    resumeNativeDownload(trackId, null);
  },

  /**
   * Deletes a completed download from the file system and clears its SQLite persistence.
   * @param db Active SQLite database instance
   * @param trackId Unique identifier of the track
   */
  deleteDownload: async (db: SQLiteDatabase, trackId: string): Promise<void> => {
    const { audioFile, artFile } = downloadService.getLocalPaths(trackId);
    if (audioFile.exists) audioFile.delete();
    if (artFile.exists) artFile.delete();

    await db.runAsync(`DELETE FROM Downloads WHERE trackId = ?`, [trackId]);
    await db.runAsync(
      `UPDATE Tracks SET localFilePath = NULL, localArtworkPath = NULL WHERE id = ?`,
      [trackId]
    );

    libraryEmitter.emit();
  },

  /**
   * Cancels an active download, purges temporary files, and removes it from the store.
   * @param trackId Unique identifier of the track
   */
  cancelDownload: async (trackId: string): Promise<void> => {
    try {
      cancelNativeDownload(trackId);
      const { audioFile, artFile } = downloadService.getLocalPaths(trackId);
      if (audioFile.exists) audioFile.delete();
      if (artFile.exists) artFile.delete();
      useDownloadStore.getState().removeDownload(trackId);
    } catch (e) {
      console.error(`Error during cancel cleanup for ${trackId}`, e);
      throw e;
    }
  }
};
