import { create } from 'zustand';
import { SQLiteDatabase } from 'expo-sqlite';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { 
  saveRemoteAlbum,
  saveRemotePlaylist
} from '@/features/library/services/libraryService';
import {
  deleteAlbumById,
  deletePlaylistById,
  toggleArtistSaved,
  upsertTrack,
  updateTrackLikeStatus
} from '@/database/queries';

interface LibraryState {
  savedAlbumIds: Set<string>;
  savedPlaylistIds: Set<string>;
  followedArtistIds: Set<string>;
  likedTrackIds: Set<string>;
  isInitialized: boolean;
  libraryRevision: number;
  
  init: (db: SQLiteDatabase) => Promise<void>;
  incrementLibraryRevision: () => void;
  
  // Optimistic Toggles
  toggleAlbum: (db: SQLiteDatabase, id: string, title: string, artist?: string, coverUrl?: string) => Promise<void>;
  togglePlaylist: (db: SQLiteDatabase, id: string, name: string, coverUrl?: string) => Promise<void>;
  toggleArtist: (db: SQLiteDatabase, artist: { id: string, name: string, avatarUrl?: string }) => Promise<void>;
  toggleTrackLike: (db: SQLiteDatabase, track: ExtractedTrack) => Promise<void>;
}

/**
 * Global Zustand store managing optimistic UI states for the user's library (albums, playlists, artists, liked tracks).
 * Synchronizes with the local SQLite database and handles automatic rollbacks on failure.
 */
export const useLibraryStore = create<LibraryState>((set, get) => ({
  savedAlbumIds: new Set(),
  savedPlaylistIds: new Set(),
  followedArtistIds: new Set(),
  likedTrackIds: new Set(),
  isInitialized: false,
  libraryRevision: 0,
  incrementLibraryRevision: () => set({ libraryRevision: Date.now() }),

  init: async (db: SQLiteDatabase) => {
    try {
      const [albums, playlists, artists, tracks] = await Promise.all([
        db.getAllAsync<{ id: string }>('SELECT id FROM Albums'),
        db.getAllAsync<{ id: string }>('SELECT id FROM Playlists'),
        db.getAllAsync<{ id: string }>('SELECT id FROM SavedArtists'),
        db.getAllAsync<{ id: string }>('SELECT id FROM Tracks WHERE isLiked = 1')
      ]);

      set({
        savedAlbumIds: new Set(albums.map(a => a.id)),
        savedPlaylistIds: new Set(playlists.map(p => p.id)),
        followedArtistIds: new Set(artists.map(a => a.id)),
        likedTrackIds: new Set(tracks.map(t => t.id)),
        isInitialized: true
      });
    } catch (e) {
      console.error('[useLibraryStore] Init failed:', e);
    }
  },

  toggleAlbum: async (db: SQLiteDatabase, id: string, title: string, artist?: string, coverUrl?: string) => {
    const { savedAlbumIds } = get();
    const newSet = new Set(savedAlbumIds);
    const isSaved = newSet.has(id);
    
    // Optimistic UI update
    if (isSaved) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    set({ savedAlbumIds: newSet });

    // Background DB update
    try {
      if (isSaved) {
        await deleteAlbumById(db, id);
      } else {
        await saveRemoteAlbum(db, id, title, artist, coverUrl);
      }
      set({ libraryRevision: Date.now() });
    } catch (e) {
      console.error('Failed to toggle album', e);
      // Rollback on failure
      set({ savedAlbumIds: savedAlbumIds });
    }
  },

  togglePlaylist: async (db: SQLiteDatabase, id: string, name: string, coverUrl?: string) => {
    const { savedPlaylistIds } = get();
    const newSet = new Set(savedPlaylistIds);
    const isSaved = newSet.has(id);
    
    if (isSaved) newSet.delete(id); else newSet.add(id);
    set({ savedPlaylistIds: newSet });

    try {
      if (isSaved) {
        await deletePlaylistById(db, id);
      } else {
        await saveRemotePlaylist(db, id, name, coverUrl);
      }
      set({ libraryRevision: Date.now() });
    } catch (e) {
      console.error('Failed to toggle playlist', e);
      set({ savedPlaylistIds: savedPlaylistIds });
    }
  },

  toggleArtist: async (db: SQLiteDatabase, artist: { id: string, name: string, avatarUrl?: string }) => {
    const { followedArtistIds } = get();
    const newSet = new Set(followedArtistIds);
    const isSaved = newSet.has(artist.id);
    
    if (isSaved) newSet.delete(artist.id); else newSet.add(artist.id);
    set({ followedArtistIds: newSet });

    try {
      // We pass the parameters expected by toggleArtistSaved
      const finalAdded = await toggleArtistSaved(db, artist.id, artist.name, artist.avatarUrl, undefined);
      
      // If the query returns a boolean that differs from our optimistic state (e.g. database rejected or it was out of sync)
      // we rollback to what the DB says.
      if (finalAdded !== !isSaved) {
         const correctedSet = new Set(followedArtistIds);
         if (finalAdded) correctedSet.add(artist.id);
         else correctedSet.delete(artist.id);
         set({ followedArtistIds: correctedSet });
      }
      set({ libraryRevision: Date.now() });
    } catch (e) {
      console.error('Failed to toggle artist', e);
      set({ followedArtistIds: followedArtistIds });
    }
  },

  toggleTrackLike: async (db: SQLiteDatabase, track: ExtractedTrack) => {
    const { likedTrackIds } = get();
    const newSet = new Set(likedTrackIds);
    const isLiked = newSet.has(track.id);
    
    if (isLiked) newSet.delete(track.id); else newSet.add(track.id);
    set({ likedTrackIds: newSet });

    try {
      await upsertTrack(db, track);
      const newLikedState = isLiked ? 0 : 1;
      const addedAt = newLikedState === 1 ? Date.now() : null;
      await updateTrackLikeStatus(db, track.id, newLikedState, addedAt);
      set({ libraryRevision: Date.now() });
    } catch (e) {
      console.error('Failed to toggle track like', e);
      set({ likedTrackIds: likedTrackIds });
    }
  }
}));
