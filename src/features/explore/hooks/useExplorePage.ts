import { useQuery } from '@tanstack/react-query';
import { HyperExtractor, BrowseShelf } from 'react-native-hyper-extractor';

/**
 * React Query hook resolving explore taxonomy browse identifiers to native extractor catalog shelves.
 *
 * @param categoryId - Active browse category or raw query taxonomy string.
 */
export function useExplorePage(categoryId: string) {
  return useQuery({
    queryKey: ['explorePage', categoryId],
    queryFn: async () => {
      // Map frontend categoryId to browseId
      let browseId = '';
      if (categoryId.startsWith('FEmusic_')) {
        browseId = categoryId;
      } else {
        switch (categoryId) {
          case 'charts':
            browseId = 'FEmusic_charts';
            break;
          case 'new':
            browseId = 'FEmusic_new_releases';
            break;
          case 'moods':
            browseId = 'FEmusic_moods_and_genres';
            break;
          case 'podcasts':
            browseId = 'FEmusic_podcasts';
            break;
          default:
            throw new Error('Invalid category ID');
        }
      }

      const shelves = await HyperExtractor.getExplorePage(browseId);
      return shelves;
    },
    staleTime: 1000 * 60 * 5,
  });
}
