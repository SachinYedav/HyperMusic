import React from 'react';
import { Modal, TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';

export interface AppConfirmModalProps {
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
 * Reusable confirmation dialog providing customizable primary and destructive user action workflows.
 */
export function AppConfirmModal({
  visible,
  title,
  message,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  onCancel,
  onConfirm,
  isDestructive = false,
}: AppConfirmModalProps) {
  const { colors, isDark } = useTheme();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay,
    },
    dialog: {
      backgroundColor: colors.surface, 
      borderRadius: radius.md,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 400,
      elevation: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    },
    title: {
      marginBottom: spacing.md,
      color: colors.text,
      fontSize: typography.title,
      fontWeight: 'bold',
    },
    message: {
      color: colors.textMuted,
      marginBottom: spacing.xl,
      lineHeight: 22,
      fontSize: typography.body,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.md,
    },
    button: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 80,
    },
    cancelButton: {
      backgroundColor: 'transparent',
    },
    confirmButton: {
      backgroundColor: isDestructive ? colors.brand : colors.text,
    },
    cancelText: {
      fontWeight: '600',
      color: colors.text,
      fontSize: typography.body,
    },
    confirmText: {
      fontWeight: '600',
      color: colors.background,
      fontSize: typography.body,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={[styles.button, styles.cancelButton]}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={[styles.button, styles.confirmButton]}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
