import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppBottomSheet } from '@/ui/AppBottomSheet';
import { useTheme, typography, spacing } from '@/theme';

export interface SelectionOption {
  id: string;
  label: string;
}

interface SettingsSelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: SelectionOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export function SettingsSelectionSheet({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
}: SettingsSelectionSheetProps) {
  const { colors } = useTheme();

  return (
    <AppBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.sheetContent}>
        <Text style={[styles.sheetTitle, { color: colors.text }]}>
          {title}
        </Text>
        
        {options.map((opt) => {
          const isActive = selectedValue === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.sheetRow, isActive && { backgroundColor: colors.surface }]}
              onPress={() => {
                onSelect(opt.id);
                onClose();
              }}
            >
              <View style={[styles.radioOuter, { borderColor: isActive ? colors.brand : colors.textMuted }]}>
                {isActive && <View style={[styles.radioInner, { backgroundColor: colors.brand }]} />}
              </View>
              <Text style={{ flex: 1, color: colors.text, fontSize: typography.bodyLg, fontWeight: isActive ? 'bold' : 'normal' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  sheetTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
