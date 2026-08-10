import { StyleSheet } from 'react-native';
import { spacing, radius, typography, ThemeColors } from '@/theme';

/**
 * StyleSheet generator function providing theme-aware styling definitions for the miniplayer, fullscreen player, and interactive queue sheets.
 */
export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: { position: 'absolute', top: 0, left: 0, right: 0, height: '100%', zIndex: 100, elevation: 100 },
  fullscreenContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 10, elevation: 10 },
  darkOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.overlay },

  miniPlayerContainer: {
    position: 'absolute', top: 0, left: spacing.sm, right: spacing.sm, height: 60,
    overflow: 'hidden',
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, zIndex: 5 },
  playingSource: { color: colors.white, fontSize: typography.bodyLg, fontWeight: '700', marginTop: 2 },

  songTitle: { color: colors.white, fontWeight: '800' },
  songArtist: { color: colors.white, opacity: 0.7, fontWeight: '500', marginTop: 2 },

  flexBottomSpacer: { flex: 1, justifyContent: 'flex-end' },

  queueSheetWrapper: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: 'hidden',
    zIndex: 20,
    elevation: 20,
    backgroundColor: colors.overlayLight
  },
  queueHeader: {
    paddingTop: spacing.lg, paddingHorizontal: spacing.xl, alignItems: 'center',
    backgroundColor: 'transparent'
  },
  queueScrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: 'transparent'
  }
});
