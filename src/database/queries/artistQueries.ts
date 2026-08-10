import { SQLiteDatabase } from 'expo-sqlite';

export interface SavedArtist {
  id: string;
  name: string;
  avatarUrl: string | null;
  subscriberCount: string | null;
  savedAt: number;
}

/**
 * Toggles the saved status of an artist in the database.
 */
export async function toggleArtistSaved(
  db: SQLiteDatabase,
  artistId: string,
  name: string,
  avatarUrl?: string | null,
  subscriberCount?: string | null
): Promise<boolean> {
  try {
    const existing = await db.getFirstAsync('SELECT id FROM SavedArtists WHERE id = ?', [artistId]);
    
    if (existing) {
      await db.runAsync('DELETE FROM SavedArtists WHERE id = ?', [artistId]);
            return false; // Removed
    } else {
      await db.runAsync(
        'INSERT INTO SavedArtists (id, name, avatarUrl, subscriberCount, savedAt) VALUES (?, ?, ?, ?, ?)',
        [artistId, name, avatarUrl || null, subscriberCount || null, Date.now()]
      );
            return true; // Added
    }
  } catch (error) {
    console.error('[artistQueries] Error toggling artist saved status:', error);
    return false;
  }
}

/**
 * Fetches all user-saved artists.
 */
export async function getSavedArtists(db: SQLiteDatabase): Promise<SavedArtist[]> {
  try {
    const results = await db.getAllAsync<SavedArtist>('SELECT * FROM SavedArtists ORDER BY savedAt DESC');
    return results || [];
  } catch (error) {
    console.error('[artistQueries] Error fetching saved artists:', error);
    return [];
  }
}

/**
 * Checks if a specific artist is saved.
 */
export async function isArtistSaved(db: SQLiteDatabase, artistId: string): Promise<boolean> {
  try {
    const result = await db.getFirstAsync('SELECT id FROM SavedArtists WHERE id = ?', [artistId]);
    return !!result;
  } catch (error) {
    return false;
  }
}
