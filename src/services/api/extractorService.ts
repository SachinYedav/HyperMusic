import { HyperExtractor } from 'react-native-hyper-extractor';
import { useSettingsStore } from '@/store';

export interface ExtractionRequestOptions {
  signal?: AbortSignal;
  isDownload?: boolean;
  extractionType?: 'audio' | 'video';
}

/**
 * Service wrapper delegating high-performance streaming URL extraction, catalog indexing, and quality profile selection to the native hyper extractor engine.
 */
export const extractorService = {
  /**
   * Fetches the actual streaming URL for a given video/audio track.
   * Dynamically applies user quality preferences (e.g. data saver).
   * 
   * @param videoId - The YouTube/YouTube Music video ID.
   * @param options - Extraction request options (e.g., AbortSignal).
   * @returns A promise that resolves to the stream URL string.
   */
  async getStreamUrl(videoId: string, options?: ExtractionRequestOptions): Promise<string> {
    try {
      if (options?.signal?.aborted) throw new Error('Aborted');
      
      const settings = useSettingsStore.getState();
      let quality = 'normal';
      
      if (options?.isDownload) {
        quality = settings.downloadQuality;
      } else {
        quality = settings.dataSaver ? 'data_saver' : settings.streamingQuality;
      }
      
      const streamUrl = await HyperExtractor.getStreamUrl(videoId, quality, options?.extractionType);
      return streamUrl;
    } catch (error) {
      console.error('[extractorService] getStreamUrl failed', error);
      throw error;
    }
  },

  /**
   * Searches for tracks, albums, and playlists based on a query string.
   * 
   * @param query - The search query.
   * @param options - Extraction request options.
   * @returns A promise that resolves to a list of search results.
   */
  async searchTracks(query: string, options?: ExtractionRequestOptions) {
    try {
      if (options?.signal?.aborted) throw new Error('Aborted');
      
      const tracks = await HyperExtractor.search(query);
      return tracks;
    } catch (error) {
      console.error('[extractorService] searchTracks failed', error);
      throw error;
    }
  },

  /**
   * Fetches the detailed list of tracks for a specific playlist.
   * 
   * @param playlistId - The playlist ID.
   * @param options - Extraction request options.
   * @returns A promise that resolves to playlist metadata and its tracks.
   */
  async getPlaylistDetails(playlistId: string, options?: ExtractionRequestOptions) {
    try {
      if (options?.signal?.aborted) throw new Error('Aborted');
      
      const details = await HyperExtractor.getPlaylistDetails(playlistId);
      return details;
    } catch (error) {
      console.error('[extractorService] getPlaylistDetails failed', error);
      throw error;
    }
  },

  /**
   * Fetches the detailed list of tracks for a specific album.
   * 
   * @param albumId - The album ID.
   * @param options - Extraction request options.
   * @returns A promise that resolves to album metadata and its tracks.
   */
  async getAlbumDetails(albumId: string, options?: ExtractionRequestOptions) {
    try {
      if (options?.signal?.aborted) throw new Error('Aborted');
      
      const details = await HyperExtractor.getAlbumDetails(albumId);
      return details;
    } catch (error) {
      console.error('[extractorService] getAlbumDetails failed', error);
      throw error;
    }
  },

  /**
   * Fetches the detailed metadata and episodes for a podcast.
   * 
   * @param podcastId - The podcast ID.
   * @param options - Extraction request options.
   * @returns A promise that resolves to podcast details.
   */
  async getPodcastDetails(podcastId: string, options?: ExtractionRequestOptions) {
    try {
      if (options?.signal?.aborted) throw new Error('Aborted');
      
      const details = await HyperExtractor.getPodcastDetails(podcastId);
      return details;
    } catch (error) {
      console.error('[extractorService] getPodcastDetails failed', error);
      throw error;
    }
  },

  /**
   * Fetches the full profile for an artist, including top tracks and albums.
   * 
   * @param artistId - The artist ID.
   * @param options - Extraction request options.
   * @returns A promise that resolves to the artist's profile data.
   */
  async getArtistProfile(artistId: string, options?: ExtractionRequestOptions) {
    try {
      if (options?.signal?.aborted) throw new Error('Aborted');
      
      const details = await HyperExtractor.getArtistProfile(artistId);
      return details;
    } catch (error) {
      console.error('[extractorService] getArtistProfile failed', error);
      throw error;
    }
  },

  /**
   * Fetches a customized explore or browse page based on a browse ID.
   * 
   * @param browseId - The ID of the page to explore.
   * @param options - Extraction request options.
   * @returns A promise that resolves to a list of shelves/sections.
   */
  async getExplorePage(browseId: string, options?: ExtractionRequestOptions) {
    try {
      if (options?.signal?.aborted) throw new Error('Aborted');
      
      const shelves = await HyperExtractor.getExplorePage(browseId);
      return shelves;
    } catch (error) {
      console.error('[extractorService] getExplorePage failed', error);
      throw error;
    }
  },

  /**
   * Fetches search suggestions as the user types.
   * 
   * @param query - The partial query string.
   * @param options - Extraction request options.
   * @returns A promise that resolves to a list of suggestion strings.
   */
  async getSearchSuggestions(query: string, options?: ExtractionRequestOptions) {
    try {
      if (options?.signal?.aborted) throw new Error('Aborted');
      
      const suggestions = await HyperExtractor.getSearchSuggestions(query);
      return suggestions;
    } catch (error) {
      console.error('[extractorService] getSearchSuggestions failed', error);
      throw error;
    }
  },

  /**
   * Fetches a dynamic feed of content based on a selected filter chip (e.g. language/mood).
   * 
   * @param filter - The selected chip filter ID or string.
   * @param options - Extraction request options.
   * @returns A promise that resolves to the filtered dynamic feed.
   */
  async getDynamicChipFeed(filter: string, options?: ExtractionRequestOptions) {
    try {
      if (options?.signal?.aborted) throw new Error('Aborted');
      
      const feed = await HyperExtractor.getDynamicChipFeed(filter);
      return feed;
    } catch (error) {
      console.error('[extractorService] getDynamicChipFeed failed', error);
      throw error;
    }
  },

  /**
   * Fetches the personalized home feed for the user.
   * 
   * @param options - Extraction request options.
   * @returns A promise that resolves to the home feed shelves.
   */
  async getHomeFeed(options?: ExtractionRequestOptions) {
    try {
      if (options?.signal?.aborted) throw new Error('Aborted');
      
      const feed = await HyperExtractor.getHomeFeed();
      return feed;
    } catch (error) {
      console.error('[extractorService] getHomeFeed failed', error);
      throw error;
    }
  }
};
