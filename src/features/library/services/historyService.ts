import { SQLiteDatabase } from 'expo-sqlite';
import { ExtractedTrack, BrowseItem } from 'react-native-hyper-extractor';
import { upsertTrack, upsertTrackSync } from '@/database/queries/trackQueries';
import { clearAllPlaybackHistory, removeTrackFromHistory, getRecentPlaybackHistory, getTopPlayedTracks, upsertPlaybackHistorySync, prunePlaybackHistorySync } from '@/database/queries/historyQueries';
import { useLibraryStore } from '@/store/useLibraryStore';


/**
 * Synchronously records a playback event. 
 * Bypasses background async promise throttling, guaranteeing execution before JS suspends.
 */
export function recordPlaySync(db: SQLiteDatabase, track: ExtractedTrack) {
  try {
    const now = Date.now();
    
    db.withTransactionSync(() => {
      upsertTrackSync(db, track);
      upsertPlaybackHistorySync(db, track.id, now);
    });

    pruneHistorySync(db);
    useLibraryStore.getState().incrementLibraryRevision();
    
  } catch (error) {
    console.error('[HistoryService] Failed to record play sync:', error);
  }
}


/**
 * Synchronous version of pruneHistory.
 */
function pruneHistorySync(db: SQLiteDatabase, limit: number = 500) {
  try {
    prunePlaybackHistorySync(db, limit);
  } catch (error) {
    console.error('[HistoryService] Failed to prune history sync:', error);
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
    useLibraryStore.getState().incrementLibraryRevision();
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
    useLibraryStore.getState().incrementLibraryRevision();
  } catch (error) {
    console.error('[HistoryService] Failed to delete history item:', error);
  }
}

