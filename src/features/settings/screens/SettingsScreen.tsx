import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, AppState, PermissionsAndroid, Platform } from 'react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { Screen } from '@/ui/Screen';
import { useThemeStore, useSettingsStore } from '@/store';
import { Moon, Sun, MonitorSmartphone, Palette, ListMusic, LayoutTemplate, Bell, Mic, FolderSearch, Infinity, AudioWaveform, Leaf, ArrowDownToLine, Router, PieChart, CircleUserRound, SlidersHorizontal, Timer, Info, ArrowUpCircle, ShieldCheck, BookOpen, Terminal, Bug } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@/navigation/types';
import Constants from 'expo-constants';
import { SettingsSection, SettingsSwitchRow, SettingsActionRow, SettingsSelectRow } from '../components/SettingsComponents';
import { SettingsSelectionSheet } from '../components/SettingsSelectionSheet';
import * as MediaLibrary from 'expo-media-library';
/**
 * Global application settings workspace managing theme mode preferences, streaming/download quality configurations, and local cache invalidation.
 */
export function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const themeState = useThemeStore();
  const settings = useSettingsStore();
  const [sheetConfig, setSheetConfig] = useState({ visible: false, type: '' });
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [hasMediaPermission, setHasMediaPermission] = useState(false);

  useEffect(() => {
    const checkPerm = async () => {
      if (Platform.OS === 'android') {
        const micGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        setHasMicPermission(micGranted);

        if (Platform.Version >= 33) {
          const notifGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          setHasNotificationPermission(notifGranted);
        } else {
          setHasNotificationPermission(true);
        }
      } else {
        setHasNotificationPermission(true);
        setHasMicPermission(true);
      }

      const mediaResponse = await MediaLibrary.getPermissionsAsync();
      setHasMediaPermission(mediaResponse.granted);
    };
    checkPerm();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkPerm();
    });
    return () => sub.remove();
  }, []);

  const handleNotificationToggle = async (val: boolean) => {
    if (Platform.OS === 'android') {
      if (val && !hasNotificationPermission) {
        if (Platform.Version >= 33) {
          const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          if (result === PermissionsAndroid.RESULTS.GRANTED) {
            setHasNotificationPermission(true);
          } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            Linking.openSettings();
          }
        } else {
          Linking.openSettings();
        }
      } else if (!val && hasNotificationPermission) {
        Linking.openSettings();
      }
    }
  };

  const handleMicToggle = async (val: boolean) => {
    if (Platform.OS === 'android') {
      if (val && !hasMicPermission) {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          setHasMicPermission(true);
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Linking.openSettings();
        }
      } else if (!val && hasMicPermission) {
        Linking.openSettings();
      }
    }
  };

  const handleMediaToggle = async (val: boolean) => {
    if (Platform.OS === 'android') {
      if (val && !hasMediaPermission) {
        const response = await MediaLibrary.requestPermissionsAsync();
        if (response.granted) {
          setHasMediaPermission(true);
        } else if (!response.canAskAgain) {
          Linking.openSettings();
        }
      } else if (!val && hasMediaPermission) {
        Linking.openSettings();
      }
    }
  };

  const themeOptions = [
    { id: 'system', label: 'System Default', icon: MonitorSmartphone },
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
            selectedValue={themeState.mode}
            onSelect={themeState.setMode}
            isLast={true}
            colors={colors}
            isDark={isDark}
          />
        </SettingsSection>

        <SettingsSection title="Personalization" colors={colors}>
          <SettingsActionRow
            icon={Palette}
            label="Background Theme"
            valueLabel={themeState.homeBackgroundTheme.charAt(0).toUpperCase() + themeState.homeBackgroundTheme.slice(1)}
            onPress={() => setSheetConfig({ visible: true, type: 'theme' })}
            colors={colors}
            isDark={isDark}
            isSelector={true}
          />
          <SettingsActionRow
            icon={ListMusic}
            label="Music Preferences"
            valueLabel="Customize"
            onPress={() => navigation.navigate('PersonalizeTaste')}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={LayoutTemplate}
            label="Widgets"
            valueLabel="Pin"
            onPress={() => navigation.navigate('WidgetSettings')}
            isLast={true}
            colors={colors}
            isDark={isDark}
          />
        </SettingsSection>

        <SettingsSection title="App Permissions" colors={colors}>
          <SettingsSwitchRow
            icon={Bell}
            label="Notifications"
            value={hasNotificationPermission}
            onValueChange={handleNotificationToggle}
            colors={colors}
            isDark={isDark}
          />
          <SettingsSwitchRow
            icon={Mic}
            label="Microphone Access"
            value={hasMicPermission}
            onValueChange={handleMicToggle}
            colors={colors}
            isDark={isDark}
          />
          <SettingsSwitchRow
            icon={FolderSearch}
            label="Local Media Access"
            value={hasMediaPermission}
            onValueChange={handleMediaToggle}
            isLast={true}
            colors={colors}
            isDark={isDark}
          />
        </SettingsSection>

        <SettingsSection title="Audio & Playback" colors={colors}>
          <SettingsSwitchRow
            icon={Infinity}
            label="Autoplay"
            value={settings.autoplay}
            onValueChange={settings.setAutoplay}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={AudioWaveform}
            label="Streaming Quality"
            valueLabel={qualityOptions.find(q => q.id === settings.streamingQuality)?.label}
            onPress={() => setSheetConfig({ visible: true, type: 'streaming' })}
            colors={colors}
            isDark={isDark}
            isSelector={true}
          />
          <SettingsSwitchRow
            icon={Leaf}
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
            icon={ArrowDownToLine}
            label="Download Quality"
            valueLabel={qualityOptions.find(q => q.id === settings.downloadQuality)?.label}
            onPress={() => setSheetConfig({ visible: true, type: 'download' })}
            colors={colors}
            isDark={isDark}
            isSelector={true}
          />
          <SettingsSwitchRow
            icon={Router}
            label="Download over Wi-Fi only"
            value={settings.downloadWifiOnly}
            onValueChange={settings.setDownloadWifiOnly}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={PieChart}
            label="Storage Management"
            valueLabel=""
            onPress={() => navigation.navigate('StorageSettings')}
            isLast={true}
            colors={colors}
            isDark={isDark}
          />
        </SettingsSection>

        <SettingsSection title="Coming Soon" colors={colors}>
          <SettingsActionRow
            icon={CircleUserRound}
            label="Local Profile"
            onPress={() => { }}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={SlidersHorizontal}
            label="Equalizer"
            onPress={() => { }}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={Timer}
            label="Sleep Timer"
            onPress={() => { }}
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
            icon={ArrowUpCircle}
            label="App Updates"
            onPress={() => navigation.navigate('AppUpdates')}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={ShieldCheck}
            label="Privacy Policy & Terms"
            onPress={() => navigation.navigate('TermsPrivacy')}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={BookOpen}
            label="Open Source Licenses"
            onPress={() => navigation.navigate('Licenses')}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={Terminal}
            label="Source Code (GitHub)"
            onPress={() => Linking.openURL('https://github.com/SachinYedav/hypermusic')}
            colors={colors}
            isDark={isDark}
            isExternal={true}
          />
          <SettingsActionRow
            icon={Bug}
            label="Report a Bug"
            onPress={() => Linking.openURL('https://github.com/SachinYedav/hypermusic/issues')}
            isLast={true}
            colors={colors}
            isDark={isDark}
            isExternal={true}
          />
        </SettingsSection>

      </ScrollView>

      <SettingsSelectionSheet
        visible={sheetConfig.visible && (sheetConfig.type === 'streaming' || sheetConfig.type === 'download')}
        onClose={() => setSheetConfig({ visible: false, type: '' })}
        title={sheetConfig.type === 'streaming' ? 'Streaming Quality' : 'Download Quality'}
        options={qualityOptions.map(opt => ({ id: opt.id, label: opt.label }))}
        selectedValue={sheetConfig.type === 'streaming' ? settings.streamingQuality : settings.downloadQuality}
        onSelect={(val) => {
          if (sheetConfig.type === 'streaming') settings.setStreamingQuality(val as any);
          else settings.setDownloadQuality(val as any);
        }}
      />

      <SettingsSelectionSheet
        visible={sheetConfig.visible && sheetConfig.type === 'theme'}
        onClose={() => setSheetConfig({ visible: false, type: '' })}
        title="Home Background Theme"
        options={[
          { id: 'auto', label: 'Auto (Random)' },
          { id: 'purple', label: 'Classic Purple' },
          { id: 'midnight', label: 'Midnight Blue' },
          { id: 'crimson', label: 'Crimson Red' },
          { id: 'emerald', label: 'Emerald Green' },
          { id: 'sunset', label: 'Sunset Orange' },
        ]}
        selectedValue={themeState.homeBackgroundTheme}
        onSelect={(val) => themeState.setHomeBackgroundTheme(val as any)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    flex: 1,
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
});
