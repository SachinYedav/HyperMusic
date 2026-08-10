import { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  HomeMain: undefined;
  PlaylistDetails: { id: string; name?: string; coverUrl?: string };
  AlbumDetails: { id: string; name?: string; coverUrl?: string };
  ArtistProfile: { id: string; artistName?: string; isLocal?: boolean; artworkUrl?: string };
  ExploreCategory: { categoryId: string; title: string };
  PodcastDetails: { id: string; name?: string; coverUrl?: string };
};

export type SearchStackParamList = {
  SearchMain: undefined;
  PlaylistDetails: { id: string; name?: string; coverUrl?: string };
  AlbumDetails: { id: string; name?: string; coverUrl?: string };
  ArtistProfile: { id: string; artistName?: string; isLocal?: boolean; artworkUrl?: string };
  ExploreCategory: { categoryId: string; title: string };
  PodcastDetails: { id: string; name?: string; coverUrl?: string };
};

export type LibraryStackParamList = {
  LibraryMain: undefined;
  PlaylistDetails: { id: string; name?: string; coverUrl?: string };
  AlbumDetails: { id: string; name?: string; coverUrl?: string };
  ArtistProfile: { id: string; artistName?: string; isLocal?: boolean };
  ExploreCategory: { categoryId: string; title: string };
  PodcastDetails: { id: string; name?: string; coverUrl?: string };
  DownloadsScreen: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  TermsPrivacy: undefined;
  Licenses: undefined;
  LicenseDetail: { licenseId: string; licenseName: string; licenseVersion: string; licenseType: string; licenseText: string; publisher: string; repository?: string; };
  PersonalizeTaste: undefined;
  AppUpdates: undefined;
  StorageSettings: undefined;
};

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Search: NavigatorScreenParams<SearchStackParamList>;
  Library: NavigatorScreenParams<LibraryStackParamList>;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
