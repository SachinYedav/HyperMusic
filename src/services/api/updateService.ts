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
 * Fetches release metadata from the HyperStudio marketplace API.
 */
export const updateService = {
  async checkForUpdates(): Promise<UpdateResponse> {
    try {
      const productId = Constants.expoConfig?.extra?.hyperstudioProductId || 'proj_hypermusic';
      
      const response = await fetch(`https://hyperstudio-marketplace.vercel.app/api/releases/${productId}`);

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
  isUpdateAvailable(versionCode: number): boolean {
    const currentVersionCode = Constants.expoConfig?.android?.versionCode || 1;
    return versionCode > currentVersionCode;
  }
};
