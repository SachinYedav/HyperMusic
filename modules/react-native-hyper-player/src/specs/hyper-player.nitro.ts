import type { HybridObject } from 'react-native-nitro-modules';

/** Represents a track item provided to the Native Engine */
export interface PlayerTrack {
  id: string;
  queueEntryId: string; // Used to uniquely identify instances, even for duplicate tracks
  url: string; // Initially empty or incomplete if JIT extraction is needed
  title: string;
  artist: string;
  artworkUrl: string;
  duration?: number;
  trackType?: string;
}

/** Represents the lock-screen/notification state */
export interface MediaMetadata {
  title: string;
  artist: string;
  artworkUrl: string;
}

/** Stable widget identifiers shared across JavaScript and Android. */
export type WidgetStyle = 'classic' | 'material' | 'blur' | 'search' | 'pill';

/** Result of asking the launcher to begin its widget pinning flow. */
export type WidgetPinRequestResult = 'unsupported' | 'requestStarted' | 'failed';

/**
 * Native Nitro specification contract for high-performance cross-language execution.
 * Bridges Javascript runtime directly to the native AndroidX Media3 engine.
 */
export interface HyperPlayer extends HybridObject<{ android: 'kotlin' }> {
  /**
   * Initializes or updates the active media queue in the native engine.
   * Native engine takes absolute ownership of the array order, repeat logic, and shuffling.
   */
  loadQueue(tracks: PlayerTrack[], startIndex: number, repeatMode: string, isShuffle: boolean, queueRevision: number): void;

  /** 
   * Injects tracks into the current queue at the specified index without interrupting playback. 
   */
  addTracks(tracks: PlayerTrack[], insertIndex: number, queueRevision: number): void;

  /** 
   * Reorders a track within the active native queue without interrupting playback.
   */
  moveTrack(fromIndex: number, toIndex: number, queueRevision: number): void;

  /** Playback controls */
  play(): void;
  pause(): void;
  skipToNext(): void;
  skipToPrevious(): void;
  seekTo(positionMs: number): void;
  setRepeatMode(mode: string): void;
  setShuffle(shuffle: boolean): void;
  
  /**
   * Updates the native Android 13+ Notification Bar UI instantly.
   */
  updateNotificationUI(repeatMode: string, isShuffle: boolean): void;

  /** On-Demand Stream Swapping */
  switchToVideo(): void;
  switchToAudio(): void;
  hasVideo(): boolean;

  /** Clears the queue, releases resources, and drops the Foreground Service */
  destroy(): void;

  /** Sets the global streaming quality for the JIT Extractor */
  setGlobalStreamingQuality(quality: string): void;

  /** Starts the Android launcher flow to pin a widget style to the home screen. */
  requestPinWidget(style: WidgetStyle): WidgetPinRequestResult;
}

// Nitro will automatically bind the Hybrid object to this if implemented natively
// We will export type definitions for the events expected from the native module.
export type TrackTransitionEvent = {
  trackId: string;
  queueEntryId: string; // Unique ID of the track instance
  index: number;
  reason: 'auto' | 'user' | 'error';
  queueRevision: number; // For SSOT tracking
};

export type PlaybackStateChangeEvent = {
  state: 'idle' | 'buffering' | 'ready' | 'ended' | 'error';
  isPlaying: boolean;
  isResolving: boolean; // Indicates JIT extraction is in progress
  errorCode?: string; // Standardized error code if state is 'error'
  queueRevision: number;
};

export type PositionUpdateEvent = {
  positionMs: number;
  durationMs: number;
  bufferedMs: number;
};
