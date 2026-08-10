import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { useThemeStore } from '@/store/useThemeStore';

type ThemeKey = 'purple' | 'midnight' | 'crimson' | 'emerald' | 'sunset';

const THEMES: ThemeKey[] = ['purple', 'midnight', 'crimson', 'emerald', 'sunset'];

export function DynamicBackground() {
  const { colors, isDark } = useTheme();
  const rawTheme = useThemeStore(state => state.homeBackgroundTheme);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>('purple');

  useEffect(() => {
    if (rawTheme === 'auto') {
      // Pick a random theme on mount for the auto feature
      const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
      setActiveTheme(randomTheme);
    } else {
      setActiveTheme(rawTheme as ThemeKey);
    }
  }, [rawTheme]);

  const gradientColors = useMemo(() => {
    switch (activeTheme) {
      case 'midnight':
        return [isDark ? 'rgba(25, 25, 112, 0.4)' : 'rgba(25, 25, 112, 0.1)', colors.background] as const;
      case 'crimson':
        return [isDark ? 'rgba(220, 20, 60, 0.3)' : 'rgba(220, 20, 60, 0.1)', colors.background] as const;
      case 'emerald':
        return [isDark ? 'rgba(46, 139, 87, 0.3)' : 'rgba(46, 139, 87, 0.1)', colors.background] as const;
      case 'sunset':
        return [isDark ? 'rgba(255, 69, 0, 0.3)' : 'rgba(255, 69, 0, 0.15)', colors.background] as const;
      case 'purple':
      default:
        return [isDark ? 'rgba(138, 43, 226, 0.2)' : 'rgba(138, 43, 226, 0.05)', colors.background] as const;
    }
  }, [activeTheme, isDark, colors.background]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
    </View>
  );
}
