import { SQLiteDatabase } from 'expo-sqlite';

let globalDbInstance: SQLiteDatabase | null = null;

/**
 * Registers the globally mounted SQLite database connection pool.
 * Should only be called once when the DatabaseProvider initializes.
 */
export const setGlobalDb = (db: SQLiteDatabase) => {
  globalDbInstance = db;
};

/**
 * Retrieves the global SQLite database instance for use in non-React contexts
 * (e.g., background tasks, services, store actions).
 * Throws an error if called before the database is initialized.
 */
export const getGlobalDb = (): SQLiteDatabase => {
  if (!globalDbInstance) {
    throw new Error('[Database] Global database instance has not been initialized yet.');
  }
  return globalDbInstance;
};

/**
 * Safely retrieves the global SQLite database instance without throwing.
 * Use this in environments where the DB might legitimately not be ready yet.
 */
export const getGlobalDbSafe = (): SQLiteDatabase | null => {
  return globalDbInstance;
};
