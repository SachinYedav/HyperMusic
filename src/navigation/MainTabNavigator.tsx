import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Search, Library, Settings as SettingsIcon } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList } from './types';

import {
  HomeStackNavigator,
  SearchStackNavigator,
  LibraryStackNavigator,
  SettingsStackNavigator,
} from './Stacks';
import { getBottomTabBarHeight } from './layout';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Bottom tab navigation structure managing active state, persistent playback safe areas, and root stack containers.
 */
export function MainTabNavigator() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = getBottomTabBarHeight(insets.bottom);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: isDark ? '#333' : '#e5e5e5',
          height: tabBarHeight,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: isDark ? '#888' : '#666',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} strokeWidth={2.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Search color={color} size={size} strokeWidth={2.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Library color={color} size={size} strokeWidth={2.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon color={color} size={size} strokeWidth={2.5} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
