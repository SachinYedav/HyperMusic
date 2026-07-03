import { create } from 'zustand';
import { Track } from '@/types';
import TrackPlayer from 'react-native-track-player';

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

interface PlayerState {
  activeTrack: Track | null;
  playbackState: 'playing' | 'paused' | 'loading' | 'stopped' | 'error' | 'resolving' | 'buffering';
  isPlaying: boolean;
  isBuffering: boolean;
  isMiniPlayerVisible: boolean;
  queue: Track[];

  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;
  shuffledIndices: number[];

  expandPlayerSignal: number;
  urlCache: Record<string, { url: string; extractedAt: number }>;
  colorCache: Record<string, string>;

  setColorCache: (trackId: string, color: string) => void;

  setActiveTrack: (track: Track | null) => void;
  setQueue: (tracks: Track[]) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  setPlaybackState: (state: 'playing' | 'paused' | 'loading' | 'stopped' | 'error' | 'resolving' | 'buffering') => void;
  setPlaybackFlags: (isPlaying: boolean, isBuffering: boolean) => void;

  getNextTrack: () => Track | null;
  getPreviousTrack: () => Track | null;

  playTrack: (track: Track) => void;
  playList: (tracks: Track[], startIndex?: number, startShuffled?: boolean) => void;
  insertNext: (track: Track) => void;
  appendToQueue: (track: Track) => void;
  appendTracks: (tracks: Track[]) => void;

  pause: () => void;
  resume: () => void;
  skipToNext: () => void;
  skipToPrevious: () => void;

  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  activeTrack: null,
  playbackState: 'stopped',
  isPlaying: false,
  isBuffering: false,
  isMiniPlayerVisible: false,
  queue: [],

  repeatMode: 'off',
  isShuffle: false,
  shuffledIndices: [],

  expandPlayerSignal: 0,
  urlCache: {},
  colorCache: {},

  setColorCache: (trackId, color) => set((state) => ({
    colorCache: { ...state.colorCache, [trackId]: color }
  })),

  setActiveTrack: (track) => {
    const state = get();
    if (!track) {
      set({ activeTrack: null, isMiniPlayerVisible: false, isPlaying: false, isBuffering: false });
      return;
    }

    if (state.isShuffle) {
      const idx = state.queue.findIndex(t => t.id === track.id);
      if (idx !== -1) {
        const remainingIndices = state.queue.map((_, i) => i).filter(i => i !== idx);
        const newShuffled = [idx, ...shuffleArray(remainingIndices)];
        set({ activeTrack: track, isMiniPlayerVisible: true, shuffledIndices: newShuffled });
        return;
      }
    }
    set({ activeTrack: track, isMiniPlayerVisible: true });
  },

  setQueue: (tracks) => set({ queue: tracks }),

  updateTrack: (trackId, updates) => set((state) => {
    const newQueue = state.queue.map(t => t.id === trackId ? { ...t, ...updates } : t);
    const newActive = state.activeTrack?.id === trackId ? { ...state.activeTrack, ...updates } : state.activeTrack;

    let newUrlCache = state.urlCache;
    if (updates.url && updates.extractedAt) {
      newUrlCache = {
        ...state.urlCache,
        [trackId]: { url: updates.url, extractedAt: updates.extractedAt }
      };
    }

    return { queue: newQueue, activeTrack: newActive, urlCache: newUrlCache };
  }),

  setPlaybackState: (state) => set({ playbackState: state }),
  setPlaybackFlags: (isPlaying, isBuffering) => set({ isPlaying, isBuffering }),

