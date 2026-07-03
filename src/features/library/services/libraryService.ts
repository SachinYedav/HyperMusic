import { SQLiteDatabase } from 'expo-sqlite';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { extractorService } from '@/services/api/extractorService';

// Simple Event Emitter to trigger UI re-renders across hooks when DB mutates
type Listener = () => void;
const listeners = new Set<Listener>();

let emitTimer: ReturnType<typeof setTimeout> | null = null;

export const libraryEmitter = {
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit: () => {
    if (emitTimer) clearTimeout(emitTimer);
    emitTimer = setTimeout(() => {
      listeners.forEach((listener) => listener());
    }, 50);
  },
};

/**
 * Inserts a track or updates its metadata if it already exists.
 * Does not overwrite `isLiked` or `localFilePath` if updating.
 */
export async function upsertTrack(db: SQLiteDatabase, track: ExtractedTrack) {
  const artwork = track.artworkUrl || (track as any).artwork || (track as any).coverUrl || (track as any).thumbnail || null;
  await db.runAsync(
    `INSERT INTO Tracks (id, title, artist, artistId, album, duration, artworkUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        artist=excluded.artist,
        artistId=excluded.artistId,
        album=excluded.album,
        duration=excluded.duration,
        artworkUrl=excluded.artworkUrl`,
    [
      track.id,
      track.title,
      track.artist,
      track.artistId || null,
      null, // album property does not exist on ExtractedTrack
      track.duration || 0,
      artwork,
    ]
  );
  libraryEmitter.emit();
}

/**
 * Upserts the track, toggles the isLiked integer, and sets addedAt.
 */
export async function toggleLike(db: SQLiteDatabase, track: ExtractedTrack) {
  // Ensure track exists in the DB first
  await upsertTrack(db, track);

  // Get current like status
  const existing = await db.getFirstAsync<{ isLiked: number }>('SELECT isLiked FROM Tracks WHERE id = ?', [track.id]);
  const newLikedState = existing?.isLiked === 1 ? 0 : 1;
  const addedAt = newLikedState === 1 ? Date.now() : null;

  await db.runAsync(
    `UPDATE Tracks SET isLiked = ?, addedAt = ? WHERE id = ?`,
    [newLikedState, addedAt, track.id]
  );

  libraryEmitter.emit();
}

/**
 * Generates a UUID and inserts a new playlist.
 */
export async function createPlaylist(db: SQLiteDatabase, name: string) {
  // Simple UUID generation
  const id = 'playlist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

  await db.runAsync(
    `INSERT INTO Playlists (id, name, createdAt) VALUES (?, ?, ?)`,
    [id, name, Date.now()]
  );

  libraryEmitter.emit();
  return id;
}

/**
 * Upserts the track, then adds the relational mapping in PlaylistTracks with the correct order_index.
 */
export async function addTrackToPlaylist(db: SQLiteDatabase, playlistId: string, track: ExtractedTrack) {
  await upsertTrack(db, track);

  // Get the highest order_index for this playlist
  const result = await db.getFirstAsync<{ maxOrder: number }>(
    `SELECT MAX(order_index) as maxOrder FROM PlaylistTracks WHERE playlistId = ?`,
    [playlistId]
  );
  const nextOrderIndex = (result?.maxOrder ?? -1) + 1;

  try {
    await db.runAsync(
      `INSERT OR IGNORE INTO PlaylistTracks (playlistId, trackId, order_index) VALUES (?, ?, ?)`,
      [playlistId, track.id, nextOrderIndex]
    );

    // Update the playlist's cover image if it doesn't have one
    if (track.artworkUrl) {
      const playlist = await db.getFirstAsync<{ coverUrl: string | null }>(`SELECT coverUrl FROM Playlists WHERE id = ?`, [playlistId]);
      if (playlist && !playlist.coverUrl) {
        await db.runAsync(`UPDATE Playlists SET coverUrl = ? WHERE id = ?`, [track.artworkUrl, playlistId]);
      }
    }

    libraryEmitter.emit();
  } catch (error) {
    // console.log('Track might already be in this playlist');
  }
}

/**
 * Deletes a playlist entity and its relational track mappings within an exclusive transaction.
 *
 * @param db - SQLite database connection instance.
 * @param playlistId - Target playlist UUID to delete.
 */
