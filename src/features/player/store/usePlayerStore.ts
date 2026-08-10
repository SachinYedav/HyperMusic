import { create } from 'zustand';
import { Track } from '@/types';
import { HyperPlayer } from 'react-native-hyper-player';
import { useDownloadStore } from '../../library/store/useDownloadStore';
import { useToastStore } from '@/store/useToastStore';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

/**
 * Global Zustand Store for the Audio Player.
 * Acts as the UI's Single Source of Truth (SSOT).
 * State is strictly synchronized with the Native Engine via PlayerEngineManager.
 */
interface PlayerState {
  activeTrack: Track | null;
  playbackState: 'playing' | 'paused' | 'loading' | 'stopped' | 'error' | 'resolving' | 'buffering';
  isPlaying: boolean;
  isBuffering: boolean;
  isResolving: boolean;
  isMiniPlayerVisible: boolean;
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
  queue: Track[];
  queueRevision: number;
  implicitStartIndex: number; // -1 means no auto-play section exists
  autoPlayPool: Track[]; // Background cache of radio tracks

  repeatMode: 'off' | 'all' | 'one';
  isShuffle: boolean;

  expandPlayerSignal: number;
  collapsePlayerSignal: number;
  colorCache: Record<string, string>;

  isVideoMode: boolean;
  setIsVideoMode: (isVideo: boolean) => void;

  setColorCache: (trackId: string, color: string) => void;

  /**
   * Passive setters for Native Engine events.
   * These should NOT be called directly by UI components.
   * They are exclusively triggered by PlayerEngineManager syncing from Native.
   */
  setActiveTrack: (track: Track | null) => void;
  setQueue: (tracks: Track[]) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  setPlaybackState: (state: 'playing' | 'paused' | 'loading' | 'stopped' | 'error' | 'resolving' | 'buffering') => void;
  setPlaybackFlags: (isPlaying: boolean, isBuffering: boolean, isResolving: boolean, queueRevision: number) => void;

  /**
   * Active UI Commands.
   * These methods dispatch requests directly to the Native Engine (HyperPlayer).
   */
  playTrack: (track: Track) => void;
  playList: (tracks: Track[], startIndex?: number, startShuffled?: boolean) => void;
  insertNext: (track: Track) => void;
  insertListNext: (tracks: Track[]) => void;
  appendToQueue: (track: Track) => void;
  appendTracks: (tracks: Track[]) => void;

  // Auto-Play specific
  isAutoPlayLoading: boolean;
  autoPlayError: boolean;
  setAutoPlayPool: (tracks: Track[]) => void;
  loadMoreAutoPlayTracks: () => Promise<void>;
  injectAutoPlayBatch: () => void;
  toggleAutoPlayVisibility: (isVisible: boolean) => void;

  pause: () => void;
  resume: () => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  seekTo: (positionMs: number) => void;

  reorderQueue: (fromIndex: number, toIndex: number, skipStateUpdate?: boolean) => void;

  toggleShuffle: () => void;
  toggleRepeat: () => void;
  cyclePlaybackMode: () => void;
  collapsePlayer: () => void;
}

/**
 * Helper to map JS Track objects to Native-compatible representations.
 * Crucially handles offline playback by seamlessly substituting the remote URL
 * with a local file URI if the track exists in the download store.
 */
const mapToPlayerTrack = (t: any) => {
  let downloadedUrl = useDownloadStore.getState().completedDownloads[t.id];

  if (downloadedUrl) {
    if (downloadedUrl.startsWith('/')) {
      downloadedUrl = `file://${downloadedUrl}`;
    } else if (downloadedUrl.startsWith('file:/') && !downloadedUrl.startsWith('file:///')) {
      downloadedUrl = downloadedUrl.replace('file:/', 'file:///');
    }
  }

  return {
    id: t.id,
    queueEntryId: t._queueId || t.id, // SSOT unique identity
    url: downloadedUrl || t.url || `hyper://${t.id}`,
    title: t.title,
    artist: t.artist || 'Unknown Artist',
    artworkUrl: typeof t.artwork === 'string' ? t.artwork : '',
    duration: t.duration || 0,
    trackType: t.trackType || 'song' // Default to song
  };
};

/**
 * Ensures every track has a unique instance ID (_queueId).
 * This prevents React/Native reconciliation bugs when the same song
 * appears multiple times in a queue.
 */
const ensureQueueId = (t: any) => ({
  ...t,
  _queueId: t._queueId || `${t.id}-${Math.random().toString(36).substring(2, 9)}`
});

