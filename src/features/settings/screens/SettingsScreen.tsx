import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { Screen } from '@/ui/Screen';
import { useThemeStore, useSettingsStore } from '@/store';
import { Check, Moon, Sun, Smartphone, Headphones, DownloadCloud, Trash2, Repeat, Wifi, Info, Music, Settings as SettingsIcon, ChevronRight, Handshake, Scale, RefreshCw } from 'lucide-react-native';
import { AppBottomSheet } from '@/ui/AppBottomSheet';
import { Image } from 'expo-image';
import { Directory, Paths } from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@/navigation/types';
import Constants from 'expo-constants';

const SettingsSection = ({ title, children, colors }: any) => (
  <View style={styles.sectionContainer}>
    {title && <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>}
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {children}
    </View>
  </View>
);

const SettingsSwitchRow = ({ icon: Icon, label, value, onValueChange, isLast, colors, isDark }: any) => (
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

const SettingsActionRow = ({ icon: Icon, label, valueLabel, onPress, isLast, colors, isDark, danger, success, hideChevron }: any) => {
  const textColor = success ? '#4CAF50' : (danger ? colors.brand : colors.text);
  return (
    <TouchableOpacity
      style={[styles.optionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.optionLeft}>
        <Icon color={textColor} size={20} />
        <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {valueLabel && <Text style={{ color: colors.textMuted, marginRight: hideChevron ? 0 : 8 }}>{valueLabel}</Text>}
        {!hideChevron && <ChevronRight color={colors.textMuted} size={16} />}
      </View>
    </TouchableOpacity>
  );
};

const SettingsSelectRow = ({ options, selectedValue, onSelect, isLast, colors, isDark }: any) => {
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

/**
 * Global application settings workspace managing theme mode preferences, streaming/download quality configurations, and local cache invalidation.
 */
export function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const { mode, setMode } = useThemeStore();
  const settings = useSettingsStore();
  const [sheetConfig, setSheetConfig] = useState({ visible: false, type: '' });
  const [cacheCleared, setCacheCleared] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const handleClearCache = async () => {
    try {
      await Image.clearMemoryCache();
      await Image.clearDiskCache();

      const cacheDir = new Directory(Paths.cache);
      if (cacheDir.exists) {
        // Clear expo-file-system cache if needed, but Image cache is 99% of it
      }

      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (error) {
      console.error('Failed to clear cache', error);
    }
  };

  const themeOptions = [
    { id: 'system', label: 'System Default', icon: Smartphone },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
  ] as const;

  const qualityOptions = [
    { id: 'data_saver', label: 'Data Saver (Low)' },
    { id: 'normal', label: 'Normal (128kbps)' },
    { id: 'high', label: 'High (256kbps)' },
    { id: 'lossless', label: 'Lossless (Highest)' },
  ] as const;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        <SettingsSection colors={colors}>
          <SettingsSelectRow
            options={themeOptions}
            selectedValue={mode}
            onSelect={setMode}
            isLast={true}
            colors={colors}
            isDark={isDark}
          />
        </SettingsSection>

        <SettingsSection title="Personalization" colors={colors}>
          <SettingsActionRow
            icon={Music}
            label="Personalize Music Taste"
            valueLabel=""
            onPress={() => navigation.navigate('PersonalizeTaste')}
            isLast={true}
            colors={colors}
            isDark={isDark}
          />
        </SettingsSection>

        <SettingsSection title="Audio & Playback" colors={colors}>
          <SettingsSwitchRow
            icon={Repeat}
            label="Autoplay"
            value={settings.autoplay}
            onValueChange={settings.setAutoplay}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={Headphones}
            label="Streaming Quality"
            valueLabel={qualityOptions.find(q => q.id === settings.streamingQuality)?.label}
            onPress={() => setSheetConfig({ visible: true, type: 'streaming' })}
            colors={colors}
            isDark={isDark}
          />
          <SettingsSwitchRow
            icon={Wifi}
            label="Data Saver Mode"
            value={settings.dataSaver}
            onValueChange={settings.setDataSaver}
            isLast={true}
            colors={colors}
            isDark={isDark}
          />
        </SettingsSection>

        <SettingsSection title="Downloads & Storage" colors={colors}>
          <SettingsActionRow
            icon={DownloadCloud}
            label="Download Quality"
            valueLabel={qualityOptions.find(q => q.id === settings.downloadQuality)?.label}
            onPress={() => setSheetConfig({ visible: true, type: 'download' })}
            colors={colors}
            isDark={isDark}
          />
          <SettingsSwitchRow
            icon={Wifi}
            label="Download over Wi-Fi only"
            value={settings.downloadWifiOnly}
            onValueChange={settings.setDownloadWifiOnly}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={cacheCleared ? Check : Trash2}
            label={cacheCleared ? "Cleared" : "Clear Cache"}
            valueLabel=""
            danger={!cacheCleared}
            success={cacheCleared}
            onPress={handleClearCache}
            isLast={true}
            colors={colors}
            isDark={isDark}
          />
        </SettingsSection>

        <SettingsSection title="About" colors={colors}>
          <SettingsActionRow
            icon={Info}
            label="App Version"
            valueLabel={Constants.expoConfig?.version || '1.1.0'}
            colors={colors}
            isDark={isDark}
            hideChevron={true}
          />
          <SettingsActionRow
            icon={RefreshCw}
            label="App Updates"
            onPress={() => navigation.navigate('AppUpdates')}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={Handshake}
            label="Privacy Policy & Terms"
            onPress={() => navigation.navigate('TermsPrivacy')}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={Scale}
            label="Open Source Licenses"
            onPress={() => navigation.navigate('Licenses')}
            isLast={true}
            colors={colors}
            isDark={isDark}
          />
        </SettingsSection>

      </ScrollView>

      <AppBottomSheet visible={sheetConfig.visible} onClose={() => setSheetConfig({ visible: false, type: '' })}>
        <View style={{ paddingBottom: spacing.xl, paddingTop: spacing.md }}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {sheetConfig.type === 'streaming' ? 'Streaming Quality' : 'Download Quality'}
          </Text>
          {qualityOptions.map((opt) => {
            const isActive = sheetConfig.type === 'streaming' ? settings.streamingQuality === opt.id : settings.downloadQuality === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.sheetRow, isActive && { backgroundColor: colors.surface }]}
                onPress={() => {
                  if (sheetConfig.type === 'streaming') settings.setStreamingQuality(opt.id);
                  else settings.setDownloadQuality(opt.id);
                  setSheetConfig({ visible: false, type: '' });
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
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
