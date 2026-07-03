import TrackPlayer, { Event, State } from 'react-native-track-player';
import { usePlayerStore } from '@/store';
import { PlayerEngineManager } from './PlayerEngineManager';

/**
 * Background audio playback service binding remote headset and lockscreen media events to TrackPlayer and global Zustand stores.
 */
export default async function PlaybackService() {
  PlayerEngineManager.init();

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    try {
      await TrackPlayer.play();
      usePlayerStore.getState().resume();
    } catch (err) {
      console.error('[PlaybackService] Play error:', err);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    try {
      await TrackPlayer.pause();
      usePlayerStore.getState().pause();
    } catch (err) {
      console.error('[PlaybackService] Pause error:', err);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePlayPause, async () => {
    try {
      const nativeState = (await TrackPlayer.getPlaybackState()).state;
      const storeState = usePlayerStore.getState();
      const shouldPause = nativeState === State.Playing || storeState.isPlaying;

      if (shouldPause) {
        await TrackPlayer.pause();
        usePlayerStore.getState().pause();
      } else {
        await TrackPlayer.play();
        usePlayerStore.getState().resume();
      }
    } catch (err) {
      console.error('[PlaybackService] Play/Pause toggle error:', err);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    try {
      await TrackPlayer.stop();
      usePlayerStore.getState().setPlaybackState('stopped');
      usePlayerStore.getState().setPlaybackFlags(false, false);
    } catch (err) {
      console.error('[PlaybackService] Stop error:', err);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    try {
      if (event.permanent) {
        await TrackPlayer.stop();
        usePlayerStore.getState().setPlaybackState('stopped');
        usePlayerStore.getState().setPlaybackFlags(false, false);
        return;
      }

      if (event.paused) {
        usePlayerStore.getState().pause();
      } else {
        const nativeState = (await TrackPlayer.getPlaybackState()).state;
        if (nativeState === State.Playing) {
          usePlayerStore.getState().resume();
        } else {
          usePlayerStore.getState().pause();
        }
      }
    } catch (err) {
      console.error('[PlaybackService] Duck error:', err);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    usePlayerStore.getState().skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    usePlayerStore.getState().skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    try {
      await TrackPlayer.seekTo(event.position);
    } catch (err) {
      console.error(`[PlaybackService] Seek error:`, err);
    }
  });
}
