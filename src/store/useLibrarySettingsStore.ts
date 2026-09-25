import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';
import { SortMode, ViewMode } from '@/features/library/components/LibrarySortBar';

const storage = createMMKV({ id: 'library-settings-storage' });

const zustandStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.remove(name);
  },
};

interface LibrarySettingsState {
  sortMode: SortMode;
  viewMode: ViewMode;
  setSortMode: (mode: SortMode) => void;
  setViewMode: (mode: ViewMode) => void;
}

/**
 * Persistent Zustand store leveraging MMKV storage to manage Library UI preferences cleanly.
 */
export const useLibrarySettingsStore = create<LibrarySettingsState>()(
  persist(
    (set) => ({
      sortMode: 'Recent',
      viewMode: 'grid',
      setSortMode: (mode) => set({ sortMode: mode }),
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'library-settings',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
