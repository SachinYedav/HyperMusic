import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  /** Custom styles for the outermost container */
  style?: ViewStyle;
  /** Custom styles for the inner content container */
  contentContainerStyle?: ViewStyle;
  /** Disable top safe area inset (e.g., if rendering your own header) */
  disableSafeAreaTop?: boolean;
  /** Disable bottom safe area inset (e.g., if rendering above a tab bar) */
  disableSafeAreaBottom?: boolean;
}

/**
 * Layout wrapper providing dynamic safe area insets and theme background color integration across screen roots.
 */
export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  contentContainerStyle,
  disableSafeAreaTop = false,
  disableSafeAreaBottom = false,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <View
        style={[
          styles.innerContainer,
          {
            paddingTop: disableSafeAreaTop ? 0 : insets.top,
            paddingBottom: disableSafeAreaBottom ? 0 : insets.bottom,
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
});
