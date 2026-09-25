import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { ChevronRight, Check, ExternalLink, ChevronDown } from 'lucide-react-native';
import { spacing, radius, typography } from '@/theme';

export const SettingsSection = ({ title, children, colors }: any) => (
  <View style={styles.sectionContainer}>
    {title && <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>}
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {children}
    </View>
  </View>
);

export const SettingsSwitchRow = ({ icon: Icon, label, value, onValueChange, isLast, colors, isDark }: any) => (
  <View style={[styles.optionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
    <View style={styles.optionLeft}>
      <Icon color={colors.text} size={20} />
      <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.surfaceMuted, true: colors.brand }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.surfaceMuted}
      style={{ transform: [{ scale: 0.9 }] }}
    />
  </View>
);

export const SettingsActionRow = ({ icon: Icon, label, valueLabel, description, onPress, isLast, colors, isDark, danger, success, hideChevron, isExternal, isSelector }: any) => {
  const textColor = success ? '#4CAF50' : (danger ? colors.brand : colors.text);
  return (
    <TouchableOpacity
      style={[styles.optionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.optionLeft}>
          <Icon color={textColor} size={20} />
          <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
        </View>
        {description && (
          <Text style={[styles.optionDescription, { color: colors.textMuted }]}>{description}</Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, maxWidth: '60%', justifyContent: 'flex-end' }}>
        {valueLabel ? <Text style={{ color: colors.textMuted, marginRight: hideChevron ? 0 : 8, flexShrink: 1, textAlign: 'right' }}>{valueLabel}</Text> : null}
        {!hideChevron && (
          isExternal ? <ExternalLink color={colors.textMuted} size={16} /> :
            isSelector ? <ChevronDown color={colors.textMuted} size={16} /> :
              <ChevronRight color={colors.textMuted} size={16} />
        )}
      </View>
    </TouchableOpacity>
  );
};

export const SettingsSelectRow = ({ options, selectedValue, onSelect, isLast, colors, isDark }: any) => {
  return (
    <>
      {options.map((option: any, index: number) => {
        const isSelected = selectedValue === option.id;
        const OptionIcon = option.icon;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionRow,
              (!isLast || index < options.length - 1) && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
            onPress={() => onSelect(option.id)}
          >
            <View style={styles.optionLeft}>
              {OptionIcon && <OptionIcon color={colors.text} size={20} />}
              <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
            </View>
            {isSelected && <Check color={colors.brand} size={20} />}
          </TouchableOpacity>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.bodySm,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionLabel: {
    fontSize: typography.body,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: typography.captionLg,
    marginTop: 4,
    marginLeft: 20 + spacing.md, // icon size + gap
  },
});
