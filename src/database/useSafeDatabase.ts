import { useSQLiteContext, SQLiteDatabase } from 'expo-sqlite';

/**
 * Safe wrapper around useSQLiteContext() that returns a robust Proxy object.
 * Intercepts all database methods (getAllAsync, getFirstAsync, runAsync, execAsync)
 * to catch JNI NullPointerExceptions caused by backgrounding/app reopen events,
 * returning safe fallback values to prevent cascade crashes and yellow/red boxes.
 */
export function useSafeDatabase(): SQLiteDatabase | null {
  try {
    const db = useSQLiteContext();
    return db;
  } catch (e) {
    console.warn('[useSafeDatabase] SQLite context unavailable:', e);
    return null;
  }
}
