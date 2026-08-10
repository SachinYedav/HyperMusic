import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';
import { AppBottomSheet } from './AppBottomSheet';

export interface AppConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  isDestructive?: boolean;
}

/**
 * Reusable confirmation bottom sheet providing customizable primary and destructive user action workflows.
 */
export function AppConfirmSheet({
  visible,
  title,
  message,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  onCancel,
  onConfirm,
  isDestructive = false,
}: AppConfirmSheetProps) {
  const { colors } = useTheme();

  return (
    <AppBottomSheet visible={visible} onClose={onCancel} disableClose={isDestructive}>
      <View style={{ padding: spacing.lg }}>
        <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.sheetMessage, { color: colors.textMuted }]}>{message}</Text>
        <View style={styles.sheetActions}>
          <TouchableOpacity
            style={[styles.sheetBtn, { backgroundColor: colors.surfaceMuted }]}
            onPress={onCancel}
          >
            <Text style={[styles.sheetBtnText, { color: colors.text }]}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sheetBtn, { backgroundColor: isDestructive ? colors.brand : colors.text }]}
            onPress={onConfirm}
          >
            <Text style={[styles.sheetBtnText, { color: isDestructive ? colors.white : colors.background }]}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  sheetMessage: {
    fontSize: typography.body,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sheetBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  sheetBtnText: {
    fontSize: typography.body,
    fontWeight: 'bold',
  },
});
