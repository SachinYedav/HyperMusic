import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@/navigation/types';
import licensesData from '@/assets/data/licenses.json';

export interface LicenseEntry {
  id: string;
  name: string;
  version: string;
  licenseType: string;
  publisher: string;
  repository: string;
  licenseText: string;
}

/**
 * Encapsulates all logic for the open-source licenses screens.
 * - Sorts GPL entries to the top (they require active legal compliance).
 * - Provides pre-computed stats (totalCount, gplCount) for the header subtitle.
 * - Exposes a typed `openDetail` action so the list screen stays purely presentational.
 */
export function useLicenses() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const isGPL = (type: string) => {
    const upper = (type || '').toUpperCase();
    return upper.includes('GPL') || upper.includes('GNU') || upper.includes('GENERAL PUBLIC LICENSE');
  };

  const sortedLicenses = useMemo<LicenseEntry[]>(() => {
    const all = licensesData as LicenseEntry[];
    const gpl = all.filter(l => isGPL(l.licenseType));
    const rest = all.filter(l => !isGPL(l.licenseType));
    return [...gpl, ...rest];
  }, []);

  const totalCount = sortedLicenses.length;
  const gplCount = sortedLicenses.filter(l => isGPL(l.licenseType)).length;

  const openDetail = (item: LicenseEntry) => {
    navigation.navigate('LicenseDetail', {
      licenseId: item.id,
      licenseName: item.name,
      licenseVersion: item.version,
      licenseText: item.licenseText,
      repository: item.repository,
      publisher: item.publisher ?? 'Community',
      licenseType: item.licenseType,
    });
  };

  return { sortedLicenses, totalCount, gplCount, openDetail };
}
