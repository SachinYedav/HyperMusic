import { SQLiteDatabase } from 'expo-sqlite';
import { ExtractedTrack } from 'react-native-hyper-extractor';


/**
 * Fetches all liked tracks from the database.
 */
export async function getLikedTracks(db: SQLiteDatabase): Promise<any[]> {
  try {
    return await db.getAllAsync(
      `SELECT * FROM Tracks WHERE isLiked = 1 ORDER BY addedAt DESC`
    );
  } catch (error) {
    console.error('[trackQueries] Error fetching liked tracks:', error);
    return [];
  }
}

/**
 * Searches tracks by artist name (liked or downloaded).
 */
export async function getTracksByArtist(db: SQLiteDatabase, artist: string): Promise<any[]> {
  try {
    return await db.getAllAsync(
      `SELECT * FROM Tracks WHERE (isLiked = 1 OR id IN (SELECT trackId FROM Downloads)) AND artist LIKE ?`,
      [`%${artist}%`]
    );
  } catch (error) {
    console.error('[trackQueries] Error fetching tracks by artist:', error);
    return [];
  }
}

/**
 * Checks if a track is liked.
 */
export async function checkIsLiked(db: SQLiteDatabase, trackId: string): Promise<boolean> {
  try {
    const result = await db.getFirstAsync<{ isLiked: number }>(
      'SELECT isLiked FROM Tracks WHERE id = ?',
      [trackId]
    );
    return result?.isLiked === 1;
  } catch (error) {
    console.error('[trackQueries] Error checking if track is liked:', error);
    return false;
  }
}

/**
 * Inserts a track or updates its metadata if it already exists.
 * Does not overwrite `isLiked` or `localFilePath` if updating.
 */
export async function upsertTrack(db: SQLiteDatabase, track: ExtractedTrack) {
  const artwork = track.artworkUrl || (track as any).artwork || (track as any).coverUrl || (track as any).thumbnail || null;
  const trackType = (track as any).trackType || (track as any).type || 'song';
  await db.runAsync(
    `INSERT INTO Tracks (id, title, artist, artistId, album, duration, artworkUrl, trackType)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        artist=excluded.artist,
        artistId=excluded.artistId,
        album=excluded.album,
        duration=excluded.duration,
        artworkUrl=excluded.artworkUrl,
        trackType=COALESCE(excluded.trackType, trackType)`,
    [
      track.id,
      track.title || 'Unknown',
      track.artist || 'Unknown',
      track.artistId || null,
      null, // album property does not exist on ExtractedTrack
      track.duration || 0,
      artwork,
      trackType,
    ]
  );
}

/**
 * Synchronous version of upsertTrack, bypassing background async limits.
 */
export function upsertTrackSync(db: SQLiteDatabase, track: ExtractedTrack) {
  const artwork = track.artworkUrl || (track as any).artwork || (track as any).coverUrl || (track as any).thumbnail || null;
  const trackType = (track as any).trackType || (track as any).type || 'song';
  db.runSync(
    `INSERT INTO Tracks (id, title, artist, artistId, album, duration, artworkUrl, trackType)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        artist=excluded.artist,
        artistId=excluded.artistId,
        album=excluded.album,
        duration=excluded.duration,
        artworkUrl=excluded.artworkUrl,
        trackType=COALESCE(excluded.trackType, trackType)`,
    [
      track.id,
      track.title || 'Unknown',
      track.artist || 'Unknown',
      track.artistId || null,
      null,
      track.duration || 0,
      artwork,
      trackType,
    ]
  );
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
}

/**
 * Updates a track's like status directly (used by useLibraryStore which holds memory state).
 */
export async function updateTrackLikeStatus(db: SQLiteDatabase, trackId: string, isLiked: number, addedAt: number | null): Promise<void> {
  await db.runAsync(
    `UPDATE Tracks SET isLiked = ?, addedAt = ? WHERE id = ?`,
    [isLiked, addedAt, trackId]
  );
}

/**
 * Clears the local file paths of a track (e.g., when a download is deleted).
 */
export async function clearTrackLocalPaths(db: SQLiteDatabase, trackId: string): Promise<void> {
  await db.runAsync(
    `UPDATE Tracks SET localFilePath = NULL, localArtworkPath = NULL WHERE id = ?`,
    [trackId]
  );
}

/**
 * Updates the local file paths of a track (e.g., when a download completes).
 */
export async function updateTrackLocalPaths(db: SQLiteDatabase, trackId: string, localFilePath: string, localArtworkPath: string): Promise<void> {
  await db.runAsync(
    `UPDATE Tracks SET localFilePath = ?, localArtworkPath = ? WHERE id = ?`,
    [localFilePath, localArtworkPath, trackId]
  );
}
