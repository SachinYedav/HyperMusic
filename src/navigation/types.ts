import { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  HomeMain: undefined;
  PlaylistDetails: { id: string };
  AlbumDetails: { id: string };
  ArtistProfile: { id: string; artistName?: string; isLocal?: boolean };
  ExploreCategory: { categoryId: string; title: string };
  PodcastDetails: { id: string };
};

export type SearchStackParamList = {
  SearchMain: undefined;
  PlaylistDetails: { id: string };
  AlbumDetails: { id: string };
  ArtistProfile: { id: string; artistName?: string; isLocal?: boolean };
  ExploreCategory: { categoryId: string; title: string };
  PodcastDetails: { id: string };
};

export type LibraryStackParamList = {
  LibraryMain: undefined;
  PlaylistDetails: { id: string };
  AlbumDetails: { id: string };
  ArtistProfile: { id: string; artistName?: string; isLocal?: boolean };
  ExploreCategory: { categoryId: string; title: string };
  PodcastDetails: { id: string };
  DownloadsScreen: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  TermsPrivacy: undefined;
  Licenses: undefined;
  LicenseDetail: { licenseId: string; licenseName: string; licenseText: string; repository?: string; };
  PersonalizeTaste: undefined;
  AppUpdates: undefined;
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
