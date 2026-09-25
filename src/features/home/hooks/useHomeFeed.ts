import { useQuery } from '@tanstack/react-query';
import { BrowseShelf } from 'react-native-hyper-extractor';
import { extractorService } from '@/services/api/extractorService';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { getRecentPlays, getHeavyRotation } from '@/features/library/services/historyService';
import { getLikedTracks, getAllPlaylistsWithTrackCount, getPlaylistTracks, getAllAlbumsWithTrackCount, getAlbumTracks } from '@/database/queries';
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

        let quickPreviewShelf: BrowseShelf | null = null;
        try {
          if (db) {
            const quickPicks = [];
            // 1. Liked Songs
            const likedTracks = await getLikedTracks(db);
            if (likedTracks.length > 0) {
              quickPicks.push({
                id: 'liked_songs',
                title: 'Liked Songs',
                subtitle: '',
                type: 'liked',
                artworkUrl: likedTracks[0].artworkUrl || null,
                items: likedTracks.slice(0, 4),
              });
            }

            // 2. Most Recent Playlist
            const playlists = await getAllPlaylistsWithTrackCount(db);
            if (playlists.length > 0) {
              const topPlaylist = playlists[0];
              const playlistTracks = await getPlaylistTracks(db, topPlaylist.id);
              if (playlistTracks.length > 0) {
                quickPicks.push({
                  id: topPlaylist.id,
                  title: topPlaylist.name,
                  subtitle: '',
                  type: 'playlist',
                  artworkUrl: topPlaylist.coverUrl || playlistTracks[0].artworkUrl || null,
                  items: playlistTracks.slice(0, 4),
                });
              }
            }

            // 3. Most Recent Album
            const albums = await getAllAlbumsWithTrackCount(db);
            if (albums.length > 0) {
              const topAlbum = albums[0];
              const albumTracks = await getAlbumTracks(db, topAlbum.id);
              if (albumTracks.length > 0) {
                quickPicks.push({
                  id: topAlbum.id,
                  title: topAlbum.title,
                  subtitle: '',
                  type: 'album',
                  artworkUrl: topAlbum.coverUrl || albumTracks[0].artworkUrl || null,
                  items: albumTracks.slice(0, 4),
                });
              }
            }

            if (quickPicks.length > 0) {
              quickPreviewShelf = {
                title: 'Quick Previews',
                type: 'quick_preview_carousel',
                items: quickPicks.slice(0, 3) as any[]
              };
            }
          }
        } catch (e) {
          console.warn('Non-fatal: Failed to load quick previews', e);
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

        if (quickPreviewShelf) {
          feed.shelves.splice(2, 0, quickPreviewShelf);
        }

        if (extraLanguageShelves.length > 0) {
          const insertIndex = quickPreviewShelf ? 3 : 2;
          feed.shelves.splice(insertIndex, 0, ...extraLanguageShelves);
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
