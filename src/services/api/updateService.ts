import Constants from 'expo-constants';

export interface AppUpdateData {
  latestVersion: string;
  versionCode: number;
  forceUpdate: boolean;
  releaseDate: string;
  downloadUrl: string;
  changelog: Array<{ type: 'improvement' | 'fix' | 'patch'; text: string }>;
}

export interface UpdateResponse {
  status: 'success' | 'error';
  data?: AppUpdateData;
  message?: string;
}

/**
 * Service to check for the latest app updates.
 * Simulates a network request by returning data directly from the codebase in an organized way.
 */
export const updateService = {
  async checkForUpdates(): Promise<UpdateResponse> {
    try {
      // Append timestamp to bypass aggressive React Native fetch caching
      const timestamp = Date.now();
      const response = await fetch(`https://hyperstudio-marketplace.vercel.app/api/releases/proj_hypermusic?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();

      if (json.status === 'success' && json.data) {
        return {
          status: 'success',
          data: json.data as AppUpdateData
        };
      } else {
        return {
          status: 'error',
          message: json.message || 'No updates found.'
        };
      }
    } catch (error) {
      console.error('[updateService] checkForUpdates failed:', error);
      return {
        status: 'error',
        message: 'Network error. Failed to check for updates.'
      };
    }
  },

  /**
   * Helper to check if the latest version is greater than current installed version
   */
  isUpdateAvailable(latestVersion: string): boolean {
    const currentVersion = Constants.expoConfig?.version || '1.0.0';
    
    // Semantic version comparison
    const latestParts = latestVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);
    
    const maxLength = Math.max(latestParts.length, currentParts.length);
    for (let i = 0; i < maxLength; i++) {
      const l = latestParts[i] || 0;
      const c = currentParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false; // Versions are exactly equal
  }
};
