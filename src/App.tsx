import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlayerBottomSheet } from './features/player/components/PlayerBottomSheet';
import { usePlayerEngine } from '@/features/player/hooks/usePlayerEngine';
import { setupPlayer, PlayerEngineManager } from './features/player/services/audio';
import { ThemeProvider, useTheme, typography } from '@/theme';
import { GlobalActionSheet } from './features/shared/components/GlobalActionSheet';
import { PlaylistSelectionSheet } from './features/shared/components/PlaylistSelectionSheet';
import { downloadService } from './features/library/services/downloadService';

import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from '@/navigation/RootNavigator';
import { DatabaseProvider } from '@/database/DatabaseProvider';
import * as SplashScreen from 'expo-splash-screen';
import { AnimatedSplashScreen } from '@/ui/AnimatedSplashScreen';

// Prevent native splash screen from autohiding so custom Reanimated splash takes over flawlessly
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function InnerApp() {
  const [isReady, setIsReady] = useState(false);
  const [isSplashAnimationComplete, setIsSplashAnimationComplete] = useState(false);
  const { isDark, colors } = useTheme();

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

  usePlayerEngine(isReady);

  useEffect(() => {
    async function initializePlayer() {
      await downloadService.init();
      PlayerEngineManager.init();
      const success = await setupPlayer();
      if (success) {
        setIsReady(true);
      }
    }

    initializePlayer();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
        <GlobalActionSheet />
        <PlaylistSelectionSheet />
        <PlayerBottomSheet />
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
