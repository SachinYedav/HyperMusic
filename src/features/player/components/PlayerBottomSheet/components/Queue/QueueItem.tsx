import React, { memo, useCallback } from 'react';
import { View, Text, TouchableHighlight, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Menu } from 'lucide-react-native';
import { usePlayerStore } from '@/store';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { PremiumImage } from '@/ui/PremiumImage';
import { AnimatedEQ } from '@/ui/AnimatedEQ';
import { darkColors } from '@/theme/colors';
import { spacing, typography, radius } from '@/theme';

/**
 * Renders an individual track item within the interactive queue.
 * Supports drag-and-drop reordering when a drag handler is provided.
 */
export const QueueItemComponent = memo(({ track, isPlayingItem, themeColors, drag, isActive }: { track: any, isPlayingItem: boolean, themeColors: any, drag?: () => void, isActive?: boolean }) => {
  const handlePress = useCallback(() => {
    if (!isPlayingItem) {
      const state = usePlayerStore.getState();
      const currentIndex = state.queue.findIndex((t: any) => t.id === track.id);
      state.playList(state.queue, currentIndex !== -1 ? currentIndex : 0, state.isShuffle);
    }
  }, [track.id, isPlayingItem]);

  return (
    <TouchableHighlight
      underlayColor={themeColors.brand + '18'}
      onPress={handlePress}
      onLongPress={() => useActionSheetStore.getState().openSheet('track', track, { isQueueItem: true })}
      disabled={isActive}
    >
      <View style={[styles.queueItem, isActive && { backgroundColor: themeColors.brand + '18' }]}>
        <View style={styles.queueArtContainer}>
          <PremiumImage 
            source={track.artwork} 
            contextType="track" 
            style={styles.queueArt} 
            fallbackIconSize={20} 
          />
          {isPlayingItem && <AnimatedEQ isOverlay />}
        </View>
        <View style={styles.queueItemInfo}>
          <Text style={[styles.queueItemTitle, isPlayingItem && styles.activeQueueItemTitle]} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.queueItemArtist} numberOfLines={1}>{track.artist}</Text>
        </View>
        {drag ? (
          <TouchableOpacity onPressIn={drag} activeOpacity={0.7} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <View style={{ opacity: isActive ? 1 : 0.4, paddingVertical: 12, paddingHorizontal: 14 }}>
              <Menu color={isActive ? themeColors.brand : darkColors.white} size={20} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ opacity: 0.15, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Menu color={darkColors.white} size={20} />
          </View>
        )}
      </View>
    </TouchableHighlight>
  );
}, (prevProps, nextProps) => {
  return prevProps.track.id === nextProps.track.id &&
    prevProps.isPlayingItem === nextProps.isPlayingItem &&
    prevProps.isActive === nextProps.isActive &&
    !!prevProps.drag === !!nextProps.drag;
});

const styles = StyleSheet.create({
  queueItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  queueArtContainer: { width: 48, height: 48, borderRadius: radius.xs, overflow: 'hidden' },
  queueArt: { width: '100%', height: '100%' },
  queueItemInfo: { flex: 1, marginLeft: spacing.md },
  queueItemTitle: { color: darkColors.white, opacity: 0.6, fontSize: typography.body, fontWeight: '500' },
  activeQueueItemTitle: { color: darkColors.brand, fontSize: typography.body, fontWeight: '700' },
  queueItemArtist: { color: darkColors.white, opacity: 0.4, fontSize: typography.captionLg, marginTop: 3 },
});
