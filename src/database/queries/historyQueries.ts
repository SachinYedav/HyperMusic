import { SQLiteDatabase } from 'expo-sqlite';


/**
 * Fetches recently played tracks.
 */
export async function getRecentPlaybackHistory(db: SQLiteDatabase, limit: number = 20) {
  return await db.getAllAsync<{
    id: string; title: string; artist: string; artworkUrl: string; trackType: string; lastPlayedAt: number;
  }>(
    `SELECT t.id, t.title, t.artist, t.artworkUrl, t.trackType, h.lastPlayedAt
     FROM PlaybackHistory h
     JOIN Tracks t ON t.id = h.trackId
     ORDER BY h.lastPlayedAt DESC
     LIMIT ?`,
    [limit]
  );
}

/**
 * Fetches heavily rotated tracks (top played).
 */
export async function getTopPlayedTracks(db: SQLiteDatabase, limit: number = 20) {
  return await db.getAllAsync<{
    id: string; title: string; artist: string; artworkUrl: string; trackType: string; playCount: number;
  }>(
    `SELECT t.id, t.title, t.artist, t.artworkUrl, t.trackType, h.playCount
     FROM PlaybackHistory h
     JOIN Tracks t ON t.id = h.trackId
     ORDER BY h.playCount DESC, h.lastPlayedAt DESC
     LIMIT ?`,
    [limit]
  );
}

/**
 * Inserts or increments a track in the PlaybackHistory.
 */
export async function upsertPlaybackHistory(db: SQLiteDatabase, trackId: string, timestamp: number): Promise<void> {
  await db.runAsync(
    `INSERT INTO PlaybackHistory (trackId, playCount, lastPlayedAt) 
     VALUES (?, 1, ?)
     ON CONFLICT(trackId) DO UPDATE SET 
        playCount = playCount + 1,
        lastPlayedAt = excluded.lastPlayedAt`,
    [trackId, timestamp]
  );
}

/**
 * Prunes the PlaybackHistory to keep it under the limit.
 */
export async function prunePlaybackHistory(db: SQLiteDatabase, limit: number): Promise<void> {
  const countResult = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM PlaybackHistory`);
  const totalCount = countResult?.count || 0;

  if (totalCount > limit) {
    await db.runAsync(
      `DELETE FROM PlaybackHistory WHERE trackId IN (
         SELECT trackId FROM PlaybackHistory ORDER BY lastPlayedAt ASC LIMIT ?
       )`,
      [totalCount - limit]
    );
  }
}

/**
 * Clears entire playback history.
 */
export async function clearAllPlaybackHistory(db: SQLiteDatabase) {
  await db.runAsync(`DELETE FROM PlaybackHistory`);
}

/**
 * Removes a specific track from playback history.
 */
export async function removeTrackFromHistory(db: SQLiteDatabase, trackId: string) {
  await db.runAsync(`DELETE FROM PlaybackHistory WHERE trackId = ?`, [trackId]);
}

/**
 * Fetches the complete playback history as ExtractedTrack for Library views.
 */
export async function getFullPlaybackHistory(db: SQLiteDatabase, limit: number = 100): Promise<any[]> {
  try {
    const results = await db.getAllAsync<{
      id: string; title: string; artist: string; artworkUrl: string; duration: number; lastPlayedAt: number;
    }>(
      `SELECT t.id, t.title, t.artist, t.artworkUrl, t.duration, h.lastPlayedAt
       FROM PlaybackHistory h
       JOIN Tracks t ON t.id = h.trackId
       ORDER BY h.lastPlayedAt DESC
       LIMIT ?`,
      [limit]
    );
    return results.map(row => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      duration: row.duration,
      artworkUrl: row.artworkUrl
    }));
  } catch (error) {
    console.error('[historyQueries] Error fetching full history:', error);
    return [];
  }
}
