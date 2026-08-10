import { SQLiteDatabase } from 'expo-sqlite';
import { extractorService } from '@/services/api/extractorService';
import { insertRemotePlaylistData } from '@/database/queries/playlistQueries';
import { insertRemoteAlbumData } from '@/database/queries/albumQueries';

/**
 * Fetches remote playlist metadata and tracks via extractorService, 
 * then persists the entity and relational records using the database query layer.
 *
 * @param db - SQLite database connection instance.
 * @param playlistId - Remote playlist identifier.
 * @param name - Playlist display title.
 * @param coverUrl - Optional cover art URL.
 */
export async function saveRemotePlaylist(db: SQLiteDatabase, playlistId: string, name: string, coverUrl?: string) {
  try {
    const details = await extractorService.getPlaylistDetails(playlistId);
    if (!details || !details.tracks) return false;

    await insertRemotePlaylistData(db, playlistId, name, coverUrl, details.tracks);
    return true;
  } catch (e) {
    console.error("Failed to save remote playlist", e);
    return false;
  }
}

/**
 * Fetches remote album metadata and tracks via extractorService, 
 * then persists the entity and relational records using the database query layer.
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
    if (!details || !details.tracks) return false;

    await insertRemoteAlbumData(db, albumId, title, artist, coverUrl, details.year, details.tracks);
    return true;
  } catch (e) {
    console.error("Failed to save remote album", e);
    return false;
  }
}
