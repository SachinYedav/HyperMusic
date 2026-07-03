import { HyperExtractor } from 'react-native-hyper-extractor';
import { useSettingsStore } from '@/store';

export interface ExtractionRequestOptions {
  signal?: AbortSignal;
  isDownload?: boolean;
}

/**
 * Service wrapper delegating high-performance streaming URL extraction, catalog indexing, and quality profile selection to the native hyper extractor engine.
 */
export const extractorService = {
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
      
      const streamUrl = await HyperExtractor.getStreamUrl(videoId, quality);
      return streamUrl;
    } catch (error) {
      console.error('[extractorService] getStreamUrl failed', error);
      throw error;
    }
  },

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

  async getAlbumDetails(albumId: string, options?: ExtractionRequestOptions) {
    try {
      if (options?.signal?.aborted) throw new Error('Aborted');
      
      const details = await HyperExtractor.getAlbumDetails(albumId);
      return details;
    } catch (error) {
      console.error('[extractorService] getAlbumDetails failed', error);
      throw error;
    }
  }
};
