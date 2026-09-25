import { SQLiteDatabase } from 'expo-sqlite';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { upsertTrack } from './trackQueries';

/**
 * Fetches all local user playlists.
 */
export async function getAllPlaylists(db: SQLiteDatabase): Promise<any[]> {
  try {
    return await db.getAllAsync(`SELECT * FROM Playlists ORDER BY COALESCE(updatedAt, createdAt) DESC`);
  } catch (error) {
    console.error('[playlistQueries] Error fetching playlists:', error);
    return [];
  }
}

/**
 * Fetches all local user playlists, including a dynamic trackCount for each.
 */
export async function getAllPlaylistsWithTrackCount(db: SQLiteDatabase): Promise<any[]> {
  try {
    return await db.getAllAsync(`
      SELECT p.*, (SELECT COUNT(*) FROM PlaylistTracks WHERE playlistId = p.id) as trackCount 
      FROM Playlists p 
      ORDER BY COALESCE(p.updatedAt, p.createdAt) DESC
    `);
  } catch (error) {
    console.error('[playlistQueries] Error fetching playlists with track counts:', error);
    return [];
  }
}

/**
 * Fetches all tracks for a given playlist.
 */
export async function getPlaylistTracks(db: SQLiteDatabase, playlistId: string): Promise<any[]> {
  try {
    return await db.getAllAsync(
      `SELECT t.*, pt.order_index 
       FROM PlaylistTracks pt
       JOIN Tracks t ON pt.trackId = t.id
       WHERE pt.playlistId = ?
       ORDER BY pt.order_index ASC`,
      [playlistId]
    );
  } catch (error) {
    console.error('[playlistQueries] Error fetching playlist tracks:', error);
    return [];
  }
}

/**
 * Fetches a specific playlist by ID.
 */
export async function getPlaylistById(db: SQLiteDatabase, playlistId: string): Promise<any | null> {
  try {
    return await db.getFirstAsync(
      `SELECT * FROM Playlists WHERE id = ?`,
      [playlistId]
    );
  } catch (error) {
    console.error('[playlistQueries] Error fetching playlist:', error);
    return null;
  }
}

/**
 * Creates a new playlist.
 */
export async function createPlaylist(db: SQLiteDatabase, name: string): Promise<string> {
  // Simple UUID generation
  const id = 'playlist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

  await db.runAsync(
    `INSERT INTO Playlists (id, name, createdAt) VALUES (?, ?, ?)`,
    [id, name, Date.now()]
  );

  return id;
}

/**
 * Deletes a playlist entity and its relational track mappings within an exclusive transaction.
 */
export async function deletePlaylistById(db: SQLiteDatabase, playlistId: string): Promise<void> {
  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM PlaylistTracks WHERE playlistId = ?`, [playlistId]);
      await db.runAsync(`DELETE FROM Playlists WHERE id = ?`, [playlistId]);
    });
  } catch (error) {
    console.error('Error deleting playlist:', error);
  }
}

/**
 * Upserts the track, then adds the relational mapping in PlaylistTracks with the correct order_index.
 */
export async function addTrackToPlaylist(db: SQLiteDatabase, playlistId: string, track: ExtractedTrack): Promise<void> {
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

    // Update the playlist's cover image if it doesn't have one, and update the updatedAt timestamp
    if (track.artworkUrl) {
      const playlist = await db.getFirstAsync<{ coverUrl: string | null }>(`SELECT coverUrl FROM Playlists WHERE id = ?`, [playlistId]);
      if (playlist && !playlist.coverUrl) {
        await db.runAsync(`UPDATE Playlists SET coverUrl = ?, updatedAt = ? WHERE id = ?`, [track.artworkUrl, Date.now(), playlistId]);
      } else {
        await db.runAsync(`UPDATE Playlists SET updatedAt = ? WHERE id = ?`, [Date.now(), playlistId]);
      }
    } else {
      await db.runAsync(`UPDATE Playlists SET updatedAt = ? WHERE id = ?`, [Date.now(), playlistId]);
    }
  } catch (error) {
    // Ignored: Track is likely already in the playlist (UNIQUE constraint failed)
  }
}

/**
 * Inserts a remote playlist and its tracks into SQLite within a transaction.
 */
export async function insertRemotePlaylistData(db: SQLiteDatabase, playlistId: string, name: string, coverUrl: string | undefined | null, tracks: ExtractedTrack[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO Playlists (id, name, coverUrl, createdAt) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, coverUrl=excluded.coverUrl`,
      [playlistId, name, coverUrl || null, Date.now()]
    );

    const trackStmt = await db.prepareAsync(
      `INSERT INTO Tracks (id, title, artist, artistId, album, duration, artworkUrl, trackType)
       VALUES ($id, $title, $artist, $artistId, $album, $duration, $artworkUrl, $trackType)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, artist=excluded.artist, artworkUrl=excluded.artworkUrl, trackType=COALESCE(excluded.trackType, trackType)`
    );

    const relationStmt = await db.prepareAsync(
      `INSERT OR IGNORE INTO PlaylistTracks (playlistId, trackId, order_index) VALUES ($playlistId, $trackId, $order_index)`
    );

    try {
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        await trackStmt.executeAsync({
          $id: track.id,
          $title: track.title || 'Unknown',
          $artist: track.artist || 'Unknown',
          $artistId: track.artistId || null,
          $album: null,
          $duration: track.duration || 0,
          $artworkUrl: track.artworkUrl || null,
          $trackType: (track as any).type || 'song'
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
}
