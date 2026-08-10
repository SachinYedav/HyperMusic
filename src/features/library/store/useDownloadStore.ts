import { create } from 'zustand';
import { DownloadTask, DownloadPauseState } from 'expo-file-system';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import * as SQLite from 'expo-sqlite';

interface ActiveDownload {
  trackId: string;
  track: ExtractedTrack;
  progress: number;
  status: 'downloading' | 'paused' | 'error';
  task?: DownloadTask;
  pauseState?: DownloadPauseState;
}

interface DownloadState {
  activeDownloads: Record<string, ActiveDownload>;
  completedDownloads: Record<string, string>; // trackId -> localFilePath
  pendingQueue: any[]; // The full list of tracks waiting in the background queue
  batchSessionTotal: number;
  batchSessionCompleted: number;
  
  // Actions
  addDownload: (track: ExtractedTrack, task: DownloadTask) => void;
  updateProgress: (trackId: string, progress: number) => void;
  setDownloadStatus: (trackId: string, status: 'downloading' | 'paused' | 'error') => void;
  setPauseState: (trackId: string, state: DownloadPauseState) => void;
  removeDownload: (trackId: string) => void;
  clearActiveDownloads: () => void;
  setPendingQueue: (queue: any[]) => void;
  setBatchMetrics: (total: number, completed: number) => void;
  incrementBatchCompleted: () => void;
  resetBatchMetrics: () => void;
  loadCompletedDownloads: () => Promise<void>;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  activeDownloads: {},
  completedDownloads: {},
  pendingQueue: [],
  batchSessionTotal: 0,
  batchSessionCompleted: 0,
  
  setBatchMetrics: (total, completed) => set({ batchSessionTotal: total, batchSessionCompleted: completed }),
  incrementBatchCompleted: () => set((state) => ({ batchSessionCompleted: state.batchSessionCompleted + 1 })),
  resetBatchMetrics: () => set({ batchSessionTotal: 0, batchSessionCompleted: 0 }),
  
  addDownload: (track, task) => set((state) => ({
    activeDownloads: {
      ...state.activeDownloads,
      [track.id]: {
        trackId: track.id,
        track,
        progress: 0,
        status: 'downloading',
        task
      }
    }
  })),
  
  updateProgress: (trackId, progress) => set((state) => {
    const download = state.activeDownloads[trackId];
    if (!download) return state;
    return {
      activeDownloads: {
        ...state.activeDownloads,
        [trackId]: { ...download, progress }
      }
    };
  }),
  
  setDownloadStatus: (trackId, status) => set((state) => {
    const download = state.activeDownloads[trackId];
    if (!download) return state;
    return {
      activeDownloads: {
        ...state.activeDownloads,
        [trackId]: { ...download, status }
      }
    };
  }),

  setPauseState: (trackId, pauseState) => set((state) => {
    const download = state.activeDownloads[trackId];
    if (!download) return state;
    return {
      activeDownloads: {
        ...state.activeDownloads,
        [trackId]: { ...download, pauseState }
      }
    };
  }),
  
  removeDownload: (trackId) => set((state) => {
    const newDownloads = { ...state.activeDownloads };
    delete newDownloads[trackId];
    return { activeDownloads: newDownloads };
  }),

  clearActiveDownloads: () => set({ activeDownloads: {} }),

  setPendingQueue: (queue) => set({ pendingQueue: queue }),

  loadCompletedDownloads: async () => {
    try {
      const db = SQLite.openDatabaseSync('hypermusic.db', { useNewConnection: true } as any);
      const rows = await db.getAllAsync<{ trackId: string, localFilePath: string }>(
        'SELECT d.trackId, t.localFilePath FROM Downloads d INNER JOIN Tracks t ON d.trackId = t.id'
      );
      const completed: Record<string, string> = {};
      rows.forEach(row => {
        if (row.localFilePath) completed[row.trackId] = row.localFilePath;
      });
      set({ completedDownloads: completed });
      db.closeSync();
    } catch (e) {
      console.warn('Failed to load completed downloads:', e);
    }
  }
}));
