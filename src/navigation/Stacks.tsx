import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@/theme';

import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { SearchScreen } from '@/features/search/screens/SearchScreen';
import { LibraryScreen } from '@/features/library/screens/LibraryScreen';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { TermsPrivacyScreen } from '@/features/settings/screens/TermsPrivacyScreen';
import { LicensesScreen } from '@/features/settings/screens/LicensesScreen';
import { LicenseDetailScreen } from '@/features/settings/screens/LicenseDetailScreen';
import { PersonalizeTasteScreen } from '@/features/settings/screens/PersonalizeTasteScreen';

import { PlaylistDetailsScreen } from '@/features/shared/screens/PlaylistDetailsScreen';
import { AlbumDetailsScreen } from '@/features/shared/screens/AlbumDetailsScreen';
import { ArtistProfileScreen } from '@/features/shared/screens/ArtistProfileScreen';
import { ExploreCategoryScreen } from '@/features/explore/screens/ExploreCategoryScreen';
import { DownloadsScreen } from '@/features/library/screens/DownloadsScreen';

import {
  HomeStackParamList,
  SearchStackParamList,
  LibraryStackParamList,
  SettingsStackParamList,
} from './types';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

/**
 * Dynamic resolution of stack screen styling attributes utilizing the global theme context.
 */
const useStackScreenOptions = () => {
  const { colors } = useTheme();
  return {
    headerShown: false,
    contentStyle: { backgroundColor: colors.background },
    animation: 'slide_from_right' as const,
    animationDuration: 250,
  };
};

/**
 * Navigation stack governing the Home feed and corresponding entity detail views.
 */
export function HomeStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen} />
      <HomeStack.Screen name="AlbumDetails" component={AlbumDetailsScreen} />
      <HomeStack.Screen name="ArtistProfile" component={ArtistProfileScreen} />
      <HomeStack.Screen name="ExploreCategory" component={ExploreCategoryScreen} />
    </HomeStack.Navigator>
  );
}

/**
 * Navigation stack governing native catalog search and corresponding entity exploration.
 */
export function SearchStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <SearchStack.Navigator screenOptions={screenOptions}>
      <SearchStack.Screen name="SearchMain" component={SearchScreen} />
      <SearchStack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen} />
      <SearchStack.Screen name="AlbumDetails" component={AlbumDetailsScreen} />
      <SearchStack.Screen name="ArtistProfile" component={ArtistProfileScreen} />
      <SearchStack.Screen name="ExploreCategory" component={ExploreCategoryScreen} />
    </SearchStack.Navigator>
  );
}

/**
 * Navigation stack governing local library persistence, downloads, and offline history views.
 */
export function LibraryStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <LibraryStack.Navigator screenOptions={screenOptions}>
      <LibraryStack.Screen name="LibraryMain" component={LibraryScreen} />
      <LibraryStack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen} />
      <LibraryStack.Screen name="AlbumDetails" component={AlbumDetailsScreen} />
      <LibraryStack.Screen name="ArtistProfile" component={ArtistProfileScreen} />
      <LibraryStack.Screen name="ExploreCategory" component={ExploreCategoryScreen} />
      <LibraryStack.Screen name="DownloadsScreen" component={DownloadsScreen} />
    </LibraryStack.Navigator>
  );
}

/**
 * Navigation stack governing user preference configuration, taste personalization, and legal declarations.
 */
export function SettingsStackNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <SettingsStack.Navigator screenOptions={screenOptions}>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
      <SettingsStack.Screen name="Licenses" component={LicensesScreen} />
      <SettingsStack.Screen name="LicenseDetail" component={LicenseDetailScreen} />
      <SettingsStack.Screen name="PersonalizeTaste" component={PersonalizeTasteScreen} />
    </SettingsStack.Navigator>
  );
}
