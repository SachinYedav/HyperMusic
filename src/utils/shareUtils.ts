import { Share } from 'react-native';
import { useToastStore } from '@/store/useToastStore';
type ShareType = 'track' | 'playlist' | 'artist' | 'album' | 'podcast' | 'podcast_episode';

export const shareContent = async (type: ShareType, id: string, name: string) => {
  let url = '';

  // Generate official music.youtube.com URLs
  switch (type) {
    case 'track':
      url = `https://music.youtube.com/watch?v=${id}`;
      break;
    case 'playlist':
      url = `https://music.youtube.com/playlist?list=${id}`;
      break;
    case 'artist':
      url = `https://music.youtube.com/channel/${id}`;
      break;
    case 'album':
      url = `https://music.youtube.com/playlist?list=${id}`; // Albums often use the playlist endpoint
      break;
    case 'podcast':
      url = `https://music.youtube.com/podcast/${id}`;
      break;
    case 'podcast_episode':
      url = `https://music.youtube.com/watch?v=${id}`;
      break;
    default:
      url = `https://music.youtube.com`;
  }

  try {
    const result = await Share.share({
      message: `Listen to ${name} on YouTube Music: ${url}`,
      url: url, // iOS native share
      title: name, // Android native share
    });

    if (result.action === Share.sharedAction) {
      if (result.activityType) {
        // shared with activity type of result.activityType
      } else {
        // shared
      }
    } else if (result.action === Share.dismissedAction) {
      // dismissed
    }
  } catch (error: any) {
    useToastStore.getState().showToast('Failed to share content', 'error');
    console.error('Share Error:', error.message);
  }
};
