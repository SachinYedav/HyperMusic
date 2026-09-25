import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  SharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Mic, X } from 'lucide-react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import { useTheme, spacing, radius, typography } from '@/theme';
import { AppBottomSheet } from '@/ui/AppBottomSheet';
import { useToastStore } from '@/store';

type VoiceState = 'idle' | 'listening' | 'processing';

interface VoiceSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
}

const MIC_SIZE = 80;
const RING_SIZE = MIC_SIZE;

const BAR_WEIGHTS = [0.26, 0.50, 0.76, 1.00, 0.76, 0.50, 0.26] as const;
const BAR_IDLE = [5, 9, 14, 19, 14, 9, 5] as const;
const BAR_MAX = 46;

const RING_CONFIGS = [
  { delay: 0, opacity: 0.55 },
  { delay: 460, opacity: 0.38 },
  { delay: 920, opacity: 0.20 },
] as const;

interface RippleRingProps {
  delay: number;
  baseOpacity: number;
  active: boolean;
  color: string;
}

function RippleRing({ delay, baseOpacity, active, color }: RippleRingProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 0 }),
            withTiming(2.8, { duration: 1800, easing: Easing.out(Easing.quad) }),
          ),
          -1,
          false,
        ),
      );
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(baseOpacity, { duration: 0 }),
            withTiming(0, { duration: 1800, easing: Easing.out(Easing.quad) }),
          ),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = withTiming(1, { duration: 400 });
      opacity.value = withTiming(0, { duration: 400 });
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.ring, style, { backgroundColor: color }]} />;
}

function WaveBar({ sv, color }: { sv: SharedValue<number>, color: string }) {
  const style = useAnimatedStyle(() => ({
    height: sv.value,
    opacity: interpolate(sv.value, [4, BAR_MAX], [0.28, 1], 'clamp'),
  }));

  return <Animated.View style={[styles.waveBar, style, { backgroundColor: color }]} />;
}

export function VoiceSearchSheet({ visible, onClose, onResult }: VoiceSearchSheetProps) {
  const { colors, isDark } = useTheme();
  const showToast = useToastStore(s => s.showToast);

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');

  const transcriptRef = useRef('');
  const isListening = voiceState === 'listening';

  const micScale = useSharedValue(1);

  const b0 = useSharedValue(4); const b1 = useSharedValue(4);
  const b2 = useSharedValue(4); const b3 = useSharedValue(4);
  const b4 = useSharedValue(4); const b5 = useSharedValue(4);
  const b6 = useSharedValue(4);

  const barsRef = useRef([b0, b1, b2, b3, b4, b5, b6]);

  const animateIdleBars = useCallback(() => {
    barsRef.current.forEach((bar, i) => {
      cancelAnimation(bar);
      bar.value = withDelay(
        i * 65,
        withRepeat(
          withSequence(
            withTiming(BAR_IDLE[i], { duration: 640 + i * 45, easing: Easing.inOut(Easing.ease) }),
            withTiming(4, { duration: 640 + i * 45, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        ),
      );
    });
  }, []);

  const resetBars = useCallback(() => {
    barsRef.current.forEach(bar => {
      cancelAnimation(bar);
      bar.value = withTiming(4, { duration: 300 });
    });
  }, []);

  const startListening = useCallback(async () => {
    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        showToast({
          message: 'Microphone access is required',
          type: 'error',
          action: { label: 'Settings', onPress: () => Linking.openSettings() },
        });
        return;
      }

      setTranscript('');
      transcriptRef.current = '';
      setVoiceState('listening');

      micScale.value = withSpring(1.04, { damping: 12, stiffness: 140 });
      animateIdleBars();

      ExpoSpeechRecognitionModule.start({ lang: 'en-IN', interimResults: true });
    } catch (err) {
      console.warn('[VoiceSearch] start error:', err);
      setVoiceState('idle');
    }
  }, [animateIdleBars, showToast]);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    setVoiceState('idle');
    micScale.value = withSpring(1, { damping: 14 });
    resetBars();
  }, [resetBars]);

  const finishWithResult = useCallback((text: string) => {
    if (!text.trim()) return;
    resetBars();
    micScale.value = withSpring(1);
    setVoiceState('processing');
    onResult(text);
    onClose();
  }, [resetBars, onResult, onClose]);

  useEffect(() => {
    if (visible) {
      startListening();
    } else {
      stopListening();
      setTranscript('');
      setVoiceState('idle');
    }
    return () => stopListening();
  }, [visible]);

  useSpeechRecognitionEvent('result', event => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    transcriptRef.current = text;
    if (event.isFinal) finishWithResult(text);
  });

  useSpeechRecognitionEvent('volumechange', event => {
    const norm = Math.min(Math.max(event.value, 0) / 12, 1);

    barsRef.current.forEach((bar, i) => {
      cancelAnimation(bar);
      bar.value = withSpring(
        Math.max(4, 4 + norm * BAR_MAX * BAR_WEIGHTS[i]),
        { damping: 7, stiffness: 220 },
      );
    });

    micScale.value = withSpring(1 + norm * 0.07, { damping: 12, stiffness: 200 });
  });

  useSpeechRecognitionEvent('end', () => {
    const text = transcriptRef.current;
    if (text) {
      finishWithResult(text);
    } else {
      setVoiceState('idle');
      resetBars();
      micScale.value = withSpring(1);
    }
  });

  useSpeechRecognitionEvent('error', event => {
    if (event.error === 'no-speech') return;
    setVoiceState('idle');
    resetBars();
    micScale.value = withSpring(1);
  });

  const micAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const statusText =
    voiceState === 'processing' ? 'Finding results…' :
      isListening && !transcript ? 'Listening…' :
        'Tap mic to speak';

  return (
    <AppBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Voice Search</Text>
          <Pressable onPress={onClose} hitSlop={16} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <X size={24} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text
            numberOfLines={3}
            style={[
              transcript ? styles.transcriptText : styles.statusText,
              { color: transcript ? colors.text : colors.textMuted },
            ]}
          >
            {transcript || statusText}
          </Text>

          <View style={styles.orbArea}>
            {RING_CONFIGS.map((ring, i) => (
              <RippleRing
                key={i}
                delay={ring.delay}
                baseOpacity={ring.opacity}
                active={isListening}
                color={colors.brand}
              />
            ))}

            <Pressable
              onPress={isListening ? stopListening : startListening}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <Animated.View style={[micAnimStyle, styles.micButton, { backgroundColor: isListening ? colors.text : colors.surfaceMuted }]}>
                <Mic size={32} strokeWidth={2.5} color={isListening ? colors.background : colors.text} />
              </Animated.View>
            </Pressable>
          </View>

          <View style={styles.waveformRow}>
            {[b0, b1, b2, b3, b4, b5, b6].map((bar, i) => (
              <WaveBar key={i} sv={bar} color={colors.brand} />
            ))}
          </View>
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 380,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  transcriptText: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 60,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    minHeight: 60,
  },
  orbArea: {
    height: 160,
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
  },
  micButton: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 6,
  },
  waveBar: {
    width: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
  },
});