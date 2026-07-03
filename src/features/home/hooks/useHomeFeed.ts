import { useQuery } from '@tanstack/react-query';
import { HyperExtractor, BrowseShelf } from 'react-native-hyper-extractor';
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
    queryFn: async () => {
      try {
        if (selectedFilter !== 'All') {
          if (selectedFilter === 'New') {
            const shelves = await HyperExtractor.getExplorePage('FEmusic_new_releases');
            return { shelves };
          } else if (selectedFilter === 'Podcasts') {
            const shelves = await HyperExtractor.getExplorePage('FEmusic_podcasts');
            return { shelves };
          } else {
            const shelves = await HyperExtractor.getDynamicChipFeed(selectedFilter);
            return { shelves };
          }
        }

        const feed = await HyperExtractor.getHomeFeed();
        
        // Fetch recent playback history for top-of-feed placement
        let recentPlays: any[] = [];
        if (db) {
          try {
            recentPlays = await getRecentPlays(db, 10);
          } catch (e) {
            console.warn('Non-fatal: Failed to load recent plays', e);
          }
        }
        let jumpBackInShelf: BrowseShelf | null = null;
        if (recentPlays.length >= 1) {
          jumpBackInShelf = {
            title: 'Jump Back In',
            type: 'list',
            items: recentPlays
          };
        }
        
        // Fetch heavy rotation history for dynamic middle injection
        let heavyRotation: any[] = [];
        if (db) {
          try {
            heavyRotation = await getHeavyRotation(db, 10);
          } catch (e) {
            console.warn('Non-fatal: Failed to load heavy rotation', e);
          }
        }
        let heavyRotationShelf: BrowseShelf | null = null;
        if (heavyRotation.length >= 1) {
          heavyRotationShelf = {
            title: 'Your Heavy Rotation',
            type: 'carousel',
            items: heavyRotation
          };
        }

        // Fetch user-preferred language shelves for personalized injection
        let extraLanguageShelves: BrowseShelf[] = [];
        if (selectedLanguages && selectedLanguages.length > 0) {
          try {
            const topLang = selectedLanguages[0];
            const langResult = await HyperExtractor.getDynamicChipFeed(topLang);
            if (langResult && langResult.length > 0) {
              const musicalShelves = langResult.filter(s => 
                s.items && s.items.length > 0 && 
                s.items.some(item => item.type === 'song' || item.type === 'video' || item.type === 'artist' || item.type === 'podcast')
              );
              extraLanguageShelves = (musicalShelves.length > 0 ? musicalShelves : langResult.filter(s => s.items && s.items.length > 0)).slice(0, 1);
            }
          } catch (e) {
            console.warn('Failed to fetch extra language shelves for richer injection', e);
          }
        }
        
        // Inject extra language shelves at primary prominent position (index 1)
        if (extraLanguageShelves.length > 0) {
          feed.shelves.splice(1, 0, ...extraLanguageShelves);
        }

        // Inject heavy rotation at a randomized index for dynamic catalog display
        if (heavyRotationShelf) {
           if (feed.shelves.length > 2) {
             const minIdx = 2;
             const maxIdx = feed.shelves.length;
             const randomIdx = Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;
             feed.shelves.splice(randomIdx, 0, heavyRotationShelf);
           } else {
             feed.shelves.push(heavyRotationShelf);
           }
        }
        
        // Ensure recent plays maintain absolute top placement (index 0)
        if (jumpBackInShelf) {
           feed.shelves.unshift(jumpBackInShelf);
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
