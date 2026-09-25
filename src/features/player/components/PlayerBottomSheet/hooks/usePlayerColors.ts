import { useState, useEffect } from 'react';
import { Track } from '@/types';
import { useImageColors, ImagePalette } from '@/hooks/useImageColors';
import { usePlayerStore } from '../../../store/usePlayerStore';

const PLAYER_FALLBACK_BG = '#121212';
const FALLBACK_PALETTE: ImagePalette = {
  dominantColor: PLAYER_FALLBACK_BG,
  vibrantColor: PLAYER_FALLBACK_BG,
  darkVibrantColor: PLAYER_FALLBACK_BG,
  mutedColor: PLAYER_FALLBACK_BG,
  darkMutedColor: PLAYER_FALLBACK_BG,
  textContrastColor: '#FFFFFF',
};

export const usePlayerColors = (activeTrack: Track | null): ImagePalette => {
  const trackId = activeTrack?.id;
  const cachedPalette = trackId ? usePlayerStore.getState().colorCache[trackId] : undefined;

  const [palette, setPalette] = useState<ImagePalette>(cachedPalette || FALLBACK_PALETTE);

  const extractedPalette = useImageColors(!cachedPalette ? activeTrack?.artwork : null, {
    fallback: PLAYER_FALLBACK_BG,
    cache: false,
  });

  useEffect(() => {
    if (cachedPalette) {
      setPalette(cachedPalette);
    } else if (extractedPalette.dominantColor !== PLAYER_FALLBACK_BG && trackId) {
      setPalette(extractedPalette);
      usePlayerStore.getState().setColorCache(trackId, extractedPalette);
    } else {
      setPalette(extractedPalette);
    }
  }, [extractedPalette, cachedPalette, trackId]);

  return palette;
};
