import { useEffect } from 'react';
import { useSharedValue, withSpring, cancelAnimation, useDerivedValue, runOnJS } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { usePlayerStore } from '../../../store/usePlayerStore';

export const usePlayerPhysics = ({
  layoutHeight,
  bottomTabBarHeight,
  MINI_PLAYER_HEIGHT,
  MINI_PLAYER_BOTTOM_MARGIN,
  queueTranslateY,
  QUEUE_COLLAPSED_Y,
  isMiniPlayerVisible,
}: {
  layoutHeight: number;
  bottomTabBarHeight: number;
  MINI_PLAYER_HEIGHT: number;
  MINI_PLAYER_BOTTOM_MARGIN: number;
  queueTranslateY: any;
  QUEUE_COLLAPSED_Y: number;
  isMiniPlayerVisible: boolean;
}) => {
  const ACTIVE_MINIPLAYER_Y = Math.max(layoutHeight - bottomTabBarHeight - MINI_PLAYER_HEIGHT - MINI_PLAYER_BOTTOM_MARGIN, 100);
  // If not visible, physically push the sheet completely off the bottom of the screen
  const MINIPLAYER_Y = isMiniPlayerVisible ? ACTIVE_MINIPLAYER_Y : layoutHeight + 100;

  const FULLSCREEN_Y = 0;
  const SAFE_DENOM_MAIN = Math.max(MINIPLAYER_Y - FULLSCREEN_Y, 1);

  const translateY = useSharedValue(MINIPLAYER_Y);
  const contextY = useSharedValue(0);

  const isExpanded = usePlayerStore((state) => state.isExpanded);
  const setExpanded = usePlayerStore((state) => state.setExpanded);
  const expandPlayerSignal = usePlayerStore((state) => state.expandPlayerSignal);
  const collapsePlayerSignal = usePlayerStore((state) => state.collapsePlayerSignal);

  // Sync translateY when screen dimensions or safe area insets stabilize
  useEffect(() => {
    // If the sheet is intended to be expanded, snap to FULLSCREEN_Y
    if (isExpanded) {
      translateY.value = withSpring(FULLSCREEN_Y, { damping: 25, stiffness: 250, mass: 0.5 });
    } else {
      // Otherwise, snap to MINIPLAYER_Y safely to accommodate safe area shifts
      translateY.value = withSpring(MINIPLAYER_Y, { damping: 25, stiffness: 250, mass: 0.5 });
    }
  }, [MINIPLAYER_Y, FULLSCREEN_Y, isExpanded]);

  // Auto-Expand Effect
  useEffect(() => {
    if (expandPlayerSignal > 0 && translateY.value !== FULLSCREEN_Y) {
      translateY.value = withSpring(FULLSCREEN_Y, { damping: 25, stiffness: 250, mass: 0.5 });
      setExpanded(true);
    }
  }, [expandPlayerSignal, setExpanded]);

  // Auto-Collapse Effect (Global Navigation Sync)
  useEffect(() => {
    if (collapsePlayerSignal > 0) {
      if (queueTranslateY.value !== QUEUE_COLLAPSED_Y) {
        queueTranslateY.value = withSpring(QUEUE_COLLAPSED_Y, { damping: 25, stiffness: 250, mass: 0.5 });
      }
      setExpanded(false);
    }
  }, [collapsePlayerSignal, setExpanded, QUEUE_COLLAPSED_Y, queueTranslateY]);

  const progress = useDerivedValue(() => {
    return Math.min(Math.max((MINIPLAYER_Y - translateY.value) / SAFE_DENOM_MAIN, 0), 1);
  }, [MINIPLAYER_Y, SAFE_DENOM_MAIN]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-10, 10])
    .onStart(() => {
      cancelAnimation(translateY);
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      let newY = contextY.value + event.translationY;
      if (newY > MINIPLAYER_Y) newY = MINIPLAYER_Y + (newY - MINIPLAYER_Y) * 0.3;
      if (newY < FULLSCREEN_Y) newY = FULLSCREEN_Y + (newY - FULLSCREEN_Y) * 0.3;
      translateY.value = newY;
    })
    .onEnd((event) => {
      const dest = event.velocityY > 500 || (event.velocityY > -500 && translateY.value > MINIPLAYER_Y / 2)
        ? MINIPLAYER_Y : FULLSCREEN_Y;
      translateY.value = withSpring(dest, { damping: 25, stiffness: 250, mass: 0.5 });
      runOnJS(setExpanded)(dest === FULLSCREEN_Y);

      if (dest === MINIPLAYER_Y) {
        queueTranslateY.value = withSpring(QUEUE_COLLAPSED_Y, { damping: 25, stiffness: 250, mass: 0.5 });
      }
    });

  return {
    translateY,
    MINIPLAYER_Y,
    FULLSCREEN_Y,
    progress,
    panGesture,
  };
};
