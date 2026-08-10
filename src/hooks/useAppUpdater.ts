import { useState, useEffect, useRef } from 'react';
import { updateService } from '@/services/api/updateService';
import { useToastStore } from '@/store/useToastStore';

export function useAppUpdater(isReady: boolean) {
  const [showMandatoryUpdate, setShowMandatoryUpdate] = useState(false);
  const [updateUrl, setUpdateUrl] = useState('');
  const hasChecked = useRef(false);
  const toast = useToastStore();

  useEffect(() => {
    if (isReady && !hasChecked.current) {
      hasChecked.current = true;
      // Silently check for updates
      updateService.checkForUpdates().then(response => {
        if (response.status === 'success' && response.data) {
          const isNewer = updateService.isUpdateAvailable(response.data.versionCode);
          if (isNewer) {
            if (response.data.forceUpdate) {
              setUpdateUrl(response.data.downloadUrl);
              setShowMandatoryUpdate(true);
            } else {
              toast.showToast('New update available. Go to Settings > App Updates.');
            }
          }
        }
      });
    }
  }, [isReady]);

  return { showMandatoryUpdate, updateUrl };
}
