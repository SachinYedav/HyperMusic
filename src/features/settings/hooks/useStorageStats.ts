import { useState, useCallback, useEffect } from 'react';
import { Paths, Directory, File } from 'expo-file-system';
import { useSafeDatabase } from '@/database/useSafeDatabase';

export interface StorageStats {
  downloads: number;
  cache: number;
  appData: number;
  freeSpace: number;
  totalSpace: number;
}

export function useStorageStats() {
  const db = useSafeDatabase();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const calculateStorage = useCallback(async () => {
    try {
      const freeSpace = Paths.availableDiskSpace;
      const totalSpace = Paths.totalDiskSpace;

      let appData = 0;
      const dbDir = new Directory(Paths.document, 'SQLite');
      const dbFile = new File(dbDir, 'hypermusic.db');
      if (dbFile.exists) {
        appData = dbFile.size || 0;
      }

      let cache = 0;
      if (Paths.cache.exists) {
         cache = Paths.cache.size || 0; 
      }

      let downloads = 0;
      if (db) {
         const downloadedFiles = await db.getAllAsync<{localFilePath: string; localArtworkPath: string}>(
           'SELECT t.localFilePath, t.localArtworkPath FROM Tracks t INNER JOIN Downloads d ON t.id = d.trackId'
         );
         for (const fileRow of downloadedFiles) {
           if (fileRow.localFilePath) {
             const fileInfo = new File(fileRow.localFilePath);
             if (fileInfo.exists) {
               downloads += fileInfo.size || 0;
             }
           }
           if (fileRow.localArtworkPath) {
             const artInfo = new File(fileRow.localArtworkPath);
             if (artInfo.exists) {
               downloads += artInfo.size || 0;
             }
           }
         }
      }
      
      setStats({
        downloads,
        cache,
        appData,
        freeSpace,
        totalSpace
      });
    } catch (e) {
      console.error('Failed to calculate storage stats:', e);
    }
  }, [db]);

  useEffect(() => {
    calculateStorage();
  }, [calculateStorage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await calculateStorage();
    setRefreshing(false);
  }, [calculateStorage]);

  return { stats, refreshing, onRefresh, fetchStats: calculateStorage };
}
