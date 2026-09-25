import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Fetches all tracks that have been downloaded.
 */
export async function getDownloadedTracks(db: SQLiteDatabase): Promise<any[]> {
  try {
    return await db.getAllAsync(
      `SELECT t.*, d.downloadedAt, d.size 
       FROM Downloads d
       JOIN Tracks t ON d.trackId = t.id
       ORDER BY d.downloadedAt DESC`
    );
  } catch (error) {
    console.error('[downloadQueries] Error fetching downloaded tracks:', error);
    return [];
  }
}

/**
 * Fetches queue row IDs for a specific track.
 */
export async function getQueueRowsByTrackId(db: SQLiteDatabase, trackId: string): Promise<{ id: string }[]> {
  try {
    return await db.getAllAsync<{ id: string }>(`SELECT id FROM DownloadQueue WHERE trackId = ?`, [trackId]);
  } catch (error) {
    console.error('[downloadQueries] Error fetching queue rows by track id:', error);
    return [];
  }
}

/**
 * Fetches a single pending queue item joined with its Track entity.
 */
export async function getPendingQueueItemWithTrack(db: SQLiteDatabase, trackId: string): Promise<{ trackId: string; trackType: string; queueId: string } | null> {
  try {
    return await db.getFirstAsync<{ trackId: string; trackType: string; queueId: string }>(
      `SELECT t.*, q.id as queueId FROM DownloadQueue q JOIN Tracks t ON q.trackId = t.id WHERE q.trackId = ?`, 
      [trackId]
    );
  } catch (error) {
    console.error('[downloadQueries] Error fetching pending queue item:', error);
    return null;
  }
}

/**
 * Fetches the next pending tracks from the DownloadQueue.
 */
export async function getNextPendingDownloads(db: SQLiteDatabase, limit: number = 2): Promise<any[]> {
  try {
    return await db.getAllAsync(
      `SELECT q.id as queueId, q.trackId, q.status, q.retryCount, t.*
       FROM DownloadQueue q
       JOIN Tracks t ON q.trackId = t.id
       WHERE q.status = 'PENDING' OR q.status = 'PAUSED'
       ORDER BY q.priority DESC, q.addedAt ASC
       LIMIT ?`,
       [limit]
    );
  } catch (error) {
    console.error('[downloadQueries] Error fetching pending downloads:', error);
    return [];
  }
}

/**
 * Updates the status of a track in the DownloadQueue.
 */
export async function updateQueueStatus(db: SQLiteDatabase, queueId: string, status: string, incrementRetry: boolean = false): Promise<void> {
  try {
    if (incrementRetry) {
      await db.runAsync(`UPDATE DownloadQueue SET status = ?, retryCount = retryCount + 1 WHERE id = ?`, [status, queueId]);
    } else {
      await db.runAsync(`UPDATE DownloadQueue SET status = ? WHERE id = ?`, [status, queueId]);
    }
  } catch (error) {
    console.error('[downloadQueries] Error updating queue status:', error);
  }
}

/**
 * Removes a track from the DownloadQueue.
 */
export async function removeFromQueue(db: SQLiteDatabase, queueId: string): Promise<void> {
  try {
    await db.runAsync(`DELETE FROM DownloadQueue WHERE id = ?`, [queueId]);
  } catch (error) {
    console.error('[downloadQueries] Error removing from queue:', error);
  }
}

/**
 * Adds a track to the DownloadQueue.
 */
export async function addToQueue(db: SQLiteDatabase, trackId: string, priority: number = 0): Promise<void> {
  try {
    const queueId = `q_${Date.now()}_${trackId}`;
    await db.runAsync(
      `INSERT OR IGNORE INTO DownloadQueue (id, trackId, status, priority, retryCount, addedAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [queueId, trackId, 'PENDING', priority, 0, Date.now()]
    );
  } catch (error) {
    console.error('[downloadQueries] Error adding to queue:', error);
  }
}

/**
 * Fetches ALL pending/paused tracks for the UI Queue display.
 */
export async function getAllPendingDownloads(db: SQLiteDatabase): Promise<any[]> {
  try {
    return await db.getAllAsync(
      `SELECT q.id as queueId, q.trackId, q.status, q.retryCount, t.*
       FROM DownloadQueue q
       JOIN Tracks t ON q.trackId = t.id
       WHERE q.status = 'PENDING' OR q.status = 'PAUSED'
       ORDER BY q.priority DESC, q.addedAt ASC`
    );
  } catch (error) {
    console.error('[downloadQueries] Error fetching all pending downloads:', error);
    return [];
  }
}

/**
 * Clears all items from the queue (Graceful Stop & Wipe).
 */
export async function clearEntireQueue(db: SQLiteDatabase): Promise<void> {
  try {
    await db.runAsync(`DELETE FROM DownloadQueue`);
  } catch (error) {
    console.error('[downloadQueries] Error clearing pending queue:', error);
  }
}

/**
 * Pauses all pending tracks in the queue.
 */
export async function pauseAllPending(db: SQLiteDatabase): Promise<void> {
  try {
    await db.runAsync(`UPDATE DownloadQueue SET status = 'PAUSED' WHERE status = 'PENDING' OR status = 'PROCESSING'`);
  } catch (error) {
    console.error('[downloadQueries] Error pausing all pending:', error);
  }
}

/**
 * Resumes all paused tracks in the queue.
 */
export async function resumeAllPaused(db: SQLiteDatabase): Promise<void> {
  try {
    await db.runAsync(`UPDATE DownloadQueue SET status = 'PENDING' WHERE status = 'PAUSED'`);
  } catch (error) {
    console.error('[downloadQueries] Error resuming all paused:', error);
  }
}

/**
 * Marks a track as downloaded.
 */
export async function markTrackDownloaded(db: SQLiteDatabase, trackId: string, finalUri: string, artworkUri: string, size: number = 0): Promise<void> {
  try {
    await db.runAsync(
      `UPDATE Tracks SET localFilePath = ?, localArtworkPath = ? WHERE id = ?`,
      [finalUri, artworkUri, trackId]
    );
    await db.runAsync(
      `INSERT OR REPLACE INTO Downloads (trackId, downloadedAt, size) VALUES (?, ?, ?)`,
      [trackId, Date.now(), size]
    );
    await db.runAsync(`DELETE FROM DownloadQueue WHERE trackId = ?`, [trackId]);
  } catch (error) {
    console.error('[downloadQueries] Error marking track downloaded:', error);
    throw error;
  }
}

/**
 * Removes a track from the DownloadQueue.
 */
export async function deleteDownloadQueueItem(db: SQLiteDatabase, trackId: string): Promise<void> {
  await db.runAsync(`DELETE FROM DownloadQueue WHERE trackId = ?`, [trackId]);
}

/**
 * Inserts a record into the Downloads table (used for sync and successful downloads).
 */
export async function insertDownloadRecord(db: SQLiteDatabase, trackId: string, size: number = 0): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO Downloads (trackId, downloadedAt, size) VALUES (?, ?, ?)`,
    [trackId, Date.now(), size]
  );
}

/**
 * Deletes a record from the Downloads table (used when a track is deleted from library).
 */
export async function deleteDownloadRecord(db: SQLiteDatabase, trackId: string): Promise<void> {
  await db.runAsync(`DELETE FROM Downloads WHERE trackId = ?`, [trackId]);
}
