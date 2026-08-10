import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useToastStore, usePlayerStore } from '@/store';
import { getBottomTabBarHeight } from '@/navigation/layout';
import { Heart } from 'lucide-react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const GlobalToast = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const isVisible = useToastStore((state) => state.isVisible);
  const message = useToastStore((state) => state.message);
  const type = useToastStore((state) => state.type);
  const imageUrl = useToastStore((state) => state.imageUrl);
  const action = useToastStore((state) => state.action);
  const hideToast = useToastStore((state) => state.hideToast);

  const isMiniPlayerVisible = usePlayerStore((state) => state.isMiniPlayerVisible);
  const isExpanded = usePlayerStore((state) => state.isExpanded);

  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible && message) {
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [isVisible, message, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!message && !isVisible) return null;

  const bottomTabBarHeight = getBottomTabBarHeight(insets.bottom);
  const MINI_PLAYER_HEIGHT = 60;

  const expandedPosition = insets.bottom + spacing.lg;

  const collapsedPosition = isMiniPlayerVisible
    ? bottomTabBarHeight + MINI_PLAYER_HEIGHT + spacing.sm
    : bottomTabBarHeight + spacing.sm;

  const bottomPosition = isExpanded ? expandedPosition : collapsedPosition;

  const renderLeftMedia = () => {
    if (imageUrl) {
      return <Image source={{ uri: imageUrl }} style={styles.mediaArt} />;
    }

    if (type === 'liked') {
      return (
        <View style={styles.likedBox}>
          <Heart color="#ffffff" size={18} fill="#ffffff" />
        </View>
      );
    }

    return null;
  };

  return (
    <Animated.View style={[styles.container, { bottom: bottomPosition }, animatedStyle]} pointerEvents="box-none">
      <View style={[styles.toast, { backgroundColor: colors.text }]}>
        {renderLeftMedia()}
        <Text style={[
          styles.message,
          !imageUrl && type !== 'success' && { paddingLeft: spacing.sm },
          { color: colors.background }
        ]} numberOfLines={1}>{message}</Text>

        {action && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              action.onPress();
              hideToast();
            }}
          >
            <Text style={[styles.actionText, { color: colors.success }]}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 46,
    borderRadius: radius.xs,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  mediaArt: {
    width: 34,
    height: 34,
    borderRadius: 2,
    marginRight: spacing.sm,
    backgroundColor: '#e0e0e0',
  },
  likedBox: {
    width: 34,
    height: 34,
    backgroundColor: '#8651F5',
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  iconSpaced: {
    marginRight: spacing.sm,
    marginLeft: spacing.xs,
  },
  message: {
    fontSize: typography.bodySm,
    fontWeight: '600',
    flex: 1,
    paddingLeft: spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  actionText: {
    fontWeight: '700',
    fontSize: typography.bodySm,
  }
});