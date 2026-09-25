import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface LibraryShortcutCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradientColors: [string, string];
  onPress: () => void;
}

export const LibraryShortcutCard: React.FC<LibraryShortcutCardProps> = ({
  title, subtitle, icon, gradientColors, onPress
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {icon}
      </LinearGradient>

      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  gradient: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.title,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: typography.bodySm,
  },
});