export async function deletePlaylist(db: SQLiteDatabase, playlistId: string) {
  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM PlaylistTracks WHERE playlistId = ?`, [playlistId]);
      await db.runAsync(`DELETE FROM Playlists WHERE id = ?`, [playlistId]);
    });
    libraryEmitter.emit();
  } catch (error) {
    console.error('Error deleting playlist:', error);
  }
}

/**
 * Deletes an album entity and its relational track mappings within an exclusive transaction.
 *
 * @param db - SQLite database connection instance.
 * @param albumId - Target album UUID to delete.
 */
export async function deleteAlbum(db: SQLiteDatabase, albumId: string) {
  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM AlbumTracks WHERE albumId = ?`, [albumId]);
      await db.runAsync(`DELETE FROM Albums WHERE id = ?`, [albumId]);
    });
    libraryEmitter.emit();
  } catch (error) {
    console.error('Error deleting album:', error);
  }
}

/**
 * Fetches remote playlist metadata and tracks via extractorService, persisting the entity and relational records in SQLite within an exclusive transaction.
 *
 * @param db - SQLite database connection instance.
 * @param playlistId - Remote playlist identifier.
 * @param name - Playlist display title.
 * @param coverUrl - Optional cover art URL.
 */
export async function saveRemotePlaylist(db: SQLiteDatabase, playlistId: string, name: string, coverUrl?: string) {
  try {
    const details = await extractorService.getPlaylistDetails(playlistId);
    if (!details || !details.tracks) return;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO Playlists (id, name, coverUrl, createdAt) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, coverUrl=excluded.coverUrl`,
        [playlistId, name, coverUrl || null, Date.now()]
      );

      const trackStmt = await db.prepareAsync(
        `INSERT INTO Tracks (id, title, artist, artistId, album, duration, artworkUrl)
         VALUES ($id, $title, $artist, $artistId, $album, $duration, $artworkUrl)
         ON CONFLICT(id) DO UPDATE SET title=excluded.title, artist=excluded.artist, artworkUrl=excluded.artworkUrl`
      );

      const relationStmt = await db.prepareAsync(
        `INSERT OR IGNORE INTO PlaylistTracks (playlistId, trackId, order_index) VALUES ($playlistId, $trackId, $order_index)`
      );

      try {
        for (let i = 0; i < details.tracks.length; i++) {
          const track = details.tracks[i];
          await trackStmt.executeAsync({
            $id: track.id,
            $title: track.title,
            $artist: track.artist,
            $artistId: track.artistId || null,
            $album: null,
            $duration: track.duration || 0,
            $artworkUrl: track.artworkUrl || null
          });

          await relationStmt.executeAsync({
            $playlistId: playlistId,
            $trackId: track.id,
            $order_index: i
          });
        }
      } finally {
        await trackStmt.finalizeAsync();
        await relationStmt.finalizeAsync();
      }
    });
    libraryEmitter.emit();
    return true;
  } catch (e) {
    console.error("Failed to save remote playlist", e);
    return false;
  }
}

/**
 * Fetches remote album metadata and tracks via extractorService, persisting the entity and relational records in SQLite within an exclusive transaction.
 *
 * @param db - SQLite database connection instance.
 * @param albumId - Remote album identifier.
 * @param title - Album display title.
 * @param artist - Album primary artist name.
 * @param coverUrl - Optional cover art URL.
 */
export async function saveRemoteAlbum(db: SQLiteDatabase, albumId: string, title: string, artist?: string, coverUrl?: string) {
  try {
    const details = await extractorService.getAlbumDetails(albumId);
    if (!details || !details.tracks) return;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO Albums (id, title, artist, coverUrl, year, createdAt) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET title=excluded.title, coverUrl=excluded.coverUrl`,
        [albumId, title, artist || null, coverUrl || null, details.year || null, Date.now()]
      );

      const trackStmt = await db.prepareAsync(
        `INSERT INTO Tracks (id, title, artist, artistId, album, duration, artworkUrl)
         VALUES ($id, $title, $artist, $artistId, $album, $duration, $artworkUrl)
         ON CONFLICT(id) DO UPDATE SET title=excluded.title, artist=excluded.artist, artworkUrl=excluded.artworkUrl`
      );

      const relationStmt = await db.prepareAsync(
        `INSERT OR IGNORE INTO AlbumTracks (albumId, trackId, order_index) VALUES ($albumId, $trackId, $order_index)`
      );

      try {
        for (let i = 0; i < details.tracks.length; i++) {
          const track = details.tracks[i];
          await trackStmt.executeAsync({
            $id: track.id,
            $title: track.title,
            $artist: track.artist,
            $artistId: track.artistId || null,
            $album: title,
            $duration: track.duration || 0,
            $artworkUrl: track.artworkUrl || null
          });

          await relationStmt.executeAsync({
            $albumId: albumId,
            $trackId: track.id,
            $order_index: i
          });
        }
      } finally {
        await trackStmt.finalizeAsync();
        await relationStmt.finalizeAsync();
      }
    });
    libraryEmitter.emit();
    return true;
  } catch (e) {
    console.error("Failed to save remote album", e);
    return false;
  }
}
