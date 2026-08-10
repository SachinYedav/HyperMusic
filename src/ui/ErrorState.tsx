import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';
import { parseNetworkError } from '@/utils/errorUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@/store';
import { getBottomTabBarHeight } from '@/navigation/layout';
import { LinearGradient } from 'expo-linear-gradient';

export interface ErrorStateProps {
  error?: any;
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
  variant?: 'offline' | 'timeout' | 'server_error' | 'empty';
  containerStyle?: any;
}

/**
 * A reusable component to display an error state as a floating toast above the bottom sheet/mini-player,
 * with a premium centered abstract illustration filling the empty background.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  title: customTitle,
  subtitle: customSubtitle,
  onRetry,
  variant: customVariant,
  containerStyle,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const isMiniPlayerVisible = usePlayerStore((state) => state.isMiniPlayerVisible);
  const isExpanded = usePlayerStore((state) => state.isExpanded);

  const parsed = error ? parseNetworkError(error) : null;
  const displayTitle = customTitle || parsed?.title || 'Connect to the Internet';
  const displaySubtitle = customSubtitle || parsed?.subtitle || "You're offline. Check your connection.";

  const bottomTabBarHeight = getBottomTabBarHeight(insets.bottom);
  const MINI_PLAYER_HEIGHT = 60;

  const expandedPosition = insets.bottom + spacing.lg;
  const collapsedPosition = isMiniPlayerVisible
    ? bottomTabBarHeight + MINI_PLAYER_HEIGHT + spacing.sm
    : bottomTabBarHeight + spacing.sm;

  const bottomPosition = isExpanded ? expandedPosition : collapsedPosition;

  return (
    <View style={[StyleSheet.absoluteFill, styles.container, containerStyle]} pointerEvents="box-none">

      <View style={styles.illustrationContainer} pointerEvents="none">
        <LinearGradient
          colors={[colors.background, 'transparent']}
          style={styles.topGradientOverlay}
          locations={[0, 1]}
        />

        <Image
          source={require('@/assets/images/offline_illustration.png')}
          style={styles.illustration}
          resizeMode="cover"
        />

        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.gradientOverlay}
          locations={[0, 1]}
        />
      </View>

      <View style={[styles.toastColumn, { backgroundColor: colors.text, bottom: bottomPosition }]}>
        <View style={styles.messageContainerColumn}>
          <Text style={[styles.title, { color: colors.background }]} numberOfLines={1}>{displayTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.background, opacity: 0.8 }]} numberOfLines={2}>{displaySubtitle}</Text>
        </View>

        {onRetry && (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [
              styles.actionBtnColumn,
              { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>Retry</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingBottom: 160,
  },
  illustration: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  topGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  toastColumn: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'column',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  messageContainerColumn: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.body,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodySm,
    textAlign: 'center',
  },
  actionBtnColumn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.full,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  actionText: {
    fontWeight: '800',
    fontSize: typography.bodySm,
    textTransform: 'uppercase',
  },
});
