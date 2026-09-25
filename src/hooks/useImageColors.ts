import { useState, useEffect } from 'react';
import { getColors } from 'react-native-image-colors';
import { useTheme } from '@/theme';

interface UseImageColorsOptions {
  fallback?: string;
  cache?: boolean;
}

export interface ImagePalette {
  dominantColor: string;
  vibrantColor: string;
  darkVibrantColor: string;
  mutedColor: string;
  darkMutedColor: string;
  textContrastColor: string;
}

const getLuminance = (hexColor: string): number => {
  if (!hexColor || !hexColor.startsWith('#')) return 0;
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return 0;

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const getLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * getLinear(r) + 0.7152 * getLinear(g) + 0.0722 * getLinear(b);
};

const getSafeContrastColor = (backgroundColor: string): string => {
  return getLuminance(backgroundColor) > 0.7 ? '#000000' : '#FFFFFF';
};

/**
 * A robust, globally shared hook for extracting image colors.
 * - Centralizes URI sanitation for downloaded files (file://).
 * - Handles AppState debouncing to prevent background extraction crashes.
 * - Normalizes platform-specific color outputs.
 */
export const useImageColors = (imageUrl: string | null | undefined, options?: UseImageColorsOptions) => {
  const { colors } = useTheme();
  const defaultFallback = colors.surface;
  const fallback = options?.fallback || defaultFallback;
  const shouldCache = options?.cache ?? true;

  const defaultPalette: ImagePalette = {
    dominantColor: fallback,
    vibrantColor: fallback,
    darkVibrantColor: fallback,
    mutedColor: fallback,
    darkMutedColor: fallback,
    textContrastColor: '#FFFFFF',
  };

  const [palette, setPalette] = useState<ImagePalette>(defaultPalette);

  useEffect(() => {
    if (!imageUrl) {
      setPalette(defaultPalette);
      return;
    }

    // Sanitize URI and determine locality
    let safeArtUri = imageUrl;
    if (safeArtUri.startsWith('file:') || safeArtUri.startsWith('/')) {
      // Strip all occurrences of 'file:' and leading slashes
      let cleanPath = safeArtUri.replace(/^(file:\/*)+/, '');
      if (!cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath;
      }
      safeArtUri = `file://${cleanPath}`;
    }
    const isLocal = safeArtUri.startsWith('file://');

    // Reset to fallback while loading new color
    setPalette(defaultPalette);

    let isMounted = true;

    const fetchColors = async () => {
      try {
        const result = await getColors(safeArtUri, {
          fallback: fallback,
          cache: !isLocal && shouldCache,
          key: safeArtUri,
        });

        let newPalette: ImagePalette = { ...defaultPalette };

        if (result.platform === 'android') {
          const dom = result.dominant || result.average || fallback;
          newPalette = {
            dominantColor: dom,
            vibrantColor: result.vibrant || result.lightVibrant || fallback,
            darkVibrantColor: result.darkVibrant || result.muted || fallback,
            mutedColor: result.muted || fallback,
            darkMutedColor: result.darkMuted || fallback,
            textContrastColor: getSafeContrastColor(dom),
          };
        } else {
          // Fallback for non-Android platforms
          const safeResult = result as any;
          const dom = safeResult.dominant || safeResult.background || fallback;
          newPalette = {
            dominantColor: dom,
            vibrantColor: dom,
            darkVibrantColor: dom,
            mutedColor: dom,
            darkMutedColor: dom,
            textContrastColor: getSafeContrastColor(dom),
          };
        }

        if (isMounted) {
          setPalette(newPalette);
        }
      } catch (e) {
        console.warn('[useImageColors] Extraction failed for:', safeArtUri, e);
        if (isMounted) setPalette(defaultPalette);
      }
    };

    fetchColors();

    return () => {
      isMounted = false;
    };
  }, [imageUrl, fallback, shouldCache]);

  return palette;
};
