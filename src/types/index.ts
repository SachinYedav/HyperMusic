import { Track as RNTrack } from 'react-native-track-player';

export interface Track extends RNTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  isExtracted?: boolean;
  extractedAt?: number; 
}
