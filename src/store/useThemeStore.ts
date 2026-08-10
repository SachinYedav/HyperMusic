import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();

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

type ThemeMode = 'light' | 'dark' | 'system';
export type BackgroundThemeKey = 'purple' | 'midnight' | 'crimson' | 'emerald' | 'sunset' | 'auto';

interface ThemeState {
  mode: ThemeMode;
  homeBackgroundTheme: BackgroundThemeKey;
  setMode: (mode: ThemeMode) => void;
  setHomeBackgroundTheme: (theme: BackgroundThemeKey) => void;
}

/**
 * Persistent Zustand store leveraging MMKV storage to maintain user UI appearance theme preferences.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      homeBackgroundTheme: 'auto',
      setMode: (mode) => set({ mode }),
      setHomeBackgroundTheme: (homeBackgroundTheme) => set({ homeBackgroundTheme }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
