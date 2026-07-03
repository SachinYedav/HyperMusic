import { useQuery } from '@tanstack/react-query';
import { HyperExtractor, BrowseItem } from 'react-native-hyper-extractor';

/**
 * React Query hook dispatching raw textual queries to the native hyper extractor search resolver.
 *
 * @param query - Input string to resolve against catalog indexes.
 */
export function useNativeSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async (): Promise<BrowseItem[]> => {
      if (!query.trim()) return [];
      const results = await HyperExtractor.search(query);
      return results;
    },
    enabled: !!query.trim(),
    staleTime: 1000 * 60 * 5,
  });
}