  getNextTrack: () => {
    const state = get();
    if (!state.activeTrack || state.queue.length === 0) return null;

    if (state.repeatMode === 'one') {
      return state.activeTrack;
    }

    const currIdx = state.queue.findIndex(t => t.id === state.activeTrack?.id);
    if (currIdx === -1) return null;

    if (state.isShuffle) {
      const pos = state.shuffledIndices.indexOf(currIdx);
      if (pos === -1) return null;
      if (pos + 1 < state.shuffledIndices.length) {
        return state.queue[state.shuffledIndices[pos + 1]];
      } else {
        return state.repeatMode === 'all' ? state.queue[state.shuffledIndices[0]] : null;
      }
    } else {
      if (currIdx + 1 < state.queue.length) {
        return state.queue[currIdx + 1];
      } else {
        return state.repeatMode === 'all' ? state.queue[0] : null;
      }
    }
  },

  getPreviousTrack: () => {
    const state = get();
    if (!state.activeTrack || state.queue.length === 0) return null;

    const currIdx = state.queue.findIndex(t => t.id === state.activeTrack?.id);
    if (currIdx === -1) return null;

    if (state.isShuffle) {
      const pos = state.shuffledIndices.indexOf(currIdx);
      if (pos === -1) return null;
      if (pos - 1 >= 0) {
        return state.queue[state.shuffledIndices[pos - 1]];
      } else {
        return state.repeatMode === 'all' ? state.queue[state.shuffledIndices[state.shuffledIndices.length - 1]] : null;
      }
    } else {
      if (currIdx - 1 >= 0) {
        return state.queue[currIdx - 1];
      } else {
        return state.repeatMode === 'all' ? state.queue[state.queue.length - 1] : null;
      }
    }
  },

  playTrack: (track) => {
    const state = get();
    const cached = state.urlCache[track.id];
    const finalTrack = cached ? { ...track, url: cached.url, isExtracted: true, extractedAt: cached.extractedAt } : track;

    set({
      activeTrack: finalTrack,
      queue: [finalTrack],
      isShuffle: false,
      shuffledIndices: [],
      isMiniPlayerVisible: true,
      playbackState: 'playing',
      isPlaying: true,
      isBuffering: !cached,
      expandPlayerSignal: Date.now()
    });
  },

  playList: (tracks, startIndex = 0, startShuffled = false) => {
    if (tracks.length === 0) return;

    const state = get();
    const hydratedTracks = tracks.map(t => {
      const cached = state.urlCache[t.id];
      if (cached) {
        return { ...t, url: cached.url, isExtracted: true, extractedAt: cached.extractedAt };
      }
      return t;
    });

    const activeItem = hydratedTracks[startIndex];
    const isCached = !!activeItem?.isExtracted;

    if (startShuffled) {
      const remainingIndices = hydratedTracks.map((_, i) => i).filter(i => i !== startIndex);
      const shuffledIndices = [startIndex, ...shuffleArray(remainingIndices)];

      set({
        isShuffle: true,
        queue: hydratedTracks,
        shuffledIndices,
        activeTrack: activeItem,
        isMiniPlayerVisible: true,
        playbackState: 'playing',
        isPlaying: true,
        isBuffering: !isCached,
        expandPlayerSignal: Date.now()
      });
    } else {
      set({
        isShuffle: false,
        queue: hydratedTracks,
        shuffledIndices: [],
        activeTrack: activeItem,
        isMiniPlayerVisible: true,
        playbackState: 'playing',
        isPlaying: true,
        isBuffering: !isCached,
        expandPlayerSignal: Date.now()
      });
    }
  },

  insertNext: (track) => {
    const state = get();
    if (state.queue.length === 0) {
      get().playTrack(track);
      return;
    }

    if (state.queue.some(t => t.id === track.id)) {
      return; // Deduplicate: prevent queue spamming
    }

    const cached = state.urlCache[track.id];
    const finalTrack = cached ? { ...track, url: cached.url, isExtracted: true, extractedAt: cached.extractedAt } : track;

    const currIdx = state.queue.findIndex(t => t.id === state.activeTrack?.id);
    const insertIdx = currIdx !== -1 ? currIdx + 1 : state.queue.length;

    const newQueue = [...state.queue];
    newQueue.splice(insertIdx, 0, finalTrack);

    let newShuffled = [...state.shuffledIndices];
    if (state.isShuffle) {
      newShuffled = newShuffled.map(idx => idx >= insertIdx ? idx + 1 : idx);
      const currentShufflePos = newShuffled.indexOf(currIdx);
      if (currentShufflePos !== -1) {
        newShuffled.splice(currentShufflePos + 1, 0, insertIdx);
      } else {
        newShuffled.push(insertIdx);
      }
    }

    set({ queue: newQueue, shuffledIndices: newShuffled });
  },

