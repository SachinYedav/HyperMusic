import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme, typography, spacing } from '@/theme';
import { Mic, X } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing
} from 'react-native-reanimated';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { AppBottomSheet } from '@/ui/AppBottomSheet';
import { Linking } from 'react-native';
import { useToastStore } from '@/store';

interface VoiceSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
}

export function VoiceSearchSheet({ visible, onClose, onResult }: VoiceSearchSheetProps) {
  const { colors } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const volumeScale = useSharedValue(1);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);
  const showToast = useToastStore(state => state.showToast);

  const startListening = async () => {
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        showToast({
          message: 'Microphone permission denied',
          type: 'error',
          action: {
            label: 'Settings',
            onPress: () => Linking.openSettings(),
          }
        });
        return;
      }

      setTranscript('');
      setIsListening(true);

      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      ExpoSpeechRecognitionModule.start({
        lang: 'en-IN',
        interimResults: true,
      });
    } catch (e) {
      console.warn('Speech recognition failed to start', e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
    glowScale.value = withTiming(1);
    glowOpacity.value = withTiming(0);
  };

  useEffect(() => {
    if (visible) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [visible]);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript || '';
    setTranscript(text);

    if (event.isFinal) {
      setIsListening(false);
      onResult(text);
      onClose();
    }
  });

  useSpeechRecognitionEvent('volumechange', (event: any) => {
    const targetScale = 1 + (event.value / 10) * 0.4;
    volumeScale.value = withSpring(Math.max(1, Math.min(1.6, targetScale)), {
      damping: 12,
      stiffness: 100,
    });

    if (event.value > 1) {
      glowOpacity.value = withTiming(Math.min(0.8, 0.2 + (event.value / 10)), { duration: 100 });
      glowScale.value = withSpring(Math.max(1.3, Math.min(2.0, targetScale * 1.2)));
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    volumeScale.value = withTiming(1);
    glowScale.value = withTiming(1);
    if (transcript) {
      onResult(transcript);
      onClose();
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'no-speech' && isListening) {
      // Ignore no-speech if we are still active, allow user to keep trying
      return;
    }
    setIsListening(false);
    volumeScale.value = withTiming(1);
  });

  const animatedMicStyle = useAnimatedStyle(() => ({
    transform: [{ scale: volumeScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Voice Search</Text>
          <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <X color={colors.textMuted} size={24} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={[styles.transcript, { color: transcript ? colors.text : colors.textMuted }]}>
            {transcript || (isListening ? 'Listening...' : 'Tap mic to speak')}
          </Text>

          <View style={styles.micWrapper}>
            <Animated.View style={[
              styles.glowEffect,
              animatedGlowStyle,
              { backgroundColor: colors.text }
            ]} />

            <Pressable
              onPress={isListening ? stopListening : startListening}
              style={[
                styles.micButton,
                { backgroundColor: isListening ? colors.text : colors.surfaceMuted }
              ]}
            >
              <Animated.View style={[animatedMicStyle]}>
                <Mic color={isListening ? colors.background : colors.text} size={32} />
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    minHeight: 280,
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
  transcript: {
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
    minHeight: 80,
  },
  micWrapper: {
    height: 140,
    width: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  glowEffect: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
});
