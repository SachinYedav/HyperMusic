import { useQuery } from '@tanstack/react-query';
import { BrowseItem } from 'react-native-hyper-extractor';
import { extractorService } from '@/services/api/extractorService';

/**
 * React Query hook dispatching raw textual queries to the native hyper extractor search resolver.
 *
 * @param query - Input string to resolve against catalog indexes.
 */
export function useNativeSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async ({ signal }): Promise<BrowseItem[]> => {
      if (!query.trim()) return [];
      const results = await extractorService.searchTracks(query, { signal });
      return results as BrowseItem[];
    },
    enabled: !!query.trim(),
    staleTime: 1000 * 60 * 5,
  });
}
