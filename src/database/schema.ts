import * as SQLite from 'expo-sqlite';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();

/**
 * Initializes the SQLite database schema for the Library.
 * Each table is created in its own statement so a partial failure
 * doesn't block the tables that already succeeded.
 */
export async function initializeDatabase(db: SQLite.SQLiteDatabase) {
  // Using WAL (Write-Ahead Logging) for better performance and concurrency
  try {
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
  } catch (e) {
    console.warn('[Schema] Failed to set WAL mode, continuing with default journal mode:', e);
  }

  // Each table created independently so partial failures don't cascade
  const statements = [
    `CREATE TABLE IF NOT EXISTS Tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      artistId TEXT,
      album TEXT,
      duration INTEGER,
      artworkUrl TEXT,
      localFilePath TEXT,
      localArtworkPath TEXT,
      isLiked INTEGER DEFAULT 0,
      addedAt INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS Playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      coverUrl TEXT,
      createdAt INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS PlaylistTracks (
      playlistId TEXT NOT NULL,
      trackId TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      PRIMARY KEY (playlistId, trackId),
      FOREIGN KEY (playlistId) REFERENCES Playlists (id) ON DELETE CASCADE,
      FOREIGN KEY (trackId) REFERENCES Tracks (id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Albums (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT,
      coverUrl TEXT,
      year TEXT,
      createdAt INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS AlbumTracks (
      albumId TEXT NOT NULL,
      trackId TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      PRIMARY KEY (albumId, trackId),
      FOREIGN KEY (albumId) REFERENCES Albums (id) ON DELETE CASCADE,
      FOREIGN KEY (trackId) REFERENCES Tracks (id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Downloads (
      trackId TEXT PRIMARY KEY,
      downloadedAt INTEGER NOT NULL,
      size INTEGER,
      status TEXT DEFAULT 'completed',
      FOREIGN KEY (trackId) REFERENCES Tracks (id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS PlaybackHistory (
      trackId TEXT PRIMARY KEY,
      playCount INTEGER DEFAULT 0,
      lastPlayedAt INTEGER NOT NULL,
      FOREIGN KEY (trackId) REFERENCES Tracks (id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tracks_artist ON Tracks(artist)`,
    `CREATE INDEX IF NOT EXISTS idx_tracks_isLiked ON Tracks(isLiked)`,
    `CREATE INDEX IF NOT EXISTS idx_history_lastPlayed ON PlaybackHistory(lastPlayedAt DESC)`,
  ];

  for (const sql of statements) {
    try {
      await db.execAsync(sql + ';');
    } catch (e) {
      console.error('[Schema] Failed to execute migration statement:', sql.substring(0, 60), e);
    }
  }

  // Seed default playlist on very first app run
  const hasSeededDefaultPlaylist = storage.getBoolean('has_seeded_default_playlist');
  if (!hasSeededDefaultPlaylist) {
    try {
      const defaultId = 'default_playlist_' + Date.now();
      await db.runAsync(
        `INSERT INTO Playlists (id, name, coverUrl, createdAt) VALUES (?, ?, ?, ?)`,
        [defaultId, 'My Favorite Tracks', null, Date.now()]
      );
      storage.set('has_seeded_default_playlist', true);
    } catch (e) {
      console.error('[Schema] Failed to seed default playlist:', e);
    }
  }
}
