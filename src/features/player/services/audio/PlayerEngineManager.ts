import { usePlayerStore, useSettingsStore } from '@/store';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useToastStore } from '@/store/useToastStore';
import { Track } from '@/types';
import { HyperExtractor } from 'react-native-hyper-extractor';
import { getGlobalDb } from '@/database/globalDb';
import { recordPlaySync } from '@/features/library/services/historyService';
import { DeviceEventEmitter, AppState } from 'react-native';
import { PlaybackStateChangeEvent, HyperPlayer } from 'react-native-hyper-player';

/**
 * Passive JS Event Listener for the native HyperPlayer engine.
 * Receives high-frequency JSI events, synchronizes the Zustand UI store, 
 * and handles background history tracking (SQLite) for music plays.
 */
class PlayerEngineManagerClass {
  private isInitialized = false;
  private bufferingTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentLoadedTrackId: string | null = null;
  private fetchingRadioForId: string | null = null;


  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        useLibraryStore.getState().incrementLibraryRevision();
      }
    });

    // Bind native event emitters to JS handlers
    DeviceEventEmitter.addListener('onHistoryRecorded', (event: any) => {
      const db = getGlobalDb();
      if (db) {
        recordPlaySync(db, {
          id: event.trackId,
          title: event.title,
          artist: event.artist,
          artworkUrl: event.artworkUrl,
          duration: 0,
          trackType: event.trackType
        } as any);
      }
    });
    DeviceEventEmitter.addListener('onTrackTransition', (event: any) => {
      const payloadStr = event.reason || "";
      const parts = payloadStr.split(":");
      const reason = parts[0] || "auto";
      const remainingItems = parts.length > 1 ? parseInt(parts[1], 10) : 99;

      this.handleTrackTransition(event.index, event.trackId, event.queueEntryId, remainingItems, event.queueRevision);
    });

    DeviceEventEmitter.addListener('onPlaybackStateChange', (event: PlaybackStateChangeEvent) => {
      this.handlePlaybackStateChange(event.state, event.isPlaying, event.isResolving, event.queueRevision);
    });

    DeviceEventEmitter.addListener('onCustomCommand', (event: { command: string }) => {
      this.handleCustomCommand(event.command);
    });

    DeviceEventEmitter.addListener('onVideoAvailabilityChanged', (event: { hasVideo: boolean }) => {
      const store = usePlayerStore.getState();
      if (!event.hasVideo && store.isVideoMode) {
        useToastStore.getState().showToast('No video stream available. Switching to Audio...', 'info');
        store.setIsVideoMode(false);
      }
    });

    // Synchronize background notification UI when critical player states change
    usePlayerStore.subscribe((state, prevState) => {
      if (
        state.activeTrack?.id !== prevState.activeTrack?.id ||
        state.isShuffle !== prevState.isShuffle ||
        state.repeatMode !== prevState.repeatMode
      ) {
        this.syncNotificationUI(state);
      }
    });

    // Push user preference changes (e.g. streaming quality) to Native Engine instantly
    useSettingsStore.subscribe((state, prevState) => {
      if (state.streamingQuality !== prevState.streamingQuality) {
        HyperPlayer.setGlobalStreamingQuality(state.streamingQuality);
      }
    });

    // Initial Sync
    const initialQuality = useSettingsStore.getState().streamingQuality;
    HyperPlayer.setGlobalStreamingQuality(initialQuality);
  }

  private async syncNotificationUI(state: ReturnType<typeof usePlayerStore.getState>) {
    HyperPlayer.updateNotificationUI(state.repeatMode, state.isShuffle);
  }

  private handleCustomCommand(command: string) {
    const store = usePlayerStore.getState();
    if (command === 'toggle_shuffle') {
      store.toggleShuffle();
    } else if (command === 'toggle_repeat') {
      store.toggleRepeat();
    }
  }

  private handleTrackTransition(queueIndex: number, trackId: string, queueEntryId: string, remainingItems: number, queueRevision: number) {
    const store = usePlayerStore.getState();

    /**
     * We map the track using the explicit queueEntryId rather than raw array indices to 
     * maintain accuracy during dynamic queue reordering (drag-and-drop).
     */
    let activeTrack = store.queue.find((t: any) => (t._queueId || t.id) === queueEntryId);
    if (!activeTrack) {
      activeTrack = store.queue[queueIndex]; // Fallback just in case
    }

    if (activeTrack) {
      store.setActiveTrack(activeTrack);

      // History tracking logic
      if (activeTrack.id !== this.currentLoadedTrackId) {
        this.currentLoadedTrackId = activeTrack.id;

        /**
         * Timeline-aware Radio Fetch:
         * Calculates if we need to append more auto-generated tracks when approaching the queue's end.
         */
        this.checkRadioQueue(activeTrack, remainingItems);
      }
    }
  }

  /**
   * Maps native engine states to UI store states.
   * Includes debouncing to prevent loading flashes during rapid transitions.
   */
  private handlePlaybackStateChange(state: string, isPlaying: boolean, isResolving: boolean, queueRevision: number) {
    const store = usePlayerStore.getState();

    // Robust Mapping from Native State to UI State
    let uiState: 'playing' | 'paused' | 'loading' | 'stopped' | 'error' | 'resolving' | 'buffering' = 'stopped';

    switch (state) {
      case 'idle':
        uiState = 'stopped';
        break;
      case 'buffering':
        uiState = 'buffering';
        break;
      case 'ready':
        uiState = isPlaying ? 'playing' : 'paused';
        break;
      case 'ended':
        uiState = 'stopped'; // Depending on UI, could be paused, but stopped resets player visually
        break;
      case 'error':
        const activeIndex = store.queue.findIndex((t: any) => t.id === store.activeTrack?.id);
        const hasNext = activeIndex >= 0 && activeIndex < store.queue.length - 1;

        if (store.isVideoMode) {
          // Fallback to audio mode upon video stream failure
          useToastStore.getState().showToast('Video stream error. Switching to Audio...', 'error');
          store.setIsVideoMode(false);
          uiState = 'error';
        } else if (hasNext) {
          useToastStore.getState().showToast('Playback failed. Skipping to next...', 'error');
          uiState = 'resolving'; // Represent error state as resolving to indicate automatic native recovery
        } else {
          useToastStore.getState().showToast('Playback failed. Please retry.', 'error');
          uiState = 'error'; // Terminal error state
        }
        break;
    }

    /**
     * Executes the final mapped state to the store.
     * Extracts effective boolean flags for easy UI binding.
     */
    const applyState = () => {
      const effectiveIsPlaying = (uiState === 'stopped' || uiState === 'error') ? false : isPlaying;
      store.setPlaybackState(uiState);
      store.setPlaybackFlags(effectiveIsPlaying, uiState === 'buffering', isResolving, queueRevision);
    };

    if (uiState === 'buffering') {
      if (!this.bufferingTimeout) {
        this.bufferingTimeout = setTimeout(() => {
          this.bufferingTimeout = null;
          applyState();
        }, 150);
      }
    } else {
      if (this.bufferingTimeout) {
        clearTimeout(this.bufferingTimeout);
        this.bufferingTimeout = null;
      }
      applyState();
    }
  }



  private lastRadioFetchRevision: number = 0;

  private checkRadioQueue(activeTrack: Track, remainingItems: number) {
    // Prefetch radio tracks when nearing the end of the current queue
    if (remainingItems <= 2) {
      const store = usePlayerStore.getState();
      const isAutoPlayEnabled = useSettingsStore.getState().autoplay;

      // Inject pre-fetched tracks from the pool without additional API calls
      if (isAutoPlayEnabled && store.autoPlayPool.length >= 5) {
        store.injectAutoPlayBatch();
        return;
      }

      if (this.fetchingRadioForId !== activeTrack.id) {

        // Synchronize radio fetch operations with the active queue revision
        this.fetchingRadioForId = activeTrack.id;
        const currentRevision = store.queueRevision;
        this.lastRadioFetchRevision = currentRevision;

        HyperExtractor.getRadioQueue(activeTrack.id).then((radioTracks: any[]) => {
          // Discard fetch results if the active track has changed during the request
          if (usePlayerStore.getState().activeTrack?.id !== activeTrack.id) {
            return;
          }

          if (radioTracks.length > 0) {
            // Map to minimal payload to optimize bridge transfer overhead
            const mappedTracks: Track[] = radioTracks.map((t: any) => ({
              id: t.id,
              title: t.title,
              artist: t.artist,
              duration: t.duration,
              artwork: t.artworkUrl,
              url: '', // Lazy JIT resolution
              trackType: t.type || t.trackType || 'song',
            }));
            usePlayerStore.getState().setAutoPlayPool(mappedTracks);
          }
        }).catch((err: any) => {
          console.error(`[PlayerEngineManager] ❌ Failed to fetch Radio Queue:`, err);
          this.fetchingRadioForId = null;
        });
      }
    }
  }
}

export const PlayerEngineManager = new PlayerEngineManagerClass();
