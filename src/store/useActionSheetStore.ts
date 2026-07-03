import { create } from 'zustand';

type ActionSheetContextType = 'track' | 'playlist' | 'artist' | 'album' | null;

interface ActionSheetOptions {
  isQueueItem?: boolean;
  isCurrentlyPlaying?: boolean;
  fromLocal?: boolean;
}

interface ActionSheetState {
  contextType: ActionSheetContextType;
  data: any | null;
  options: ActionSheetOptions | null;
  openSheet: (type: ActionSheetContextType, data: any, options?: ActionSheetOptions) => void;
  closeSheet: () => void;
}

/**
 * Global Zustand store governing multi-context action sheet presentation state, target entity payloads, and origin flags.
 */
export const useActionSheetStore = create<ActionSheetState>((set) => ({
  contextType: null,
  data: null,
  options: null,
  openSheet: (type, data, options) => {
    set({ contextType: type, data, options: options || null });
  },
  closeSheet: () => {
    set({ contextType: null, data: null, options: null });
  },
}));
