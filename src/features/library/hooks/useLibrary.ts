import { useState, useEffect, useCallback } from 'react';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { useLibraryStore } from '@/store/useLibraryStore';

import { ExtractedTrack } from 'react-native-hyper-extractor';
import { 
  getLikedTracks, 
  getAllPlaylists, 
  getAllAlbums, 
  getDownloadedTracks, 
  getFullPlaybackHistory,
  getSavedArtists 
} from '@/database/queries';

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
  id: string;
  name: string;
  avatarUrl: string | null;
  subscriberCount: string | null;
  savedAt: number;
}

/**
 * Hook to reactively fetch liked songs from the SQLite database.
 */
export function useLikedSongs() {
  const db = useSafeDatabase();
  const [songs, setSongs] = useState<ExtractedTrack[]>([]);
  const libraryRevision = useLibraryStore(state => state.libraryRevision);

  const fetchSongs = useCallback(async () => {
    if (!db) return;
    const results = await getLikedTracks(db);
    setSongs(results);
  }, [db, libraryRevision]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs, libraryRevision]);

  return songs;
}

/**
 * Hook to reactively fetch user-created playlists.
 */
export function usePlaylists() {
  const db = useSafeDatabase();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const libraryRevision = useLibraryStore(state => state.libraryRevision);

  const fetchPlaylists = useCallback(async () => {
    if (!db) return;
    const results = await getAllPlaylists(db);
    setPlaylists(results);
  }, [db, libraryRevision]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists, libraryRevision]);

  return playlists;
}

/**
 * Hook to reactively fetch user-saved artists from the explicit library.
 */
export function useArtists() {
  const db = useSafeDatabase();
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const libraryRevision = useLibraryStore(state => state.libraryRevision);

  const fetchArtists = useCallback(async () => {
    if (!db) return;
    const results = await getSavedArtists(db);
    setArtists(results);
  }, [db, libraryRevision]);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists, libraryRevision]);

  return artists;
}

/**
 * Hook to reactively fetch user-saved albums.
 */
export function useAlbums() {
  const db = useSafeDatabase();
  const [albums, setAlbums] = useState<Album[]>([]);
  const libraryRevision = useLibraryStore(state => state.libraryRevision);

  const fetchAlbums = useCallback(async () => {
    if (!db) return;
    const results = await getAllAlbums(db);
    setAlbums(results);
  }, [db, libraryRevision]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums, libraryRevision]);

  return albums;
}

/**
 * Hook to reactively fetch all downloaded songs from the SQLite database.
 */
export function useDownloadedSongs() {
  const db = useSafeDatabase();
  const [downloadedSongs, setDownloadedSongs] = useState<ExtractedTrack[]>([]);
  const libraryRevision = useLibraryStore((state) => state.libraryRevision);

  const fetchDownloadedSongs = useCallback(async () => {
    if (!db) return;
    const results = await getDownloadedTracks(db);
    setDownloadedSongs(results);
  }, [db]);

  useEffect(() => {
    fetchDownloadedSongs();
  }, [fetchDownloadedSongs, libraryRevision]);

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
    const results = await getFullPlaybackHistory(db, 100);
    setHistory(results);
  }, [db]);

  useEffect(() => {
    fetchHistory();
    
  }, [fetchHistory]);

  return history;
}
