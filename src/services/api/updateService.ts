import Constants from 'expo-constants';

export interface AppReleaseAdvisory {
  badge?: string;
  title: string;
  description: string;
  notes?: string[];
}

export interface AppUpdateData {
  latestVersion: string;
  versionCode: number;
  forceUpdate: boolean;
  releaseDate: string;
  downloadUrl: string;
  changelog: Array<{ type: 'improvement' | 'fix' | 'patch'; text: string }>;
  advisory?: AppReleaseAdvisory | null;
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

      if (json.status === 'success' && json.data && typeof json.data === 'object') {
        const raw = json.data;
        const advisory = raw.advisory && typeof raw.advisory === 'object' ? {
          title: String(raw.advisory.title || ''),
          description: String(raw.advisory.description || ''),
          badge: raw.advisory.badge ? String(raw.advisory.badge) : undefined,
          notes: Array.isArray(raw.advisory.notes)
            ? raw.advisory.notes.map(String).filter(Boolean)
            : (typeof raw.advisory.notes === 'string' && raw.advisory.notes.trim()
                ? [raw.advisory.notes.trim()]
                : undefined),
        } : null;

        const changelog = Array.isArray(raw.changelog)
          ? raw.changelog.map((c: any) => ({
              type: (['improvement', 'fix', 'patch'].includes(c?.type) ? c.type : 'improvement') as 'improvement' | 'fix' | 'patch',
              text: String(c?.text || ''),
            }))
          : [];

        const sanitizedData: AppUpdateData = {
          latestVersion: String(raw.latestVersion || ''),
          versionCode: Number(raw.versionCode) || 0,
          forceUpdate: Boolean(raw.forceUpdate),
          releaseDate: String(raw.releaseDate || ''),
          downloadUrl: String(raw.downloadUrl || ''),
          changelog,
          advisory: (advisory && (advisory.title || advisory.description)) ? advisory : null,
        };

        return {
          status: 'success',
          data: sanitizedData,
        };
      } else {
        return {
          status: 'error',
          message: json.message || 'No updates found.',
        };
      }
    } catch (error) {
      console.error('[updateService] checkForUpdates failed:', error);
      return {
        status: 'error',
        message: 'Network error. Failed to check for updates.',
      };
    }
  },

  /**
   * Helper to check if the latest version is greater than current installed version
   */
  isUpdateAvailable(versionCode: number): boolean {
    const currentVersionCode = Constants.expoConfig?.android?.versionCode || 1;
    return versionCode > currentVersionCode;
  },
};
