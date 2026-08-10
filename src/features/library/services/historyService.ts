import { SQLiteDatabase } from 'expo-sqlite';
import { ExtractedTrack, BrowseItem } from 'react-native-hyper-extractor';
import { upsertTrack } from '@/database/queries';
import { upsertPlaybackHistory, prunePlaybackHistory, clearAllPlaybackHistory, removeTrackFromHistory, getRecentPlaybackHistory, getTopPlayedTracks } from '@/database/queries/historyQueries';

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
      await upsertTrack(db, track);

      // 2. Insert or update PlaybackHistory
      await upsertPlaybackHistory(db, track.id, now);
    });

    // 3. Prune history to avoid infinite database growth
    await pruneHistory(db);

    
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
    await prunePlaybackHistory(db, limit);
  } catch (error) {
    console.error('[HistoryService] Failed to prune history:', error);
  }
}

/**
 * Returns recently played tracks mapped to BrowseItem format for Home feed injection
 */
export async function getRecentPlays(db: SQLiteDatabase, limit: number = 20): Promise<BrowseItem[]> {
  const result = await getRecentPlaybackHistory(db, limit);
  return result.map(row => ({
    id: row.id,
    type: row.trackType || 'song',
    title: row.title,
    subtitle: row.artist,
    artworkUrl: row.artworkUrl
  }));
}

/**
 * Returns heavily rotated tracks (top played) mapped to BrowseItem format for Home feed injection
 */
export async function getHeavyRotation(db: SQLiteDatabase, limit: number = 20): Promise<BrowseItem[]> {
  const result = await getTopPlayedTracks(db, limit);
  return result.map(row => ({
    id: row.id,
    type: row.trackType || 'song',
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
    await clearAllPlaybackHistory(db);
    
  } catch (error) {
    console.error('[HistoryService] Failed to clear history:', error);
  }
}

/**
 * Removes a specific single track from the playback history.
 */
export async function deleteHistoryItem(db: SQLiteDatabase, trackId: string): Promise<void> {
  try {
    await removeTrackFromHistory(db, trackId);
    
  } catch (error) {
    console.error('[HistoryService] Failed to delete history item:', error);
  }
}

