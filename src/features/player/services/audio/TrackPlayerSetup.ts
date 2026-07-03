import TrackPlayer, { AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';

// Module-level flag to track initialization state across re-renders
let isPlayerInitialized = false;

/**
 * Initializes the React Native TrackPlayer background engine, configuring media capabilities and OS termination behaviors.
 *
 * @returns Promise resolving to true if initialization succeeded or was previously completed.
 */
export async function setupPlayer(): Promise<boolean> {
  // 1. Quick exit if already initialized
  if (isPlayerInitialized) {
    return true;
  }

  try {
    // 2. Setup the player
    await TrackPlayer.setupPlayer({
      minBuffer: 15,
      maxBuffer: 50,
      playBuffer: 2.5,
      backBuffer: 10,
      autoHandleInterruptions: true,
    });

    // 3. Update Options
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      progressUpdateEventInterval: 2,
    });

    isPlayerInitialized = true;
    return true;

  } catch (error: any) {
    // 4. Clean Error Handling: Catch "already initialized" without nested hacks
    if (error?.message?.includes('already been initialized') || error?.code?.includes('already_initialized')) {
      // console.log('[TrackPlayerSetup] Player was already initialized.');
      isPlayerInitialized = true;
      return true;
    }

    console.error('[TrackPlayerSetup] Failed to setup TrackPlayer:', error);
    return false;
  }
}