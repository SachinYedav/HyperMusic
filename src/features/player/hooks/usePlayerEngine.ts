import { useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { PositionUpdateEvent } from 'react-native-hyper-player';

/**
 * Hook to get real-time playback progress from the native HyperPlayer engine.
 */
export function useProgress() {
  const [progress, setProgress] = useState({ position: 0, duration: 0, buffered: 0 });

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onPositionUpdate', (event: PositionUpdateEvent) => {
      setProgress({
        position: event.positionMs / 1000, // Convert to seconds for UI
        duration: event.durationMs / 1000,
        buffered: event.bufferedMs / 1000
      });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return progress;
}
