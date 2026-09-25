import { SQLiteDatabase } from 'expo-sqlite';
import { ExtractedTrack } from 'react-native-hyper-extractor';

/**
 * Fetches all local user albums.
 */
export async function getAllAlbums(db: SQLiteDatabase): Promise<any[]> {
  try {
    return await db.getAllAsync(`SELECT * FROM Albums ORDER BY COALESCE(updatedAt, createdAt) DESC`);
  } catch (error) {
    console.error('[albumQueries] Error fetching albums:', error);
    return [];
  }
}

/**
 * Fetches all local user albums, including a dynamic trackCount for each.
 */
export async function getAllAlbumsWithTrackCount(db: SQLiteDatabase): Promise<any[]> {
  try {
    return await db.getAllAsync(`
      SELECT a.*, (SELECT COUNT(*) FROM AlbumTracks WHERE albumId = a.id) as trackCount 
      FROM Albums a 
      ORDER BY COALESCE(a.updatedAt, a.createdAt) DESC
    `);
  } catch (error) {
    console.error('[albumQueries] Error fetching albums with track counts:', error);
    return [];
  }
}

/**
 * Fetches an album by ID.
 */
export async function getAlbumById(db: SQLiteDatabase, albumId: string): Promise<any | null> {
  try {
    return await db.getFirstAsync(
      `SELECT * FROM Albums WHERE id = ?`,
      [albumId]
    );
  } catch (error) {
    console.error('[albumQueries] Error fetching album:', error);
    return null;
  }
}

/**
 * Fetches all tracks for a given album.
 */
export async function getAlbumTracks(db: SQLiteDatabase, albumId: string): Promise<any[]> {
  try {
    return await db.getAllAsync(
      `SELECT t.*, at.order_index 
       FROM AlbumTracks at
       JOIN Tracks t ON at.trackId = t.id
       WHERE at.albumId = ?
       ORDER BY at.order_index ASC`,
      [albumId]
    );
  } catch (error) {
    console.error('[albumQueries] Error fetching album tracks:', error);
    return [];
  }
}

/**
 * Deletes an album entity and its relational track mappings within an exclusive transaction.
 */
export async function deleteAlbumById(db: SQLiteDatabase, albumId: string): Promise<void> {
  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM AlbumTracks WHERE albumId = ?`, [albumId]);
      await db.runAsync(`DELETE FROM Albums WHERE id = ?`, [albumId]);
    });
  } catch (error) {
    console.error('Error deleting album:', error);
  }
}

/**
 * Inserts a remote album and its tracks into SQLite within a transaction.
 */
export async function insertRemoteAlbumData(
  db: SQLiteDatabase, 
  albumId: string, 
  title: string, 
  artist: string | undefined | null, 
  coverUrl: string | undefined | null, 
  year: string | undefined | null,
  tracks: ExtractedTrack[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO Albums (id, title, artist, coverUrl, year, createdAt) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, coverUrl=excluded.coverUrl`,
      [albumId, title, artist || null, coverUrl || null, year || null, Date.now()]
    );

    const trackStmt = await db.prepareAsync(
      `INSERT INTO Tracks (id, title, artist, artistId, album, duration, artworkUrl, trackType)
       VALUES ($id, $title, $artist, $artistId, $album, $duration, $artworkUrl, $trackType)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, artist=excluded.artist, artworkUrl=excluded.artworkUrl, trackType=COALESCE(excluded.trackType, trackType)`
    );

    const relationStmt = await db.prepareAsync(
      `INSERT OR IGNORE INTO AlbumTracks (albumId, trackId, order_index) VALUES ($albumId, $trackId, $order_index)`
    );

    try {
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        await trackStmt.executeAsync({
          $id: track.id,
          $title: track.title || 'Unknown',
          $artist: track.artist || 'Unknown',
          $artistId: track.artistId || null,
          $album: title,
          $duration: track.duration || 0,
          $artworkUrl: track.artworkUrl || null,
          $trackType: (track as any).type || 'song'
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
}
