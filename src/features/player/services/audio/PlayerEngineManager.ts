import TrackPlayer, { State } from 'react-native-track-player';
import { usePlayerStore, useSettingsStore } from '@/store';
import { extractorService } from '@/services/api/extractorService';
import { Track } from '@/types';
import { HyperExtractor } from 'react-native-hyper-extractor';
import * as SQLite from 'expo-sqlite';
import { recordPlay } from '@/features/library/services/historyService';
import { downloadService } from '@/features/library/services/downloadService';

const EXPIRATION_TIME_MS = 5.5 * 60 * 60 * 1000;

/**
 * Core standalone JS playback engine manager orchestrating Zustand synchronization, sliding window track queueing, cipher extraction prefetching, and cumulative playback history recording.
 */
class PlayerEngineManagerClass {
  private isInitialized = false;
  private currentLoadedTrackId: string | null = null;
  private currentPlaybackState: string = 'stopped';
  private abortController: AbortController | null = null;
  private fetchingRadioForId: string | null = null;

  // Playback History Tracking
  private playTimer: ReturnType<typeof setInterval> | null = null;
  private playStartTime: number = 0;
  private cumulativeTime: number = 0;
  private historyRecordedForTrackId: string | null = null;

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Subscribe to Zustand store changes directly
    usePlayerStore.subscribe((state) => {
      this.handleStoreChange(state);
    });
  }

  private async handleStoreChange(state: ReturnType<typeof usePlayerStore.getState>) {
    const activeTrack = state.activeTrack;
    const playbackState = state.playbackState;
    const queue = state.queue;

    // 1. Handle Playback State changes & History Tracking
    if (playbackState !== this.currentPlaybackState) {
      this.currentPlaybackState = playbackState;
      await this.syncPlaybackIntent(playbackState);
      this.manageHistoryTimer(playbackState, activeTrack);
    }

    // 2. Handle Active Track changes (Forward-Only Sliding Window Engine)
    if (activeTrack && activeTrack.id !== this.currentLoadedTrackId) {
      this.currentLoadedTrackId = activeTrack.id;

      // Reset history tracking for new track
      this.cumulativeTime = 0;
      this.playStartTime = playbackState === 'playing' ? Date.now() : 0;
      this.historyRecordedForTrackId = null;
      this.manageHistoryTimer(playbackState, activeTrack);

      // Handle Radio Queue fetching if needed
      this.checkRadioQueue(activeTrack, queue);

      // Process Sliding Window
      await this.processSlidingWindow(activeTrack, queue);
    }
  }

  private async syncPlaybackIntent(playbackState: string) {
    try {
      const currentState = (await TrackPlayer.getPlaybackState()).state;
      if (this.currentLoadedTrackId) {
        if (playbackState === 'playing' && currentState !== State.Playing && currentState !== State.Buffering && currentState !== State.Loading) {
          await TrackPlayer.play();
        } else if (playbackState === 'paused' && currentState === State.Playing) {
          await TrackPlayer.pause();
        } else if (playbackState === 'stopped' && currentState !== State.Stopped) {
          await TrackPlayer.stop();
        }
      }
    } catch (err) {
      console.error('[PlayerEngineManager] Sync Intent Error:', err);
    }
  }

  private manageHistoryTimer(playbackState: string, activeTrack: Track | null) {
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }

    if (playbackState === 'playing' && activeTrack) {
      this.playStartTime = Date.now();
      this.playTimer = setInterval(async () => {
        if (this.historyRecordedForTrackId !== activeTrack.id && activeTrack) {
          const timeSincePlay = Date.now() - this.playStartTime;
          const totalTime = this.cumulativeTime + timeSincePlay;
          if (totalTime >= 30000) {
            this.historyRecordedForTrackId = activeTrack.id;
            try {
              const db = await SQLite.openDatabaseAsync('hypermusic.db', { useNewConnection: true } as any);
              const extractedTrack = {
                id: activeTrack.id,
                title: activeTrack.title,
                artist: activeTrack.artist,
                duration: activeTrack.duration || 0,
                artworkUrl: typeof activeTrack.artwork === 'string' ? activeTrack.artwork : ''
              };
              await recordPlay(db, extractedTrack);
              try { await db.closeAsync(); } catch (_) { }
            } catch (e) {
              console.error('[PlayerEngineManager] Failed to record history', e);
            }
          }
        }
      }, 5000);
    } else {
      if (this.playStartTime > 0) {
        this.cumulativeTime += (Date.now() - this.playStartTime);
        this.playStartTime = 0;
      }
    }
  }

  private checkRadioQueue(activeTrack: Track, queue: Track[]) {
    if (queue.length === 1 && queue[0].id === activeTrack.id) {
      if (this.fetchingRadioForId !== activeTrack.id) {
        this.fetchingRadioForId = activeTrack.id;

        HyperExtractor.getRadioQueue(activeTrack.id).then((radioTracks: any[]) => {
          if (radioTracks.length > 0) {
            const mappedTracks: Track[] = radioTracks.map((t: any) => ({
              id: t.id,
              title: t.title,
              artist: t.artist,
              duration: t.duration,
              artwork: t.artworkUrl,
              url: ''
            }));
            usePlayerStore.getState().appendTracks(mappedTracks);
          }
        }).catch((err: any) => {
          console.error(`[PlayerEngineManager] ❌ Failed to fetch Radio Queue:`, err);
          this.fetchingRadioForId = null;
        });
      }
    }
  }

  private async processSlidingWindow(activeTrack: Track, queue: Track[]) {
    // 1. Abort any ongoing extractions from rapid skips
    if (this.abortController) {
      this.abortController.abort();
    }
    const abortController = new AbortController();
    this.abortController = abortController;
    const signal = abortController.signal;

    try {
      const settings = useSettingsStore.getState();
      const nextTrack = usePlayerStore.getState().getNextTrack();
      const windowTracks = [activeTrack];

      if (settings.autoplay && nextTrack) {
        windowTracks.push(nextTrack);
      }

      const ensureExtracted = async (track: Track, retryCount = 1): Promise<Track | null> => {
        // Check if track is already downloaded locally before hitting the extractor
        const { audioFile } = downloadService.getLocalPaths(track.id);
        if (audioFile.exists) {
          const safeUrl = audioFile.uri;
          usePlayerStore.getState().updateTrack(track.id, {
            url: safeUrl,
            isExtracted: true,
            extractedAt: Date.now()
          });
          return { ...track, url: safeUrl, isExtracted: true, extractedAt: Date.now() };
        }

        const isLocalFile = track.url?.startsWith('file://');
        const isExpired = !isLocalFile && (Date.now() - (track.extractedAt || 0) > EXPIRATION_TIME_MS);
        let safeUrl = track.url;

        if (!safeUrl || isExpired) {
          try {
            safeUrl = await extractorService.getStreamUrl(track.id, { signal });

            if (signal.aborted) throw new Error('Aborted');

            usePlayerStore.getState().updateTrack(track.id, {
              url: safeUrl,
              isExtracted: true,
              extractedAt: Date.now()
            });
          } catch (err: any) {
            if (err.message === 'Aborted') {
              return null;
            }
            if (retryCount > 0 && !signal.aborted) {
              console.warn(`[PlayerEngineManager] ⚠️ Extraction failed for ${track.id}, retrying...`);
              await new Promise(res => setTimeout(res, 1000));
              return await ensureExtracted(track, retryCount - 1);
            }
            console.error(`[PlayerEngineManager] ❌ Extraction Failed for ${track.id}:`, err);
            throw err;
          }
        }

        return {
          ...track,
          url: safeUrl,
          artist: track.artist || 'Unknown Artist',
          artwork: track.artworkUrl || track.artwork || require('../../../../../assets/default-artwork.png')
        };
      };

      // Process Current Track
      if (signal.aborted) return;
      
      // If syncing a new track, stop the old one bleeding immediately
      const isExtractedLocally = windowTracks[0].isExtracted || windowTracks[0].url?.startsWith('file://') || downloadService.getLocalPaths(windowTracks[0].id).audioFile.exists;
      if (!isExtractedLocally) {
         const currentNativeActive = await TrackPlayer.getActiveTrackIndex();
         if (currentNativeActive !== undefined && currentNativeActive !== -1) {
             await TrackPlayer.pause();
         }
      }

      usePlayerStore.getState().setPlaybackState('resolving');
      usePlayerStore.getState().setPlaybackFlags(usePlayerStore.getState().isPlaying, true);

      const currentTrackNative = await ensureExtracted(windowTracks[0]);
      if (signal.aborted) return;
      usePlayerStore.getState().setPlaybackState('loading');

      if (!currentTrackNative) {
        // Skip to next if autoplay enabled, otherwise error state
        console.error(`[PlayerEngineManager] ❌ Current track failed to load: ${windowTracks[0].id}`);
        if (settings.autoplay && nextTrack) {
          usePlayerStore.getState().skipToNext();
        } else {
          usePlayerStore.getState().setPlaybackState('error');
        }
        return;
      }

      // 1. Synchronize Native Queue
      const updatedNativeQueue = await TrackPlayer.getQueue();
      const currentNativeIndex = updatedNativeQueue.findIndex(t => t.id === currentTrackNative.id);
      const nativeActiveIndex = await TrackPlayer.getActiveTrackIndex();

      let isNaturalAutoAdvance = false;

      if (currentNativeIndex === -1) {
        await TrackPlayer.add(currentTrackNative);
        const finalQueue = await TrackPlayer.getQueue();
        const newIndex = finalQueue.findIndex(t => t.id === currentTrackNative.id);
        if (newIndex !== -1) await TrackPlayer.skip(newIndex);
      } else if (nativeActiveIndex !== currentNativeIndex) {
        await TrackPlayer.skip(currentNativeIndex);
      } else {
        isNaturalAutoAdvance = true;
      }

      if (!isNaturalAutoAdvance) {
        const storeState = usePlayerStore.getState().playbackState;
        if (storeState === 'playing' || storeState === 'loading' || storeState === 'resolving' || storeState === 'buffering') {
          await TrackPlayer.play();
          usePlayerStore.getState().setPlaybackState('playing');
        }
      } else {
        const nativeState = (await TrackPlayer.getPlaybackState()).state;
        if (nativeState === State.Playing) {
          usePlayerStore.getState().setPlaybackState('playing');
          usePlayerStore.getState().setPlaybackFlags(true, false);
        }
      }

      // 3. Native Queue Cleanup (Index-Shift Protection)
      const currentQueueAfterAdd = await TrackPlayer.getQueue();
      const currentActiveIndexAfterAdd = await TrackPlayer.getActiveTrackIndex() ?? 0;
      const windowIds = windowTracks.map(t => t.id);
      const indicesToRemove: number[] = [];

      currentQueueAfterAdd.forEach((nativeTrack, index) => {
        if (!windowIds.includes(nativeTrack.id)) {
          // Retain preceding tracks during auto-advance to prevent Android MediaSession index-shift crashes
          if (isNaturalAutoAdvance && index < currentActiveIndexAfterAdd) {
            return;
          }
          indicesToRemove.push(index);
        }
      });

      if (indicesToRemove.length > 0) {
        await TrackPlayer.remove(indicesToRemove);

        // Re-assert play intent if manual track removal caused an index shift
        if (!isNaturalAutoAdvance) {
          const storeState = usePlayerStore.getState().playbackState;
          if (storeState === 'playing' || storeState === 'loading' || storeState === 'resolving' || storeState === 'buffering') {
            await TrackPlayer.play();
          }
        }
      }

      // Process Next Track (Prefetch)
      if (windowTracks.length > 1 && !signal.aborted) {
        const nextTrackNative = await ensureExtracted(windowTracks[1]);
        if (!nextTrackNative || signal.aborted) return;

        const finalNativeQueue = await TrackPlayer.getQueue();
        if (finalNativeQueue.findIndex(t => t.id === nextTrackNative.id) === -1) {
          await TrackPlayer.add(nextTrackNative);
        }
      }
    } catch (error: any) {
      if (error.message !== 'Aborted') {
        console.error('[PlayerEngineManager] Engine Error:', error);
        usePlayerStore.getState().setPlaybackState('error');
      }
    }
  }
}

export const PlayerEngineManager = new PlayerEngineManagerClass();
