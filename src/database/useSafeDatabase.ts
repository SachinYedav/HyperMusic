import { useSQLiteContext, SQLiteDatabase } from 'expo-sqlite';
import { useMemo } from 'react';

/**
 * Safe wrapper around useSQLiteContext() that returns a robust Proxy object.
 * Intercepts all database methods (getAllAsync, getFirstAsync, runAsync, execAsync)
 * to catch JNI NullPointerExceptions caused by backgrounding/app reopen events,
 * returning safe fallback values to prevent cascade crashes and yellow/red boxes.
 */
export function useSafeDatabase(): SQLiteDatabase | null {
  try {
    const db = useSQLiteContext();
    return useMemo(() => {
      if (!db) return null;
      return new Proxy(db, {
        get(target, prop, receiver) {
          const origMethod = (target as any)[prop];
          if (typeof origMethod === 'function') {
            return async (...args: any[]) => {
              try {
                return await origMethod.apply(target, args);
              } catch (e: any) {
                console.warn(`[useSafeDatabase] JNI safety interception on ${String(prop)}:`, e?.message || e);
                if (prop === 'getAllAsync') return [];
                if (prop === 'getFirstAsync') return null;
                if (prop === 'runAsync') return { lastInsertRowId: 0, changes: 0 };
                return null;
              }
            };
          }
          return Reflect.get(target, prop, receiver);
        }
      });
    }, [db]);
  } catch (e) {
    console.warn('[useSafeDatabase] SQLite context unavailable:', e);
    return null;
  }
}
