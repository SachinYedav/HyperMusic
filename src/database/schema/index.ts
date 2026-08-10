import * as SQLite from 'expo-sqlite';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();

/**
 * Initializes the SQLite database schema and runs necessary migrations.
 * Uses PRAGMA user_version to track and seamlessly upgrade schema changes.
 */
export async function initializeDatabase(db: SQLite.SQLiteDatabase) {
  try {
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
  } catch (e) {
    console.warn('[Schema] Failed to set WAL mode, continuing with default journal mode:', e);
  }

  try {
    const versionResult = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    let currentVersion = versionResult?.user_version || 0;
    
    // Base Schema (Version 1)
    if (currentVersion === 0) {
      
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
          addedAt INTEGER,
          trackType TEXT DEFAULT 'song'
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
        `CREATE TABLE IF NOT EXISTS SavedArtists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          avatarUrl TEXT,
          subscriberCount TEXT,
          savedAt INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS DownloadQueue (
          id TEXT PRIMARY KEY,
          trackId TEXT NOT NULL,
          status TEXT DEFAULT 'PENDING',
          priority INTEGER DEFAULT 0,
          retryCount INTEGER DEFAULT 0,
          addedAt INTEGER NOT NULL,
          FOREIGN KEY (trackId) REFERENCES Tracks (id) ON DELETE CASCADE
        )`
      ];

      // Executing one by one to avoid large execAsync block which sometimes fails on fast-refresh JNI layer
      for (const sql of statements) {
        await db.runAsync(sql);
      }

      // Migrating legacy v1.3.0 users: Their table exists but lacks 'trackType'. 
      // For new users, the CREATE TABLE above already added it, so ALTER will throw (which we safely catch and ignore).
      try {
        await db.runAsync(`ALTER TABLE Tracks ADD COLUMN trackType TEXT DEFAULT 'song'`);
      } catch (e) {
        // Ignored: Column already exists for fresh v2.0.0 installs
      }
      
      currentVersion = 1;
    }

    await db.runAsync(`PRAGMA user_version = ${currentVersion}`);

    // Seed default playlist on very first app run
    const hasSeededDefaultPlaylist = storage.getBoolean('has_seeded_default_playlist');
    if (!hasSeededDefaultPlaylist) {
      const defaultId = 'default_playlist_' + Date.now();
      await db.runAsync(
        `INSERT INTO Playlists (id, name, coverUrl, createdAt) VALUES (?, ?, ?, ?)`,
        [defaultId, 'My Favorite Tracks', null, Date.now()]
      );
      storage.set('has_seeded_default_playlist', true);
    }

  } catch (e) {
    // This catches NPE from React Native Fast Refresh reloading the DB concurrently
    console.error('[Schema] Database Initialization/Migration failed:', e);
  }
}
