import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, AppState, PermissionsAndroid, Platform } from 'react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { Screen } from '@/ui/Screen';
import { useThemeStore, useSettingsStore } from '@/store';
import { Moon, Sun, Smartphone, Headphones, DownloadCloud, HardDrive, Repeat, Wifi, Info, Music, Settings as SettingsIcon, ChevronRight, RefreshCw, Handshake, Scale, Code, Bug, Sliders, User, Clock, Bell, Mic, Wand2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@/navigation/types';
import Constants from 'expo-constants';
import { SettingsSection, SettingsSwitchRow, SettingsActionRow, SettingsSelectRow } from '../components/SettingsComponents';
import { SettingsSelectionSheet } from '../components/SettingsSelectionSheet';
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
            selectedValue={themeState.mode}
            onSelect={themeState.setMode}
            isLast={true}
            colors={colors}
            isDark={isDark}
          />
        </SettingsSection>

        <SettingsSection title="Personalization" colors={colors}>
          <SettingsActionRow
            icon={Wand2}
            label="Home Background Theme"
            valueLabel={themeState.homeBackgroundTheme.charAt(0).toUpperCase() + themeState.homeBackgroundTheme.slice(1)}
            onPress={() => setSheetConfig({ visible: true, type: 'theme' })}
            colors={colors}
            isDark={isDark}
          />
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

        <SettingsSection title="App Permissions" colors={colors}>
          <SettingsSwitchRow
            icon={Bell}
            label="Push Notifications"
            value={hasNotificationPermission}
            onValueChange={handleNotificationToggle}
            colors={colors}
            isDark={isDark}
          />
          <SettingsSwitchRow
            icon={Mic}
            label="Microphone (Voice Search)"
            value={hasMicPermission}
            onValueChange={handleMicToggle}
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
            icon={HardDrive}
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
            icon={User}
            label="Local Profile"
            onPress={() => { }}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={Sliders}
            label="Equalizer"
            onPress={() => { }}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={Clock}
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
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={Code}
            label="Source Code (GitHub)"
            onPress={() => Linking.openURL('https://github.com/SachinYedav/hypermusic')}
            colors={colors}
            isDark={isDark}
          />
          <SettingsActionRow
            icon={Bug}
            label="Report a Bug"
            onPress={() => Linking.openURL('https://github.com/SachinYedav/hypermusic/issues')}
            isLast={true}
            colors={colors}
            isDark={isDark}
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
});
