import * as Network from 'expo-network';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useToastStore } from '@/store/useToastStore';
import { SQLiteDatabase } from 'expo-sqlite';
import { setWifiOnlyNative } from '../../../../modules/hyper-downloader/src';

let networkSubscription: any = null;
let settingsUnsubscribe: (() => void) | null = null;
let globalDb: SQLiteDatabase | null = null;

export const networkListener = {
  /**
   * Initializes the network listener. Should be called when the app starts.
   */
  init: (db: SQLiteDatabase) => {
    globalDb = db;
    if (networkSubscription) {
      networkSubscription.remove();
    }
    if (settingsUnsubscribe) {
      settingsUnsubscribe();
    }

    networkSubscription = Network.addNetworkStateListener((state) => {
      // Basic UI toasts for network change, actual pause/resume is handled natively
      if (!state.isConnected) {
         useToastStore.getState().showToast('Network lost', 'info');
      }
    });

    const initialSettings = useSettingsStore.getState();
    setWifiOnlyNative(initialSettings.downloadWifiOnly);

    settingsUnsubscribe = useSettingsStore.subscribe((state, prevState) => {
      if (state.downloadWifiOnly !== prevState.downloadWifiOnly) {
         setWifiOnlyNative(state.downloadWifiOnly);
      }
    });
  },

  /**
   * Cleans up the listener.
   */
  destroy: () => {
    if (networkSubscription) {
      networkSubscription.remove();
      networkSubscription = null;
    }
    if (settingsUnsubscribe) {
      settingsUnsubscribe();
      settingsUnsubscribe = null;
    }
  },

  /**
   * Deprecated: Network pausing is now safely managed strictly by the Headless Kotlin Engine
   * to ensure background reliability during Android Doze mode.
   */
  handleNetworkChange: (state: Network.NetworkState) => {
    // Intentionally left blank or can be removed completely.
  }
};