let modeSwitchLockTimeout: ReturnType<typeof setTimeout> | null = null;

export const usePlayerStore = create<PlayerState>((set, get) => ({
  activeTrack: null,
  playbackState: 'stopped',
  isPlaying: false,
  isBuffering: false,
  isResolving: false,
  isMiniPlayerVisible: false,
  isExpanded: false,
  setExpanded: (expanded) => set({ isExpanded: expanded }),
  queue: [],
  queueRevision: 0, // SSOT revision tracking
  implicitStartIndex: -1,
  autoPlayPool: [],
  isAutoPlayLoading: false,
  autoPlayError: false,

  repeatMode: 'off',
  isShuffle: false,

  expandPlayerSignal: 0,
  collapsePlayerSignal: 0,
  colorCache: {},

  isVideoMode: false,
  setIsVideoMode: (isVideo) => {
    const state = get();
    
    set({ isVideoMode: isVideo });

    // Manage UI mode switch lock to synchronize with native video state transitions
    if (modeSwitchLockTimeout) clearTimeout(modeSwitchLockTimeout);
    modeSwitchLockTimeout = setTimeout(() => { modeSwitchLockTimeout = null; }, 1000);

    if (isVideo) {
      HyperPlayer.switchToVideo();
    } else {
      HyperPlayer.switchToAudio();
    }
  },

  setColorCache: (trackId, color) => set((state) => ({
    colorCache: { ...state.colorCache, [trackId]: color }
  })),

  // --- PASSIVE MIRROR METHODS ---
  setActiveTrack: (track) => {
    if (!track) {
      set({ activeTrack: null, isMiniPlayerVisible: false, isPlaying: false, isBuffering: false });
    } else {
      const shouldBeVideo = track.trackType === 'video' || track.trackType === 'podcast';

      // Respect the UI mode switch lock if user recently toggled manually
      if (modeSwitchLockTimeout) {
        set({ activeTrack: track, isMiniPlayerVisible: true });
      } else {
        set({ activeTrack: track, isMiniPlayerVisible: true, isVideoMode: shouldBeVideo });
      }
    }
  },

  setQueue: (tracks) => set({ queue: tracks.map(ensureQueueId) }),

  updateTrack: (trackId, updates) => set((state) => {
    const newQueue = state.queue.map(t => t.id === trackId ? { ...t, ...updates } : t);
    const newActive = state.activeTrack?.id === trackId ? { ...state.activeTrack, ...updates } : state.activeTrack;
    return { queue: newQueue, activeTrack: newActive };
  }),

  setPlaybackState: (state) => set({ playbackState: state }),
  setPlaybackFlags: (isPlaying, isBuffering, isResolving, queueRevision) => set((state) => ({
    isPlaying,
    isBuffering,
    isResolving,
    // Only accept Native queue revision if it's newer or equal, discarding stale Native events
    queueRevision: Math.max(state.queueRevision, queueRevision)
  })),

  // --- UI COMMAND METHODS ---

  playTrack: (track) => {
    const queuedTrack = ensureQueueId(track);
    const nextRevision = get().queueRevision + 1;
    set({
      queue: [queuedTrack],
      queueRevision: nextRevision,
      implicitStartIndex: -1,
      autoPlayPool: [],
      isShuffle: false,
      expandPlayerSignal: Date.now()
    });
    const playerTrack = mapToPlayerTrack(track);
    HyperPlayer.loadQueue([playerTrack], 0, get().repeatMode, false, nextRevision);
  },

  playList: (tracks, startIndex = 0, startShuffled = false) => {
    if (tracks.length === 0) return;

    if (startShuffled) {
      set({ isShuffle: true });
    }

    const isShuffle = get().isShuffle;
    const queuedTracks = tracks.map(ensureQueueId);
    const nextRevision = get().queueRevision + 1;
    set({
      queue: queuedTracks,
      queueRevision: nextRevision,
      implicitStartIndex: -1,
      autoPlayPool: [],
      expandPlayerSignal: Date.now()
    });
    const playerTracks = tracks.map(mapToPlayerTrack);

    // Synchronously dispatch to the Native Engine. The queueRevision guarantees UI/Native synchronization.
    HyperPlayer.loadQueue(playerTracks, startIndex, get().repeatMode, isShuffle, nextRevision);
  },

  insertNext: (track) => {
    const state = get();
    if (state.queue.length === 0) {
      get().playTrack(track);
      return;
    }

    const currIdx = state.queue.findIndex(t => t.id === state.activeTrack?.id);
    const insertIdx = currIdx !== -1 ? currIdx + 1 : state.queue.length;

    const queuedTrack = ensureQueueId(track);
    const newQueue = [...state.queue];
    newQueue.splice(insertIdx, 0, queuedTrack);
    const nextRevision = state.queueRevision + 1;
    set({ queue: newQueue, queueRevision: nextRevision });

    HyperPlayer.addTracks([mapToPlayerTrack(track)], insertIdx, nextRevision);
  },

  insertListNext: (tracks) => {
    if (tracks.length === 0) return;
    const state = get();
    if (state.queue.length === 0) {
      get().playList(tracks);
      return;
    }

    const currIdx = state.queue.findIndex(t => t.id === state.activeTrack?.id);
    const insertIdx = currIdx !== -1 ? currIdx + 1 : state.queue.length;

    const queuedTracks = tracks.map(ensureQueueId);
    const newQueue = [...state.queue];
    newQueue.splice(insertIdx, 0, ...queuedTracks);
    const nextRevision = state.queueRevision + 1;
    set({ queue: newQueue, queueRevision: nextRevision });

    HyperPlayer.addTracks(tracks.map(mapToPlayerTrack), insertIdx, nextRevision);
  },

  appendToQueue: (track) => {
    const state = get();
    if (state.queue.length === 0) {
      get().playTrack(track);
      return;
    }

    const queuedTrack = ensureQueueId(track);
    const newQueue = [...state.queue, queuedTrack];
    const nextRevision = state.queueRevision + 1;
    set({ queue: newQueue, queueRevision: nextRevision });

    HyperPlayer.addTracks([mapToPlayerTrack(track)], state.queue.length, nextRevision);
  },

  appendTracks: (tracks) => {
    if (tracks.length === 0) return;
    const state = get();
    const queuedTracks = tracks.map(ensureQueueId);
    const newQueue = [...state.queue, ...queuedTracks];
    const nextRevision = state.queueRevision + 1;
    set({ queue: newQueue, queueRevision: nextRevision });

    HyperPlayer.addTracks(tracks.map(mapToPlayerTrack), state.queue.length, nextRevision);
  },

  pause: () => HyperPlayer.pause(),
  resume: () => HyperPlayer.play(),
  skipToNext: () => HyperPlayer.skipToNext(),
  skipToPrevious: () => HyperPlayer.skipToPrevious(),

  seekTo: (positionMs) => HyperPlayer.seekTo(positionMs),

  reorderQueue: (fromIndex, toIndex, skipStateUpdate) => {
    const state = get();
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= state.queue.length || toIndex >= state.queue.length) return;

    const nextRevision = state.queueRevision + 1;

    if (!skipStateUpdate) {
      // Optimistic UI update
      const newQueue = [...state.queue];
      const [movedTrack] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedTrack);
      set({ queue: newQueue, queueRevision: nextRevision });
    } else {
      set({ queueRevision: nextRevision });
    }

    // Push shift to native engine without interrupting play
    HyperPlayer.moveTrack(fromIndex, toIndex, nextRevision);
  },

  toggleShuffle: () => {
    const state = get();
    const newShuffle = !state.isShuffle;
    set({ isShuffle: newShuffle });
    HyperPlayer.setShuffle(newShuffle);
  },

  toggleRepeat: () => {
    const current = get().repeatMode;
    const nextMode = current === 'off' ? 'all' : current === 'all' ? 'one' : 'off';
    set({ repeatMode: nextMode });
    HyperPlayer.setRepeatMode(nextMode);
  },

  cyclePlaybackMode: () => {
    const state = get();
    // Flow: Shuffle -> Repeat 1 -> Repeat All -> Off
    if (!state.isShuffle && state.repeatMode === 'off') {
      // Off -> Shuffle
      set({ isShuffle: true, repeatMode: 'off' });
      HyperPlayer.setShuffle(true);
      HyperPlayer.setRepeatMode('off');
    } else if (state.isShuffle) {
      // Shuffle -> Repeat One
      set({ isShuffle: false, repeatMode: 'one' });
      HyperPlayer.setShuffle(false);
      HyperPlayer.setRepeatMode('one');
    } else if (state.repeatMode === 'one') {
      // Repeat One -> Repeat All
      set({ isShuffle: false, repeatMode: 'all' });
      HyperPlayer.setShuffle(false);
      HyperPlayer.setRepeatMode('all');
      // Repeat All -> Off
      set({ isShuffle: false, repeatMode: 'off' });
      HyperPlayer.setShuffle(false);
      HyperPlayer.setRepeatMode('off');
    }
  },


  /**
   * Auto-Play Methods.
   * Manages infinite scroll and implicit queue tracks.
   */
  setAutoPlayPool: (tracks) => {
    const state = get();
    const isFirstAutoPlay = state.implicitStartIndex === -1;
    const implicitStartIndex = isFirstAutoPlay ? state.queue.length : state.implicitStartIndex;

    /**
     * Batching Strategy:
     * Loads the first 15 tracks to the UI immediately if it's the first time.
     * The rest are pushed to a background pool to avoid freezing the UI thread.
     */
    const batchSize = 15;
    const initialBatch = isFirstAutoPlay ? tracks.slice(0, batchSize) : [];
    const remainingPool = isFirstAutoPlay ? tracks.slice(batchSize) : tracks;

    set({
      implicitStartIndex,
      autoPlayPool: [...state.autoPlayPool, ...remainingPool]
    });

    const autoplay = useSettingsStore.getState().autoplay;
    if (autoplay && isFirstAutoPlay) {
      /**
       * UI Optimization:
       * Defers heavy React list reconciliation by 400ms.
       * Allows the PlayerBottomSheet spring animation to settle, preventing UI lock.
       */
      setTimeout(() => {
        get().appendTracks(initialBatch);
      }, 400);
    } else if (!autoplay && isFirstAutoPlay) {
      // If autoplay is OFF, keep the initial batch in the pool instead of appending
      set({ autoPlayPool: [...initialBatch, ...remainingPool] });
    }

    // If not first auto play, native player might be starving, we can inject immediately if queue is extremely short
    if (autoplay && !isFirstAutoPlay) {
      const remainingItems = state.queue.length - Math.max(0, state.queue.findIndex(t => t.id === state.activeTrack?.id)) - 1;
      if (remainingItems <= 2) {
        get().injectAutoPlayBatch();
      }
    }
  },

  injectAutoPlayBatch: () => {
    const state = get();
    if (state.autoPlayPool.length === 0 || !useSettingsStore.getState().autoplay) return;

    // Grab up to 10 tracks silently
    const batchSize = 10;
    const batch = state.autoPlayPool.slice(0, batchSize);
    const remaining = state.autoPlayPool.slice(batchSize);

    // Update pool
    set({ autoPlayPool: remaining });

    // Append to UI and Native Queue seamlessly
    // Defer the heavy React FlatList reconciliation to allow user gestures (like scroll/drag) to resolve
    setTimeout(() => {
      get().appendTracks(batch);
    }, 150);
  },

  toggleAutoPlayVisibility: (isVisible: boolean) => {
    const state = get();
    if (state.implicitStartIndex === -1) return;

    if (!isVisible) {
      // Safely preserve the active track if it is within the auto-play section being removed
      const activeIndex = state.queue.findIndex(t => t.id === state.activeTrack?.id);
      let sliceIndex = state.implicitStartIndex;
      if (activeIndex >= sliceIndex) {
        sliceIndex = activeIndex + 1;
      }

      // Turn OFF: Slice queue back to explicit, push implicit tracks to the FRONT of the pool
      const explicitTracks = state.queue.slice(0, sliceIndex);
      const implicitTracks = state.queue.slice(sliceIndex);
      const nextRevision = state.queueRevision + 1;
      set({
        queue: explicitTracks,
        autoPlayPool: [...implicitTracks, ...state.autoPlayPool],
        queueRevision: nextRevision
      });
      // Synchronize native queue with explicit tracks using SSOT revision
      const safeStartIndex = Math.max(0, explicitTracks.findIndex(t => t.id === state.activeTrack?.id));

      HyperPlayer.loadQueue(
        explicitTracks.map(mapToPlayerTrack),
        safeStartIndex,
        get().repeatMode,
        get().isShuffle,
        nextRevision
      );
    } else {
      // Turn ON: Pop tracks from pool and append
      get().injectAutoPlayBatch();
    }
  },

  loadMoreAutoPlayTracks: async () => {
    const state = get();
    if (state.autoPlayPool.length === 0 || state.isAutoPlayLoading) return;

    set({ isAutoPlayLoading: true, autoPlayError: false });

    try {
      get().injectAutoPlayBatch();
    } catch (error) {
      console.error('[usePlayerStore] Failed to load more auto-play tracks', error);
      set({ autoPlayError: true });
      useToastStore.getState().showToast('Failed to load similar tracks. Tap retry.', 'error');
    } finally {
      set({ isAutoPlayLoading: false });
    }
  },

  collapsePlayer: () => set((state) => ({ collapsePlayerSignal: state.collapsePlayerSignal + 1 })),
}));
