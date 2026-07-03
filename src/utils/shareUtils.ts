import { Share, Alert } from 'react-native';

type ShareType = 'track' | 'playlist' | 'artist' | 'album';

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
    default:
      url = `https://music.youtube.com`;
  }

  try {
    const result = await Share.share({
      message: `Listen to ${name} on HyperMusic: ${url}`,
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
    Alert.alert('Error', 'Failed to share content');
    console.error('Share Error:', error.message);
  }
};
