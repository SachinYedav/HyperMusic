import React, { memo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChevronDown, MoreVertical } from 'lucide-react-native';
import { darkColors } from '@/theme/colors';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { spacing, radius, typography } from '@/theme';
import { useTheme } from '@/theme';

/**
 * The top bar of the fullscreen player view.
 * Contains the collapse chevron and the Song/Video toggle pills.
 */
export const TopBarComponent = memo(({ onCollapse, activeTrack, isVideoMode, setIsVideoMode }: { onCollapse: () => void, activeTrack: any, isVideoMode: boolean, setIsVideoMode: (val: boolean) => void }) => {
  const { colors } = useTheme();
  return (
    <>
      <TouchableOpacity onPress={onCollapse} hitSlop={12}>
        <ChevronDown color={darkColors.white} size={32} />
      </TouchableOpacity>

      <View style={styles.tabPills}>
        <TouchableOpacity
          style={!isVideoMode ? styles.tabPillActive : styles.tabPillInactive}
          onPress={() => setIsVideoMode(false)}
        >
          <Text style={[styles.tabPillText, isVideoMode && { opacity: 0.6 }]}>Song</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={isVideoMode ? styles.tabPillActive : styles.tabPillInactive}
          onPress={() => setIsVideoMode(true)}
        >
          <Text style={[styles.tabPillText, !isVideoMode && { opacity: 0.6 }]}>Video</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.topBarRight}>
        <TouchableOpacity hitSlop={8} onPress={() => {
          if (activeTrack) useActionSheetStore.getState().openSheet('track', activeTrack, { isCurrentlyPlaying: true, isQueueItem: true });
        }}>
          <MoreVertical color={darkColors.white} size={22} />
        </TouchableOpacity>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  tabPills: { flexDirection: 'row', backgroundColor: darkColors.highlight, borderRadius: radius.xl, padding: spacing.xs },
  tabPillActive: { backgroundColor: darkColors.highlightStrong, paddingVertical: 6, paddingHorizontal: spacing.md, minWidth: 56, alignItems: 'center', borderRadius: radius.lg },
  tabPillInactive: { paddingVertical: 6, paddingHorizontal: spacing.md, minWidth: 56, alignItems: 'center' },
  tabPillText: { color: darkColors.white, fontSize: typography.bodySm, fontWeight: '700', paddingHorizontal: 4 },
});
