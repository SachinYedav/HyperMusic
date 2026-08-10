import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { spacing, typography, radius } from '@/theme';
import type { ThemeColors } from '@/theme/colors';
import type { LicenseEntry } from '../hooks/useLicenses';

interface LicenseRowProps {
  item: LicenseEntry;
  colors: ThemeColors;
  onPress: (item: LicenseEntry) => void;
}

const BADGE_MAX_LEN = 14;

function getBadgeColors(licenseType: string, colors: ThemeColors) {
  const typeUpper = licenseType.toUpperCase();
  if (typeUpper.includes('GPL') || typeUpper.includes('GNU') || typeUpper.includes('GENERAL PUBLIC LICENSE')) {
    return { bg: colors.warning + '22', text: colors.warning };
  }
  return { bg: colors.surfaceMuted, text: colors.textMuted };
}

/**
 * Memoized row for the open-source licenses FlashList.
 * Purely presentational — all data and press handler come from the parent.
 */
export const LicenseRow = memo(function LicenseRow({ item, colors, onPress }: LicenseRowProps) {
  const badge = getBadgeColors(item.licenseType, colors);
  const label = item.licenseType.length > BADGE_MAX_LEN
    ? item.licenseType.substring(0, BADGE_MAX_LEN) + '…'
    : item.licenseType;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.highlight },
      ]}
      onPress={() => onPress(item)}
    >
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.version, { color: colors.textMuted }]}>
          v{item.version}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeLabel, { color: badge.text }]}>{label}</Text>
      </View>
      <ChevronRight color={colors.textSubtle} size={18} style={styles.caret} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  version: {
    fontSize: typography.caption,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeLabel: {
    fontSize: typography.caption,
    fontWeight: '600',
  },
  caret: {
    marginLeft: spacing.sm,
  },
});
