import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/ui/Screen';
import { useTheme, typography, spacing, radius } from '@/theme';
import { ArrowLeft, RefreshCw, DownloadCloud, Info, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import Constants from 'expo-constants';
import { updateService, AppUpdateData } from '@/services/api/updateService';

const SettingsSection = ({ title, children, colors }: any) => (
  <View style={styles.sectionContainer}>
    {title && <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>}
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {children}
    </View>
  </View>
);

const SettingsActionRow = ({ icon: Icon, label, valueLabel, onPress, isLast, colors, isDark, hideChevron, loading }: any) => {
  return (
    <TouchableOpacity
      style={[styles.optionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress || loading}
    >
      <View style={styles.optionLeft}>
        <Icon color={colors.text} size={20} />
        <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.textMuted} style={{ marginRight: hideChevron ? 0 : 8 }} />
        ) : (
          valueLabel && <Text style={{ color: colors.textMuted, marginRight: hideChevron ? 0 : 8 }}>{valueLabel}</Text>
        )}
        {!hideChevron && <ChevronRight color={colors.textMuted} size={16} />}
      </View>
    </TouchableOpacity>
  );
};

export function AppUpdatesScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const currentVersion = Constants.expoConfig?.version || '1.1.0';
  
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<boolean | null>(null);
  const [updateChecked, setUpdateChecked] = useState(false);
  const [updateData, setUpdateData] = useState<AppUpdateData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCheckUpdates = async () => {
    setIsChecking(true);
    setUpdateAvailable(null);
    setUpdateChecked(false);
    setErrorMsg(null);
    
    const response = await updateService.checkForUpdates();
    setIsChecking(false);
    setUpdateChecked(true);

    if (response.status === 'success' && response.data) {
      const isNewer = updateService.isUpdateAvailable(response.data.latestVersion);
      setUpdateAvailable(isNewer);
      if (isNewer) {
        setUpdateData(response.data);
      }
    } else {
      setErrorMsg(response.message || 'Failed to check for updates.');
      setUpdateAvailable(false);
    }
  };

  const handleDownload = () => {
    if (updateData?.downloadUrl) {
      Linking.openURL(updateData.downloadUrl).catch(err => {
        console.error("Failed to open URL:", err);
      });
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>App Updates</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <SettingsSection title="Version Info" colors={colors}>
          <SettingsActionRow
            icon={Info}
            label="Current Version"
            valueLabel={currentVersion}
            colors={colors}
            isDark={isDark}
            hideChevron={true}
            isLast={!updateAvailable && !updateChecked}
          />
          {updateAvailable && updateData && (
             <SettingsActionRow
               icon={DownloadCloud}
               label="Latest Version"
               valueLabel={updateData.latestVersion}
               colors={colors}
               isDark={isDark}
               hideChevron={true}
               isLast={true}
             />
          )}
        </SettingsSection>

        {(!updateAvailable && !updateChecked) && (
          <SettingsSection colors={colors}>
             <SettingsActionRow
               icon={RefreshCw}
               label={isChecking ? "Checking for updates..." : "Check for Updates"}
               onPress={handleCheckUpdates}
               colors={colors}
               isDark={isDark}
               hideChevron={true}
               isLast={true}
               loading={isChecking}
             />
          </SettingsSection>
        )}

        {updateChecked && updateAvailable === false && !errorMsg && (
          <SettingsSection colors={colors}>
             <SettingsActionRow
               icon={CheckCircle2}
               label="App is Up to Date"
               colors={colors}
               isDark={isDark}
               hideChevron={true}
               isLast={true}
             />
          </SettingsSection>
        )}

        {errorMsg && (
          <SettingsSection colors={colors}>
             <SettingsActionRow
               icon={AlertCircle}
               label={errorMsg}
               colors={colors}
               isDark={isDark}
               hideChevron={true}
               isLast={true}
               danger={true}
             />
          </SettingsSection>
        )}

        {updateAvailable && updateData && (
          <>
            <SettingsSection title={`What's New in v${updateData.latestVersion}`} colors={colors}>
              <View style={styles.changelogWrapper}>
                {updateData.changelog.map((item, i: number) => (
                  <View key={i} style={[styles.changelogBullet, i === updateData.changelog.length - 1 && { marginBottom: 0 }]}>
                    <View style={[styles.bulletDot, { backgroundColor: colors.textMuted }]} />
                    <Text style={[styles.changelogText, { color: colors.text }]}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </SettingsSection>

            <SettingsSection colors={colors}>
               <SettingsActionRow
                 icon={DownloadCloud}
                 label="Download Update"
                 onPress={handleDownload}
                 colors={colors}
                 isDark={isDark}
                 hideChevron={true}
                 isLast={true}
               />
            </SettingsSection>
          </>
        )}

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  backBtn: {
    marginRight: spacing.md,
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
    borderRadius: radius.sm,
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
  changelogWrapper: {
    padding: spacing.lg,
  },
  changelogBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    marginRight: spacing.md,
  },
  changelogText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
