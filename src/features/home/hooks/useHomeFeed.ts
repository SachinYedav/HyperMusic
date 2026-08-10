import { useQuery } from '@tanstack/react-query';
import { BrowseShelf } from 'react-native-hyper-extractor';
import { extractorService } from '@/services/api/extractorService';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { getRecentPlays, getHeavyRotation } from '@/features/library/services/historyService';
import { usePreferencesStore } from '@/store';

/**
 * React Query hook orchestrating dynamic home feed resolution, user language preference injection, and local playback history aggregation.
 *
 * @param selectedFilter - Active category taxonomy query parameter.
 */
export function useHomeFeed(selectedFilter: string = 'All') {
  const db = useSafeDatabase();
  const { selectedLanguages } = usePreferencesStore();

  return useQuery({
    queryKey: ['homeFeed', selectedFilter, selectedLanguages],
    queryFn: async ({ signal }) => {
      try {
        if (selectedFilter !== 'All') {
          if (selectedFilter === 'New') {
            const shelves = await extractorService.getExplorePage('FEmusic_new_releases', { signal });
            return { shelves };
          } else if (selectedFilter === 'Podcasts') {
            const shelves = await extractorService.getExplorePage('FEmusic_podcasts', { signal });
            return { shelves };
          } else {
            const shelves = await extractorService.getDynamicChipFeed(selectedFilter, { signal });
            return { shelves };
          }
        }

        const topLang = (selectedLanguages && selectedLanguages.length > 0) ? selectedLanguages[0] : null;

        // Fetch sequentially to prevent JSI/React Native bridge choke on heavy extraction
        const feed = await extractorService.getHomeFeed({ signal });

        let recentPlays: any[] = [];
        try {
          if (db) recentPlays = await getRecentPlays(db, 20);
        } catch (e) {
          console.warn('Non-fatal: Failed to load recent plays', e);
        }

        let jumpBackInShelf: BrowseShelf | null = null;
        if (recentPlays.length >= 1) {
          jumpBackInShelf = {
            title: 'Jump Back In',
            type: 'list',
            items: recentPlays
          };
        }

        let heavyRotation: any[] = [];
        try {
          if (db) heavyRotation = await getHeavyRotation(db, 20);
        } catch (e) {
          console.warn('Non-fatal: Failed to load heavy rotation', e);
        }

        let heavyRotationShelf: BrowseShelf | null = null;
        if (heavyRotation.length >= 1) {
          heavyRotationShelf = {
            title: 'Your Heavy Rotation',
            type: 'carousel',
            items: heavyRotation
          };
        }

        let langResult: any[] = [];
        if (topLang) {
          try {
            langResult = await extractorService.getDynamicChipFeed(topLang, { signal });
          } catch (e) {
            console.warn('Failed to fetch extra language shelves', e);
          }
        }

        let extraLanguageShelves: BrowseShelf[] = [];
        if (langResult.length > 0) {
          const musicalShelves = langResult.filter((s: BrowseShelf) =>
            s.items && s.items.length > 0 &&
            s.items.some((item: any) => item.type === 'song' || item.type === 'video' || item.type === 'artist' || item.type === 'podcast')
          );
          extraLanguageShelves = (musicalShelves.length > 0 ? musicalShelves : langResult.filter((s: BrowseShelf) => s.items && s.items.length > 0)).slice(0, 1);
        }

        if (jumpBackInShelf) {
          feed.shelves.unshift(jumpBackInShelf);
        }

        if (extraLanguageShelves.length > 0) {
          feed.shelves.splice(2, 0, ...extraLanguageShelves);
        }

        if (heavyRotationShelf) {
          feed.shelves.push(heavyRotationShelf);
        }

        return feed;
      } catch (error) {
        console.error('Failed to fetch home feed', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}
