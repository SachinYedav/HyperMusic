import { useState, useEffect, useCallback } from 'react';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { libraryEmitter } from '../services/libraryService';
import { ExtractedTrack } from 'react-native-hyper-extractor';

export interface Playlist {
  id: string;
  name: string;
  coverUrl: string | null;
  createdAt: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string | null;
  coverUrl: string | null;
  year: string | null;
  createdAt: number;
}

export interface ArtistSummary {
  artist: string;
  artistId?: string;
  trackCount: number;
}

/**
 * Hook to reactively fetch liked songs from the SQLite database.
 */
export function useLikedSongs() {
  const db = useSafeDatabase();
  const [songs, setSongs] = useState<ExtractedTrack[]>([]);

  const fetchSongs = useCallback(async () => {
    if (!db) return;
    try {
      const results = await db.getAllAsync<ExtractedTrack>(
        `SELECT * FROM Tracks WHERE isLiked = 1 ORDER BY addedAt DESC`
      );
      setSongs(results);
    } catch (error) {
      console.error('Failed to fetch liked songs:', error);
    }
  }, [db]);

  useEffect(() => {
    fetchSongs();
    return libraryEmitter.subscribe(fetchSongs);
  }, [fetchSongs]);

  return songs;
}

/**
 * Hook to reactively fetch user-created playlists.
 */
export function usePlaylists() {
  const db = useSafeDatabase();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const fetchPlaylists = useCallback(async () => {
    if (!db) return;
    try {
      const results = await db.getAllAsync<Playlist>(
        `SELECT * FROM Playlists ORDER BY createdAt DESC`
      );
      setPlaylists(results);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  }, [db]);

  useEffect(() => {
    fetchPlaylists();
    return libraryEmitter.subscribe(fetchPlaylists);
  }, [fetchPlaylists]);

  return playlists;
}

/**
 * Hook to reactively fetch grouped artists and their track counts from the explicit library.
 * Filters out unliked history tracks and cleanly splits composite artist strings.
 */
export function useArtists() {
  const db = useSafeDatabase();
  const [artists, setArtists] = useState<ArtistSummary[]>([]);

  const fetchArtists = useCallback(async () => {
    if (!db) return;
    try {
      // 1. Fetch only tracks explicitly liked or downloaded (avoiding infinite growth from history)
      const results = await db.getAllAsync<{ artist: string; artistId: string | null }>(
        `SELECT artist, artistId FROM Tracks WHERE isLiked = 1 OR id IN (SELECT trackId FROM Downloads)`
      );

      if (!results || results.length === 0) {
        setArtists([]);
        return;
      }

      // 2. Safely parse and normalize composite artist strings
      const artistMap = new Map<string, { artistId?: string; trackCount: number }>();

      results.forEach(row => {
        if (!row || !row.artist) return;
        // Split composite artists like "Arijit Singh, Shreya Ghoshal" or "Pritam & Arijit Singh"
        const splits = row.artist.split(/, |\b & \b|\b feat\.?\b|\b ft\.?\b/i);
        
        splits.forEach(artistName => {
          const cleanName = artistName.trim();
          if (!cleanName) return;

          const existing = artistMap.get(cleanName);
          if (existing) {
            existing.trackCount += 1;
            if (!existing.artistId && row.artistId) {
              existing.artistId = row.artistId;
            }
          } else {
            artistMap.set(cleanName, {
              artistId: row.artistId || undefined,
              trackCount: 1,
            });
          }
        });
      });

      const summaries: ArtistSummary[] = Array.from(artistMap.entries()).map(([artist, data]) => ({
        artist,
        artistId: data.artistId,
        trackCount: data.trackCount,
      })).sort((a, b) => a.artist.localeCompare(b.artist));

      setArtists(summaries);
    } catch (error) {
      console.error('Failed to fetch artists:', error);
      setArtists([]); // Robust fallback to prevent crashes
    }
  }, [db]);

  useEffect(() => {
    fetchArtists();
    return libraryEmitter.subscribe(fetchArtists);
  }, [fetchArtists]);

  return artists;
}

/**
 * Hook to reactively fetch user-saved albums.
 */
export function useAlbums() {
  const db = useSafeDatabase();
  const [albums, setAlbums] = useState<Album[]>([]);

  const fetchAlbums = useCallback(async () => {
    if (!db) return;
    try {
      const results = await db.getAllAsync<Album>(
        `SELECT * FROM Albums ORDER BY createdAt DESC`
      );
      setAlbums(results);
    } catch (error) {
      console.error('Failed to fetch albums:', error);
    }
  }, [db]);

  useEffect(() => {
    fetchAlbums();
    return libraryEmitter.subscribe(fetchAlbums);
  }, [fetchAlbums]);

  return albums;
}

/**
 * Hook to reactively fetch all downloaded songs from the SQLite database.
 */
export function useDownloadedSongs() {
  const db = useSafeDatabase();
  const [downloadedSongs, setDownloadedSongs] = useState<ExtractedTrack[]>([]);

  const fetchDownloadedSongs = useCallback(async () => {
    if (!db) return;
    try {
      const results = await db.getAllAsync<ExtractedTrack>(
        `SELECT t.* FROM Tracks t INNER JOIN Downloads d ON t.id = d.trackId ORDER BY d.downloadedAt DESC`
      );
      setDownloadedSongs(results);
    } catch (error) {
      console.error('Failed to fetch downloaded songs:', error);
    }
  }, [db]);

  useEffect(() => {
    fetchDownloadedSongs();
    return libraryEmitter.subscribe(fetchDownloadedSongs);
  }, [fetchDownloadedSongs]);

  return downloadedSongs;
}

/**
 * Hook to reactively fetch the complete playback history (up to 100 tracks).
 */
export function useHistory() {
  const db = useSafeDatabase();
  const [history, setHistory] = useState<ExtractedTrack[]>([]);

  const fetchHistory = useCallback(async () => {
    if (!db) return;
    try {
      const results = await db.getAllAsync<{
        id: string; title: string; artist: string; artworkUrl: string; duration: number; lastPlayedAt: number;
      }>(
        `SELECT t.id, t.title, t.artist, t.artworkUrl, t.duration, h.lastPlayedAt
         FROM PlaybackHistory h
         JOIN Tracks t ON t.id = h.trackId
         ORDER BY h.lastPlayedAt DESC
         LIMIT 100`
      );
      
      const mappedResults: ExtractedTrack[] = results.map(row => ({
        id: row.id,
        title: row.title,
        artist: row.artist,
        duration: row.duration,
        artworkUrl: row.artworkUrl
      }));
      
      setHistory(mappedResults);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, [db]);

  useEffect(() => {
    fetchHistory();
    return libraryEmitter.subscribe(fetchHistory);
  }, [fetchHistory]);

  return history;
}