  appendToQueue: (track) => {
    const state = get();
    if (state.queue.length === 0) {
      get().playTrack(track);
      return;
    }

    if (state.queue.some(t => t.id === track.id)) {
      return; // Deduplicate: prevent queue spamming
    }

    const cached = state.urlCache[track.id];
    const finalTrack = cached ? { ...track, url: cached.url, isExtracted: true, extractedAt: cached.extractedAt } : track;

    const newQueue = [...state.queue, finalTrack];

    let newShuffled = [...state.shuffledIndices];
    if (state.isShuffle) {
      newShuffled.push(newQueue.length - 1);
    }

    set({ queue: newQueue, shuffledIndices: newShuffled });
  },

  appendTracks: (tracks) => {
    if (tracks.length === 0) return;
    const state = get();

    // Hydrate tracks with cached URLs if any
    const hydratedTracks = tracks.map(t => {
      const cached = state.urlCache[t.id];
      if (cached) {
        return { ...t, url: cached.url, isExtracted: true, extractedAt: cached.extractedAt };
      }
      return t;
    });

    const newQueue = [...state.queue, ...hydratedTracks];

    let newShuffled = [...state.shuffledIndices];
    if (state.isShuffle) {
        // Just append the new indices to the end of the shuffled array 
        const startIndex = state.queue.length;
        for (let i = 0; i < tracks.length; i++) {
            newShuffled.push(startIndex + i);
        }
    }

    set({ queue: newQueue, shuffledIndices: newShuffled });
  },

  pause: () => set({ playbackState: 'paused', isPlaying: false }),
  resume: () => set({ playbackState: 'playing', isPlaying: true }),

  skipToNext: async () => {
    const state = get();
    if (state.repeatMode === 'one') {
      TrackPlayer.seekTo(0);
      TrackPlayer.play();
      set({ playbackState: 'playing', isPlaying: true, isBuffering: false });
      return;
    }

    const next = state.getNextTrack();
    if (next) {
      set({ activeTrack: next, playbackState: 'loading', isPlaying: true, isBuffering: !next.isExtracted });
    } else {
      set({ playbackState: 'stopped', isPlaying: false, isBuffering: false });
    }
  },

  skipToPrevious: () => {
    const state = get();
    if (state.repeatMode === 'one') {
      TrackPlayer.seekTo(0);
      TrackPlayer.play();
      set({ playbackState: 'playing', isPlaying: true, isBuffering: false });
      return;
    }

    const prev = state.getPreviousTrack();
    if (prev) {
      set({ activeTrack: prev, playbackState: 'loading', isPlaying: true, isBuffering: !prev.isExtracted });
    }
  },

  toggleShuffle: () => {
    const state = get();
    if (!state.activeTrack || state.queue.length <= 1) return;

    if (state.isShuffle) {
      set({ isShuffle: false, shuffledIndices: [] });
    } else {
      const currIdx = state.queue.findIndex(t => t.id === state.activeTrack?.id);
      const remainingIndices = state.queue.map((_, i) => i).filter(i => i !== currIdx);
      const shuffledIndices = [currIdx, ...shuffleArray(remainingIndices)];

      set({
        isShuffle: true,
        shuffledIndices
      });
    }
  },

  toggleRepeat: () => {
    const current = get().repeatMode;
    const nextMode = current === 'off' ? 'all' : current === 'all' ? 'one' : 'off';
    set({ repeatMode: nextMode });
  }
}));
