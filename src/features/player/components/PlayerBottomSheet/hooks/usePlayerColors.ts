import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { getColors } from 'react-native-image-colors';
import { usePlayerStore } from '../../../store/usePlayerStore';
import { Track } from '@/types';

const PLAYER_FALLBACK_BG = '#121212';

export const usePlayerColors = (activeTrack: Track | null) => {
  const [bgColor, setBgColor] = useState<string>(PLAYER_FALLBACK_BG);

  useEffect(() => {
    const art = activeTrack?.artwork;
    const trackId = activeTrack?.id;
    if (!art || !trackId) {
      setBgColor(PLAYER_FALLBACK_BG);
      return;
    }

    // 1. Instant Cache Retrieval
    const cachedColor = usePlayerStore.getState().colorCache[trackId];
    if (cachedColor) {
      setBgColor(cachedColor);
      return;
    }

    // 2. AppState De-bouncing
    if (AppState.currentState === 'background') {
      return;
    }

    const fetchColors = async () => {
      try {
        const result = await getColors(art, {
          fallback: PLAYER_FALLBACK_BG,
          cache: true,
          key: art,
        });
        
        let extractedColor: string = PLAYER_FALLBACK_BG;
        if (result.platform === 'android') extractedColor = result.average || PLAYER_FALLBACK_BG;
        else if (result.platform === 'ios') extractedColor = result.background || PLAYER_FALLBACK_BG;
        else extractedColor = result.dominant || PLAYER_FALLBACK_BG;

        setBgColor(extractedColor);
        usePlayerStore.getState().setColorCache(trackId, extractedColor);
      } catch (e) {
        setBgColor(PLAYER_FALLBACK_BG);
      }
    };

    const scheduleIdle = window.requestIdleCallback || ((cb: any) => setTimeout(cb, 0));
    const cancelIdle = window.cancelIdleCallback || ((id: any) => clearTimeout(id));

    const handle = scheduleIdle(() => {
      fetchColors();
    });

    return () => cancelIdle(handle);
  }, [activeTrack?.artwork, activeTrack?.id]);

  return bgColor;
};
