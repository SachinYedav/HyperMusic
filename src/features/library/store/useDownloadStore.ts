import { create } from 'zustand';
import { DownloadTask, DownloadPauseState } from 'expo-file-system';
import { ExtractedTrack } from 'react-native-hyper-extractor';

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
  
  // Actions
  addDownload: (track: ExtractedTrack, task: DownloadTask) => void;
  updateProgress: (trackId: string, progress: number) => void;
  setDownloadStatus: (trackId: string, status: 'downloading' | 'paused' | 'error') => void;
  setPauseState: (trackId: string, state: DownloadPauseState) => void;
  removeDownload: (trackId: string) => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  activeDownloads: {},
  
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
  })
}));
