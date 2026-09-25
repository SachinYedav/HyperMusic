import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { interpolate, Extrapolation, useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { ListMusic } from 'lucide-react-native';
import { darkColors } from '@/theme/colors';
import { spacing, typography } from '@/theme';
import { useSettingsStore, usePlayerStore } from '@/store';

/**
 * Header for the queue section, containing the "Playing from" label and the toggle button
 * to open or close the queue sheet.
 */
export const QueueHeaderComponent = memo(({ onToggleQueue, queueProgress, brandColor, textContrastColor }: { onToggleQueue: () => void, queueProgress: SharedValue<number>, brandColor: string, textContrastColor: string }) => {
  const queueBtnInactive = useAnimatedStyle(() => ({ opacity: interpolate(queueProgress.value, [0, 0.1], [1, 0], Extrapolation.CLAMP), position: 'absolute' }));
  const queueBtnActive = useAnimatedStyle(() => ({ opacity: interpolate(queueProgress.value, [0, 0.1], [0, 1], Extrapolation.CLAMP), position: 'absolute' }));

  return (
    <>
      <View style={styles.queueDragBar} />
      <View style={[styles.queueHeaderRow, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View>
            <Text style={[styles.playingFrom, { color: textContrastColor }]}>Playing from</Text>
            <Text style={[styles.playingSource, { color: textContrastColor }]}>Your Queue</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onToggleQueue} style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Animated.View style={queueBtnInactive}>
            <ListMusic color={textContrastColor} size={24} />
          </Animated.View>
          <Animated.View style={queueBtnActive}>
            <ListMusic color={brandColor} size={24} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
});

/**
 * Header for the Auto-Play section, explaining the feature and providing a toggle switch
 * to enable or disable infinite playback.
 */
export const AutoPlayHeaderComponent = memo(({ brandColor }: { brandColor: string }) => {
  const autoplay = useSettingsStore(state => state.autoplay);
  const setAutoplay = useSettingsStore(state => state.setAutoplay);

  return (
    <View style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={[styles.playingFrom, { color: brandColor }]}>Auto-Play</Text>
          <Text style={[styles.playingSource, { marginTop: 2 }]}>Add similar content for endless listening</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            const nextVal = !autoplay;
            setAutoplay(nextVal);
            usePlayerStore.getState().toggleAutoPlayVisibility(nextVal);
          }}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            backgroundColor: autoplay ? brandColor : 'rgba(255,255,255,0.2)',
            padding: 2,
            justifyContent: 'center'
          }}
        >
          <View style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: darkColors.white,
            transform: [{ translateX: autoplay ? 20 : 0 }]
          }} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  queueDragBar: { width: 40, height: 4, backgroundColor: darkColors.textMuted, borderRadius: 2, marginBottom: spacing.lg },
  queueHeaderRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  playingFrom: { color: darkColors.white, opacity: 0.6, fontSize: typography.captionLg },
  playingSource: { color: darkColors.white, fontSize: typography.bodyLg, fontWeight: '700', marginTop: 2 },
});
