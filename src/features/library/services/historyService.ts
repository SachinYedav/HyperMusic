import { SQLiteDatabase } from 'expo-sqlite';
import { ExtractedTrack, BrowseItem } from 'react-native-hyper-extractor';
import { upsertTrack, libraryEmitter } from './libraryService';

/**
 * Records a playback event in the SQLite database within an exclusive transaction, upserting track entity metadata and incrementing play counts.
 *
 * @param db - SQLite database connection instance.
 * @param track - Extracted track entity payload.
 */
export async function recordPlay(db: SQLiteDatabase, track: ExtractedTrack) {
  try {
    const now = Date.now();
    
    // Wrap in a standard transaction to prevent exclusive WAL filesystem deadlocks
    await db.withTransactionAsync(async () => {
      // 1. Ensure track exists
      await db.runAsync(
        `INSERT INTO Tracks (id, title, artist, artistId, album, duration, artworkUrl) 
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
            title=excluded.title, 
            artist=excluded.artist, 
            artworkUrl=excluded.artworkUrl`,
        [track.id, track.title, track.artist, track.artistId || null, null, track.duration || 0, track.artworkUrl || null]
      );

      // 2. Insert or update PlaybackHistory
      await db.runAsync(
        `INSERT INTO PlaybackHistory (trackId, playCount, lastPlayedAt) 
         VALUES (?, 1, ?)
         ON CONFLICT(trackId) DO UPDATE SET 
            playCount = playCount + 1,
            lastPlayedAt = excluded.lastPlayedAt`,
        [track.id, now]
      );
    });

    // 3. Prune history to avoid infinite database growth
    await pruneHistory(db);

    libraryEmitter.emit();
  } catch (error) {
    console.error('[HistoryService] Failed to record play:', error);
    // Silent fail to avoid crashing the playback flow
  }
}

/**
 * Ensures the PlaybackHistory table does not exceed a certain limit (e.g., 2000 items).
 * Overrides/deletes the oldest tracks by lastPlayedAt.
 */
async function pruneHistory(db: SQLiteDatabase, limit: number = 100) {
  try {
    const countResult = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM PlaybackHistory`);
    const totalCount = countResult?.count || 0;

    if (totalCount > limit) {
      // Delete the oldest records that exceed the limit
      await db.runAsync(
        `DELETE FROM PlaybackHistory WHERE trackId IN (
           SELECT trackId FROM PlaybackHistory 
           ORDER BY lastPlayedAt ASC 
           LIMIT ?
         )`,
        [totalCount - limit]
      );
      // console.log(`[HistoryService] Pruned ${totalCount - limit} old history records.`);
    }
  } catch (error) {
    console.error('[HistoryService] Failed to prune history:', error);
  }
}

/**
 * Returns recently played tracks mapped to BrowseItem format for Home feed injection
 */
export async function getRecentPlays(db: SQLiteDatabase, limit: number = 10): Promise<BrowseItem[]> {
  const result = await db.getAllAsync<{
    id: string; title: string; artist: string; artworkUrl: string; lastPlayedAt: number;
  }>(
    `SELECT t.id, t.title, t.artist, t.artworkUrl, h.lastPlayedAt
     FROM PlaybackHistory h
     JOIN Tracks t ON t.id = h.trackId
     ORDER BY h.lastPlayedAt DESC
     LIMIT ?`,
    [limit]
  );

  return result.map(row => ({
    id: row.id,
    type: 'song',
    title: row.title,
    subtitle: row.artist,
    artworkUrl: row.artworkUrl
  }));
}

/**
 * Returns heavily rotated tracks (top played) mapped to BrowseItem format for Home feed injection
 */
export async function getHeavyRotation(db: SQLiteDatabase, limit: number = 10): Promise<BrowseItem[]> {
  const result = await db.getAllAsync<{
    id: string; title: string; artist: string; artworkUrl: string; playCount: number;
  }>(
    `SELECT t.id, t.title, t.artist, t.artworkUrl, h.playCount
     FROM PlaybackHistory h
     JOIN Tracks t ON t.id = h.trackId
     ORDER BY h.playCount DESC, h.lastPlayedAt DESC
     LIMIT ?`,
    [limit]
  );

  return result.map(row => ({
    id: row.id,
    type: 'song',
    title: row.title,
    subtitle: row.artist,
    artworkUrl: row.artworkUrl
  }));
}

/**
 * Clears the entire playback history from the database.
 */
export async function clearHistory(db: SQLiteDatabase): Promise<void> {
  try {
    await db.runAsync(`DELETE FROM PlaybackHistory`);
    libraryEmitter.emit();
  } catch (error) {
    console.error('[HistoryService] Failed to clear history:', error);
  }
}

/**
 * Removes a specific single track from the playback history.
 */
export async function deleteHistoryItem(db: SQLiteDatabase, trackId: string): Promise<void> {
  try {
    await db.runAsync(`DELETE FROM PlaybackHistory WHERE trackId = ?`, [trackId]);
    libraryEmitter.emit();
  } catch (error) {
    console.error('[HistoryService] Failed to delete history item:', error);
  }
}

