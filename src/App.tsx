import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, AppState, AppStateStatus, PermissionsAndroid, Platform, Linking, BackHandler } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlayerBottomSheet } from './features/player/components/PlayerBottomSheet';
import { PlayerEngineManager } from './features/player/services/audio';
import { ThemeProvider, useTheme, typography } from '@/theme';
import { GlobalActionSheet } from './features/shared/components/GlobalActionSheet';
import { PlaylistSelectionSheet } from './features/shared/components/PlaylistSelectionSheet';
import { ArtistSelectionSheet } from './features/shared/components/ArtistSelectionSheet';
import { GlobalToast } from './features/shared/components/GlobalToast';
import { downloadService } from './features/library/services/downloadService';
import { downloadSyncService } from './features/library/services/downloadSyncService';
import { useDownloadStore } from './features/library/store/useDownloadStore';
import { networkListener } from './features/library/services/networkListener';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { AppConfirmSheet } from '@/ui/AppConfirmSheet';
import { useAppUpdater } from '@/hooks/useAppUpdater';

import { NavigationContainer, DefaultTheme, LinkingOptions } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from '@/navigation/RootNavigator';
import type { RootStackParamList } from '@/navigation/types';
import { DatabaseProvider } from '@/database/DatabaseProvider';
import * as SplashScreen from 'expo-splash-screen';
import { AnimatedSplashScreen } from '@/ui/AnimatedSplashScreen';

// Prevent native splash screen from autohiding so custom Reanimated splash takes over flawlessly
SplashScreen.preventAutoHideAsync().catch(() => { });

const queryClient = new QueryClient();

function InnerApp() {
  const [isReady, setIsReady] = useState(false);
  const [isSplashAnimationComplete, setIsSplashAnimationComplete] = useState(false);
  const { isDark, colors } = useTheme();
  const db = useSafeDatabase();

  const { showMandatoryUpdate, updateUrl } = useAppUpdater(isReady);

  const navTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.brand,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.brand,
    },
  };

  useEffect(() => {
    async function initializePlayer() {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        } catch (err) {
          console.warn("Failed to request notification permission", err);
        }
      }

      if (db) {
        await useLibraryStore.getState().init(db);
        await downloadSyncService.resumeOrphanedDownloads(db);
        await downloadSyncService.cleanupOrphanedTemps(db);
      }
      await downloadService.init();
      await useDownloadStore.getState().loadCompletedDownloads();
      if (db) {
        networkListener.init(db);
      }
      PlayerEngineManager.init();
      setIsReady(true);
    }

    initializePlayer();
  }, [db]);

  useEffect(() => {
    if (!db) return;
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        await downloadSyncService.reconcileDatabase(db);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [db]);

  const linking: LinkingOptions<RootStackParamList> = {
    prefixes: ['hypermusic://'],
    async getInitialURL() {
      const url = await Linking.getInitialURL();
      return url;
    },
    subscribe(listener: (url: string) => void) {
      const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
        listener(url);
      });
      return () => {
        linkingSubscription.remove();
      };
    },
    config: {
      screens: {
        MainTabs: {
          screens: {
            Search: {
              screens: {
                SearchMain: 'widget/:id/search',
              },
            },
          },
        },
      },
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme} linking={linking}>
        <RootNavigator />
        <GlobalActionSheet />
        <PlaylistSelectionSheet />
        <ArtistSelectionSheet />
        <PlayerBottomSheet />
        <GlobalToast />
        <AppConfirmSheet
          visible={showMandatoryUpdate}
          title="Update Required"
          message="A critical update is required to continue using HyperMusic."
          confirmText="Update Now"
          cancelText="Exit App"
          isDestructive={true}
          onConfirm={() => Linking.openURL(updateUrl)}
          onCancel={() => BackHandler.exitApp()}
        />
      </NavigationContainer>

      {!isSplashAnimationComplete && (
        <AnimatedSplashScreen
          isReady={isReady}
          onAnimationFinish={() => setIsSplashAnimationComplete(true)}
        />
      )}
    </View>
  );
}

/**
 * Root application wrapper establishing global providers, gesture handling, and native database context.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <DatabaseProvider>
            <ThemeProvider>
              <InnerApp />
            </ThemeProvider>
          </DatabaseProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: typography.subtitle,
    fontWeight: 'bold',
  },
});
