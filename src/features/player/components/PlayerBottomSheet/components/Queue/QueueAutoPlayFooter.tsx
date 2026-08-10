import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePlayerStore, useSettingsStore } from '@/store';
import { QueueItemComponent } from './QueueItem';
import { AutoPlayHeaderComponent } from './QueueHeader';
import { darkColors } from '@/theme/colors';
import { typography } from '@/theme';

interface QueueAutoPlayFooterProps {
  autoPlayQueue: any[];
  activeTrack: any;
  themeColors: any;
  styles: any;
  queueFooterStyle: any;
}

export const QueueAutoPlayFooter = memo(({
  autoPlayQueue,
  activeTrack,
  themeColors,
  styles,
  queueFooterStyle
}: QueueAutoPlayFooterProps) => {
  const { autoPlayPool, autoPlayError, isAutoPlayLoading, implicitStartIndex, queue } = usePlayerStore();
  const autoplay = useSettingsStore().autoplay;

  const isQueueMissingAutoPlay = implicitStartIndex !== -1 && queue.length === implicitStartIndex;

  return (
    <View>
      {(isQueueMissingAutoPlay || autoPlayQueue.length > 0) && (
        <AutoPlayHeaderComponent brandColor={themeColors.brand} />
      )}

      {autoPlayQueue.map((item) => (
        <QueueItemComponent
          key={(item as any)._queueId || item.id}
          track={item}
          isPlayingItem={activeTrack?.id === item.id}
          themeColors={themeColors}
          drag={undefined} // Immutable in Auto-Play
        />
      ))}

      {autoPlayError && autoplay && (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={[styles.playingSource, { color: '#ff4444', marginBottom: 8 }]}>Failed to load more tracks</Text>
          <TouchableOpacity
            onPress={() => usePlayerStore.getState().loadMoreAutoPlayTracks()}
            style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 }}
          >
            <Text style={{ color: darkColors.white, fontSize: typography.body }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {autoplay && (autoPlayPool.length > 0 || isAutoPlayLoading) && !autoPlayError && (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator color={themeColors.brand} size="small" />
        </View>
      )}

      {/* Dynamic mathematical spacer to compensate for off-screen translation */}
      <Animated.View style={queueFooterStyle} />
    </View>
  );
});
