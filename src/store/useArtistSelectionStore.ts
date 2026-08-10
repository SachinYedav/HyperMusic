import { create } from 'zustand';
import { ExtractedEntity } from 'react-native-hyper-extractor';

interface ArtistSelectionState {
  visible: boolean;
  artists: ExtractedEntity[];
  openSheet: (artists: ExtractedEntity[]) => void;
  closeSheet: () => void;
}

/**
 * Global Zustand store governing the visibility and payload of the multi-artist disambiguation sheet.
 */
export const useArtistSelectionStore = create<ArtistSelectionState>((set) => ({
  visible: false,
  artists: [],
  openSheet: (artists) => set({ visible: true, artists }),
  closeSheet: () => set({ visible: false, artists: [] }),
}));
