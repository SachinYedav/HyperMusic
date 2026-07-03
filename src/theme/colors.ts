export const darkColors = {
  background: '#000000',
  surface: '#1C1C1C',
  surfaceMuted: '#282828',
  border: '#333333',
  text: '#FFFFFF',
  textMuted: '#AAAAAA',
  textSubtle: '#717171',
  brand: '#DC143C',
  brandMuted: '#4A0000',
  success: '#2ECC71',
  warning: '#F4B740',
  blue: '#3EA6FF',
  white: '#FFFFFF',
  black: '#000000',

  // Themed Transparencies
  highlight: 'rgba(255, 255, 255, 0.1)',
  highlightSubtle: 'rgba(255, 255, 255, 0.05)',
  highlightStrong: 'rgba(255, 255, 255, 0.3)',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.85)',
} as const;

export const lightColors = {
  background: '#FFFFFF',
  surface: '#F2F2F2',
  surfaceMuted: '#E5E5E5',
  border: '#CCCCCC',
  text: '#030303',
  textMuted: '#606060',
  textSubtle: '#909090',
  brand: '#DC143C', 
  brandMuted: '#FFD1D1',
  success: '#27AE60',
  warning: '#F39C12',
  blue: '#065FD4',
  white: '#FFFFFF',
  black: '#000000',

  // Themed Transparencies
  highlight: 'rgba(0, 0, 0, 0.1)',
  highlightSubtle: 'rgba(0, 0, 0, 0.04)',
  highlightStrong: 'rgba(0, 0, 0, 0.3)',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.85)',
} as const;

export type ThemeColors = Record<keyof typeof darkColors, string>;
