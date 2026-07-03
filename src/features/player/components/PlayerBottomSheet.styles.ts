import { StyleSheet } from 'react-native';
import { spacing, radius, typography, ThemeColors } from '@/theme';
import { darkColors } from '@/theme/colors';

/**
 * StyleSheet generator function providing theme-aware styling definitions for the miniplayer, fullscreen player, and interactive queue sheets.
 */
export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: { position: 'absolute', top: 0, left: 0, right: 0, height: '100%', zIndex: 100, elevation: 100 },

  miniPlayerContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 64,
    backgroundColor: colors.surface, overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  miniPlayerInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
  },
  miniArt: { width: 44, height: 44, borderRadius: radius.sm },
  miniInfo: { flex: 1, flexShrink: 1, marginLeft: spacing.md, marginRight: spacing.sm, justifyContent: 'center', overflow: 'hidden' },
  miniTitle: { fontSize: typography.body, fontWeight: '700', letterSpacing: -0.2, color: colors.text },
  miniArtist: { fontSize: typography.captionLg, marginTop: 1, color: colors.textMuted },
  miniBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.xs },
  miniProgressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: colors.border },
  miniProgressFill: { width: '35%', height: '100%', backgroundColor: colors.brand },

  fullscreenContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  darkOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.overlay },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, zIndex: 5 },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  tabPills: { flexDirection: 'row', backgroundColor: darkColors.highlight, borderRadius: radius.xl, padding: spacing.xs },
  tabPillActive: { backgroundColor: darkColors.highlightStrong, paddingVertical: 6, paddingHorizontal: spacing.md, minWidth: 56, alignItems: 'center', borderRadius: radius.lg },
  tabPillInactive: { paddingVertical: 6, paddingHorizontal: spacing.md, minWidth: 56, alignItems: 'center' },
  tabPillText: { color: colors.white, fontSize: typography.bodySm, fontWeight: '700' },

  songTitle: { color: colors.white, fontWeight: '800' },
  songArtist: { color: colors.white, opacity: 0.7, fontWeight: '500', marginTop: 2 },

  flexBottomSpacer: { flex: 1, justifyContent: 'flex-end', paddingBottom: 140 },
  chipsScroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.lg, gap: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: darkColors.highlight, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.xl, gap: spacing.sm },
  chipText: { color: colors.white, fontSize: typography.bodySm, fontWeight: '600' },

  timelineContainer: { paddingHorizontal: spacing.xl },
  trackBar: { height: 3, backgroundColor: darkColors.highlightStrong, borderRadius: 2 },
  trackFill: { width: '30%', height: '100%', backgroundColor: colors.white, borderRadius: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  timeLabel: { color: colors.white, opacity: 0.5, fontSize: typography.caption, fontWeight: '500' },

  playbackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  playCircle: { width: 68, height: 68, backgroundColor: colors.white, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center' },

  queueSheetWrapper: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: 'hidden',
    zIndex: 20,
    backgroundColor: colors.overlayLight
  },
  queueHeader: {
    paddingTop: spacing.lg, paddingHorizontal: spacing.xl, alignItems: 'center',
    backgroundColor: 'transparent'
  },
  queueDragBar: { width: 40, height: 4, backgroundColor: darkColors.textMuted, borderRadius: 2, marginBottom: spacing.lg },
  queueHeaderRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  playingFrom: { color: colors.white, opacity: 0.6, fontSize: typography.captionLg },
  playingSource: { color: colors.white, fontSize: typography.bodyLg, fontWeight: '700', marginTop: 2 },

  queueScrollView: { flex: 1 },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1,
    backgroundColor: 'transparent'
  },
  queueItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  queueArtContainer: { width: 48, height: 48, borderRadius: radius.xs, overflow: 'hidden' },
  queueArt: { width: '100%', height: '100%' },
  queueItemInfo: { flex: 1, marginLeft: spacing.md },
  queueItemTitle: { color: colors.white, opacity: 0.6, fontSize: typography.body, fontWeight: '500' },
  activeQueueItemTitle: { color: colors.brand, fontSize: typography.body, fontWeight: '700' },
  queueItemArtist: { color: colors.white, opacity: 0.4, fontSize: typography.captionLg, marginTop: 3 },
});
