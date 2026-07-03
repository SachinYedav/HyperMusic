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

interface SettingsState {
  autoplay: boolean;
  streamingQuality: 'data_saver' | 'normal' | 'high' | 'lossless';
  dataSaver: boolean;
  downloadQuality: 'data_saver' | 'normal' | 'high' | 'lossless';
  downloadWifiOnly: boolean;
  language: string;
  explicitFilter: boolean;
  
  setAutoplay: (autoplay: boolean) => void;
  setStreamingQuality: (quality: 'data_saver' | 'normal' | 'high' | 'lossless') => void;
  setDataSaver: (dataSaver: boolean) => void;
  setDownloadQuality: (quality: 'data_saver' | 'normal' | 'high' | 'lossless') => void;
  setDownloadWifiOnly: (wifiOnly: boolean) => void;
  setLanguage: (language: string) => void;
  setExplicitFilter: (filter: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoplay: true,
      streamingQuality: 'high',
      dataSaver: false,
      downloadQuality: 'high',
      downloadWifiOnly: false,
      language: 'English',
      explicitFilter: false,

      setAutoplay: (autoplay) => set({ autoplay }),
      setStreamingQuality: (streamingQuality) => set({ streamingQuality }),
      setDataSaver: (dataSaver) => set({ dataSaver }),
      setDownloadQuality: (downloadQuality) => set({ downloadQuality }),
      setDownloadWifiOnly: (downloadWifiOnly) => set({ downloadWifiOnly }),
      setLanguage: (language) => set({ language }),
      setExplicitFilter: (explicitFilter) => set({ explicitFilter }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
