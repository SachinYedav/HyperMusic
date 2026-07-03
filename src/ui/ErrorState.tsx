import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';
import { parseNetworkError } from '@/utils/errorUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ErrorStateProps {
  error?: any;
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
  variant?: 'offline' | 'timeout' | 'server_error' | 'empty';
  containerStyle?: any;
}

/**
 * A reusable component to display an error state with a title, subtitle, and optional retry button. It can be used to handle various error scenarios such as network issues, timeouts, server errors, or empty states. The component adapts its appearance based on the provided variant and allows customization of the title, subtitle, and retry action.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  title: customTitle,
  subtitle: customSubtitle,
  onRetry,
  variant: customVariant,
  containerStyle,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const parsed = error ? parseNetworkError(error) : null;
  const displayTitle = customTitle || parsed?.title || 'Connect to the Internet';
  const displaySubtitle = customSubtitle || parsed?.subtitle || "You're offline. Check your connection.";

  const calculatedBottom = 140 + insets.bottom;

  return (
    <View style={[styles.container, { paddingBottom: calculatedBottom }, containerStyle]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{displayTitle}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{displaySubtitle}</Text>

        {onRetry && (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.text,
                opacity: pressed ? 0.85 : 1
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>Retry</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
  },
  content: {
    width: '100%',
  },
  title: {
    fontSize: typography.header,
    fontWeight: '600',
    textAlign: 'left',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body,
    textAlign: 'left',
    marginBottom: spacing.xl,
  },
  button: {
    width: '100%',
    paddingVertical: spacing.lg,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: typography.bodyLg,
    fontWeight: '600',
  },
});
