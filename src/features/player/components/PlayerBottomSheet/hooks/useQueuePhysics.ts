import { useState, useEffect } from 'react';
import { useSharedValue, withSpring, cancelAnimation, useDerivedValue, runOnJS } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

export const useQueuePhysics = ({
  layoutHeight,
  insets,
  QUEUE_COLLAPSED_VISIBLE_HEIGHT,
}: {
  layoutHeight: number;
  insets: any;
  QUEUE_COLLAPSED_VISIBLE_HEIGHT: number;
}) => {
  const QUEUE_COLLAPSED_Y = Math.max(layoutHeight - QUEUE_COLLAPSED_VISIBLE_HEIGHT, 200);
  const QUEUE_HALF_Y = layoutHeight * 0.60;
  const QUEUE_EXPANDED_Y = insets.top + 70;
  const SAFE_DENOM_QUEUE = Math.max(QUEUE_COLLAPSED_Y - QUEUE_EXPANDED_Y, 1);

  const queueTranslateY = useSharedValue(QUEUE_COLLAPSED_Y);
  const queueContextY = useSharedValue(0);

  const HALF_PROGRESS = Math.min(Math.max((QUEUE_COLLAPSED_Y - QUEUE_HALF_Y) / SAFE_DENOM_QUEUE, 0), 1);

  const queueProgress = useDerivedValue(() => {
    return Math.min(Math.max((QUEUE_COLLAPSED_Y - queueTranslateY.value) / SAFE_DENOM_QUEUE, 0), 1);
  }, [QUEUE_COLLAPSED_Y, SAFE_DENOM_QUEUE]);

  const queuePanGesture = Gesture.Pan()
    .onStart(() => {
      cancelAnimation(queueTranslateY);
      queueContextY.value = queueTranslateY.value;
    })
    .onUpdate((event) => {
      let newY = queueContextY.value + event.translationY;
      if (newY > QUEUE_COLLAPSED_Y) newY = QUEUE_COLLAPSED_Y + (newY - QUEUE_COLLAPSED_Y) * 0.3;
      if (newY < QUEUE_EXPANDED_Y) newY = QUEUE_EXPANDED_Y + (newY - QUEUE_EXPANDED_Y) * 0.3;
      queueTranslateY.value = newY;
    })
    .onEnd((event) => {
      let dest = QUEUE_COLLAPSED_Y;
      if (event.velocityY < -500) {
        dest = queueTranslateY.value < QUEUE_HALF_Y ? QUEUE_EXPANDED_Y : QUEUE_HALF_Y;
      } else if (event.velocityY > 500) {
        dest = queueTranslateY.value < QUEUE_HALF_Y ? QUEUE_HALF_Y : QUEUE_COLLAPSED_Y;
      } else {
        if (queueTranslateY.value < QUEUE_HALF_Y - 50) dest = QUEUE_EXPANDED_Y;
        else if (queueTranslateY.value < QUEUE_COLLAPSED_Y - 50) dest = QUEUE_HALF_Y;
      }
      queueTranslateY.value = withSpring(dest, { damping: 25, stiffness: 250, mass: 0.5 });
    });

  return {
    queueTranslateY,
    QUEUE_COLLAPSED_Y,
    QUEUE_HALF_Y,
    QUEUE_EXPANDED_Y,
    queueProgress,
    queuePanGesture,
    HALF_PROGRESS,
  };
};
