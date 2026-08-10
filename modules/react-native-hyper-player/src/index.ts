import { NitroModules } from 'react-native-nitro-modules';
import type { 
  HyperPlayer as HyperPlayerSpec,
  PlayerTrack,
  MediaMetadata,
  TrackTransitionEvent,
  PlaybackStateChangeEvent,
  PositionUpdateEvent
} from './specs/hyper-player.nitro';
export * from './HyperVideoView';

export const HyperPlayer = NitroModules.createHybridObject<HyperPlayerSpec>('HyperPlayer');

export type {
  HyperPlayerSpec,
  PlayerTrack,
  MediaMetadata,
  TrackTransitionEvent,
  PlaybackStateChangeEvent,
  PositionUpdateEvent
};