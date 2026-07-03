import TrackPlayer, { Event, State, useTrackPlayerEvents } from 'react-native-track-player';
import { usePlayerStore, useSettingsStore } from '@/store';

/**
 * React Native TrackPlayer event synchronization hook propagating native playback state, active track changes, and queue end events into global Zustand stores.
 *
 * @param isReady - Flag indicating native playback engine initialization success.
 */
export function usePlayerEngine(isReady: boolean) {
  // Sync Native Events -> Zustand UI State
  useTrackPlayerEvents([Event.PlaybackState, Event.PlaybackActiveTrackChanged, Event.PlaybackQueueEnded, Event.PlaybackError], async (event) => {
    if (event.type === Event.PlaybackError) {
      console.error('[PlayerEngine] Native PlaybackError:', event);
      const settings = useSettingsStore.getState();
      if (settings.autoplay) {
        usePlayerStore.getState().skipToNext();
      } else {
        usePlayerStore.getState().setPlaybackState('error');
        usePlayerStore.getState().setPlaybackFlags(false, false);
      }
    } else if (event.type === Event.PlaybackState) {
      if (event.state === State.Playing) {
        usePlayerStore.getState().setPlaybackState('playing');
        usePlayerStore.getState().setPlaybackFlags(true, false);
      }
      else if (event.state === State.Paused) {
        if (usePlayerStore.getState().playbackState !== 'loading') {
          usePlayerStore.getState().setPlaybackState('paused');
          usePlayerStore.getState().setPlaybackFlags(false, false);
        }
      }
      else if (event.state === State.Stopped) {
        usePlayerStore.getState().setPlaybackState('stopped');
        usePlayerStore.getState().setPlaybackFlags(false, false);
      }
      else if (event.state === State.Buffering) {
        if (usePlayerStore.getState().playbackState !== 'paused') {
          usePlayerStore.getState().setPlaybackState('buffering');
          usePlayerStore.getState().setPlaybackFlags(usePlayerStore.getState().isPlaying, true);
        }
      }
      else if (event.state === State.Loading) {
        if (usePlayerStore.getState().playbackState !== 'paused') {
          usePlayerStore.getState().setPlaybackState('loading');
          usePlayerStore.getState().setPlaybackFlags(usePlayerStore.getState().isPlaying, true);
        }
      }
      else if (event.state === State.Error) {
        usePlayerStore.getState().setPlaybackState('error');
        usePlayerStore.getState().setPlaybackFlags(false, false);
      }
    } else if (event.type === Event.PlaybackActiveTrackChanged) {
      const track = await TrackPlayer.getActiveTrack();
      if (track) {
        if (track.id !== usePlayerStore.getState().activeTrack?.id) {
          usePlayerStore.getState().setActiveTrack(track as any);
        }
      }
    } else if (event.type === Event.PlaybackQueueEnded) {
      const settings = useSettingsStore.getState();
      if (settings.autoplay) {
        usePlayerStore.getState().skipToNext();
      } else {
        usePlayerStore.getState().setPlaybackState('paused');
        usePlayerStore.getState().setPlaybackFlags(false, false);
      }
    }
  });
}
