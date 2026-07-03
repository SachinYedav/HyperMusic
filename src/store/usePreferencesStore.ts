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

interface PreferencesState {
  selectedLanguages: string[];
  selectedGenres: string[];
  updatePreferences: (languages: string[], genres: string[]) => void;
}

/**
 * Persistent Zustand store leveraging MMKV storage to maintain curated user language and genre taxonomy selections.
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      selectedLanguages: ['Hindi'], // High-end curated default
      selectedGenres: ['Haryanvi', 'Bhojpuri', 'Indian Pop'], // High-end curated default

      updatePreferences: (languages, genres) => {
        set({
          selectedLanguages: languages.length > 0 ? languages : ['Hindi'],
          selectedGenres: genres.length > 0 ? genres : ['Haryanvi', 'Bhojpuri', 'Indian Pop'],
        });
      },
    }),
    {
      name: 'preferences-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
