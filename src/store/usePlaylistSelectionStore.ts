import { create } from 'zustand';
import { ExtractedTrack } from 'react-native-hyper-extractor';

interface PlaylistSelectionState {
  isOpen: boolean;
  trackToAdd: ExtractedTrack | null;
  openSheet: (track: ExtractedTrack) => void;
  closeSheet: () => void;
}

/**
 * Global Zustand store governing modal playlist target assignment sheets and queued track payloads.
 */
export const usePlaylistSelectionStore = create<PlaylistSelectionState>((set) => ({
  isOpen: false,
  trackToAdd: null,
  openSheet: (track) => set({ isOpen: true, trackToAdd: track }),
  closeSheet: () => set({ isOpen: false, trackToAdd: null }),
}));
