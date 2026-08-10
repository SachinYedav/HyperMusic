import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Search, Library, Settings as SettingsIcon } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MainTabParamList } from './types';

import {
  HomeStackNavigator,
  SearchStackNavigator,
  LibraryStackNavigator,
  SettingsStackNavigator,
} from './Stacks';
import { getBottomTabBarHeight } from './layout';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabBarButton = (props: any) => {
  const { onPress, children } = props;
  const scale = useSharedValue(1);

  const handlePressIn = () => { scale.value = withSpring(0.85, { damping: 20, stiffness: 300 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 20, stiffness: 300 }); };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }));

  return (
    <TouchableWithoutFeedback onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

/**
 * Bottom tab navigation structure managing active state, persistent playback safe areas, and root stack containers.
 */
export function MainTabNavigator() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = getBottomTabBarHeight(insets.bottom);
  const rgb = isDark ? '0, 0, 0' : '255, 255, 255';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarBackground: () => (
          <View style={{ position: 'absolute', top: -2, bottom: 0, left: 0, right: 0 }} pointerEvents="none">
            <LinearGradient
              colors={[
                `rgba(${rgb}, 0)`,
                `rgba(${rgb}, 0.6)`,
                `rgba(${rgb}, 0.9)`,
                `rgba(${rgb}, 0.98)`
              ]}
              locations={[0, 0.4, 0.7, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </View>
        ),
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: {
          fontSize: 11,
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
