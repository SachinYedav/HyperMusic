import { useState, useEffect, useCallback } from 'react';
import { usePermissions, Query, AssetField, MediaType } from 'expo-media-library';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { Platform, Linking } from 'react-native';
import { useToastStore } from '@/store/useToastStore';

/**
 * Hook to handle local device audio/video files via expo-media-library 
 * Provides fast querying without heavy metadata extraction overhead.
 */
export function useDeviceFiles(isActive: boolean) {
  const [files, setFiles] = useState<ExtractedTrack[]>([]);
  const [permissionResponse, requestPermission] = usePermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      if (permissionResponse?.status !== 'granted') {
        return;
      }

      setIsScanning(true);
      setError(null);

      // Query for Audio and Video
      const query = new Query()
        .within(AssetField.MEDIA_TYPE, [MediaType.AUDIO, MediaType.VIDEO])
        .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
        .limit(2000);

      const mediaAssets = await query.exeForMetadata();

      const audioTracks: ExtractedTrack[] = [];
      const videoTracks: ExtractedTrack[] = [];

      for (const asset of mediaAssets) {
        const isAudio = asset.mediaType === MediaType.AUDIO;
        const track: ExtractedTrack = {
          id: asset.id,
          title: asset.filename ? asset.filename.replace(/\.[^/.]+$/, '') : (isAudio ? 'Unknown Audio' : 'Unknown Video'),
          artist: `Local Device • ${isAudio ? 'Audio' : 'Video'}`,
          artworkUrl: '',
          url: asset.id,
          duration: (asset.duration || 0) * 1000,
          trackType: isAudio ? 'local_device_audio' : 'local_device_video',
        } as any;

        if (isAudio) {
          audioTracks.push(track);
        } else {
          videoTracks.push(track);
        }
      }

      // Audio files first, then Video files
      const formattedTracks = [...audioTracks, ...videoTracks];

      setFiles(formattedTracks);
    } catch (e: any) {
      console.error('[useDeviceFiles] Error in fetchFiles:', e.message, e);
      setError(e.message || 'Failed to query MediaLibrary');
    } finally {
      setIsScanning(false);
    }
  }, [permissionResponse]);

  useEffect(() => {
    if (!isActive) return;

    if (permissionResponse?.status === 'granted' && files.length === 0) {
      fetchFiles();
    }
  }, [isActive, files.length, fetchFiles, permissionResponse]);

  const requestPermissionWrapper = useCallback(async () => {
    const response = await requestPermission();
    if (response.granted) {
      fetchFiles();
    } else if (!response.canAskAgain) {
      useToastStore.getState().showToast('Please enable Storage permission in Settings', 'info');
      Linking.openSettings();
    }
    return response.granted;
  }, [requestPermission, fetchFiles]);

  return {
    files,
    permissionStatus: permissionResponse?.status || null,
    isScanning,
    error,
    requestPermission: requestPermissionWrapper,
    fetchFiles,
  };
}
