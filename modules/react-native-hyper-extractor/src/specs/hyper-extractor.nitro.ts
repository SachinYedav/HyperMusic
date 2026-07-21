import { type HybridObject, NitroModules } from 'react-native-nitro-modules';

/**
 * Represents an unboxed, fully resolved playable track entity.
 */
export interface ExtractedTrack {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  albumId?: string;
  duration: number;
  artworkUrl: string;
}

/**
 * Represents a versatile navigation and display card within browse feeds and search results.
 */
export interface BrowseItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  artworkUrl: string;
  artistId?: string;
  albumId?: string;
}

/**
 * Represents a categorized collection of browse items displayed as a carousel, grid, or list.
 */
export interface BrowseShelf {
  title: string;
  type?: string;
  items: BrowseItem[];
}

/**
 * Represents the top-level structured root feed for the primary home discovery view.
 */
export interface HomeFeed {
  shelves: BrowseShelf[];
}

/**
 * Represents an unboxed album entity containing parent metadata and ordered track listings.
 */
export interface AlbumDetails {
  title: string;
  artist: string;
  artistId?: string;
  year: string;
  artworkUrl: string;
  tracks: ExtractedTrack[];
}

/**
 * Represents a curated or user-generated playlist payload complete with tracks and author attributions.
 */
export interface PlaylistDetails {
  title: string;
  creator: string;
  creatorId?: string;
  trackCount: string;
  artworkUrl: string;
  tracks: ExtractedTrack[];
}

/**
 * Represents an episodic podcast show with detailed show metadata and episode tracks.
 */
export interface PodcastShowDetails {
  title: string;
  creator: string;
  creatorId?: string;
  artworkUrl: string;
  episodes: ExtractedTrack[];
}

/**
 * Represents an artist's profile catalog containing primary hero metadata and discography shelves.
 */
export interface ArtistProfile {
  name: string;
  subtitle: string;
  artworkUrl: string;
  shelves: BrowseShelf[];
}

/**
 * Native Nitro specification contract for high-performance cross-language execution.
 * Bridges Javascript runtime directly to native Kotlin/Swift extraction engines.
 */
export interface HyperExtractor extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  /** Resolves direct streaming playback URLs for a target videoId and quality profile. */
  getStreamUrl(videoId: string, quality: string): Promise<string>;
  
  /** Executes a catalog query to unbox relevant browse items across diverse layout sections. */
  search(query: string): Promise<BrowseItem[]>;
  
  /** Scrapes and parses the primary landing page home feed into structured display shelves. */
  getHomeFeed(): Promise<HomeFeed>;
  
  /** Unboxes comprehensive album details, artist attributions, and track listings. */
  getAlbumDetails(browseId: string): Promise<AlbumDetails>;
  
  /** Traverses responsive headers and section lists to assemble playlist details. */
  getPlaylistDetails(browseId: string): Promise<PlaylistDetails>;
  
  /** Extracts podcast shows and their multi-row episode listings cleanly. */
  getPodcastDetails(browseId: string): Promise<PodcastShowDetails>;
  
  /** Extracts visual headers and discography shelves for a target artist profile. */
  getArtistProfile(browseId: string): Promise<ArtistProfile>;
  
  /** Scrapes dedicated taxonomy explore pages (e.g., Moods & Genres, New Releases). */
  getExplorePage(browseId: string): Promise<BrowseShelf[]>;
  
  /** Dynamically unboxes home feed chip clouds and taxonomy pages for real-time category resolution. */
  getDynamicChipFeed(chipName: string): Promise<BrowseShelf[]>;
  
  /** Retrieves low-latency autocomplete search query suggestions. */
  getSearchSuggestions(query: string): Promise<string[]>;
  
  /** Generates an automated, continuous radio track queue seeded from a target videoId. */
  getRadioQueue(videoId: string): Promise<ExtractedTrack[]>;
}

export const HyperExtractor = NitroModules.createHybridObject<HyperExtractor>('HyperExtractor');