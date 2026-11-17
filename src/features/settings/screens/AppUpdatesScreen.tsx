import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/ui/Screen';
import { useTheme, typography, spacing, radius } from '@/theme';
import { ArrowLeft, RefreshCw, DownloadCloud, Info, ChevronRight, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react-native';
import Constants from 'expo-constants';
import { updateService, AppUpdateData } from '@/services/api/updateService';

const getChangelogDotColor = (type?: string, index: number = 0) => {
  if (type === 'improvement') return '#38BDF8';
  if (type === 'fix') return '#34D399';
  if (type === 'patch') return '#A78BFA';
  const palette = ['#38BDF8', '#A78BFA', '#34D399', '#FBBF24'];
  return palette[index % palette.length];
};

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
    if (isChecking) return;
    setIsChecking(true);
    setUpdateAvailable(null);
    setUpdateChecked(false);
    setErrorMsg(null);

    const response = await updateService.checkForUpdates();
    setIsChecking(false);
    setUpdateChecked(true);

    if (response.status === 'success' && response.data) {
      const isNewer = updateService.isUpdateAvailable(response.data.versionCode);
      setUpdateAvailable(isNewer);
      if (isNewer) {
        setUpdateData(response.data);
      }
    } else {
      setErrorMsg(response.message || 'Failed to check for updates.');
      setUpdateAvailable(false);
    }
  };

  useEffect(() => {
    handleCheckUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={28} />
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
            isLast={true}
          />
        </SettingsSection>

        {updateAvailable && updateData && (
          <View style={[styles.updateBanner, { backgroundColor: colors.surface }]}>
            <View style={styles.bannerHeaderRow}>
              <View style={styles.bannerLeftInfo}>
                <View style={[styles.bannerIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                  <DownloadCloud color={colors.text} size={22} />
                </View>
                <View style={styles.bannerTextContainer}>
                  <Text style={[styles.bannerTitle, { color: colors.text }]}>Update Ready</Text>
                  <Text style={[styles.bannerSubtitle, { color: colors.textMuted }]}>Version {updateData.latestVersion} is available to install</Text>
                </View>
              </View>
              <View style={[styles.versionBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.versionBadgeText, { color: colors.textMuted }]}>v{updateData.latestVersion}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: isDark ? colors.white : colors.black }]}
              onPress={handleDownload}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryButtonText, { color: isDark ? colors.black : colors.white }]}>Download Update</Text>
              <ExternalLink color={isDark ? colors.black : colors.white} size={16} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Optional Release Advisory Card */}
        {updateAvailable && updateData?.advisory && (
          <View style={styles.sectionContainer}>
            <View style={styles.advisoryHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0, marginLeft: 0 }]}>
                {updateData.advisory.badge || "Release Advisory"}
              </Text>
              <Text style={[styles.advisorySubBadge, { color: colors.textMuted }]}>Optional Upgrade</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, padding: spacing.lg }]}>
              <View style={styles.advisoryTitleRow}>
                <View style={[styles.advisoryIndicatorDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.advisoryTitleText, { color: colors.text }]}>
                  {updateData.advisory.title}
                </Text>
              </View>
              <Text style={[styles.advisoryDescription, { color: colors.textMuted, marginBottom: Array.isArray(updateData.advisory.notes) && updateData.advisory.notes.length > 0 ? spacing.md : 0 }]}>
                {updateData.advisory.description}
              </Text>
              {Array.isArray(updateData.advisory.notes) && updateData.advisory.notes.length > 0 && (
                <View style={[styles.advisoryNotesList, { borderTopColor: colors.border }]}>
                  {updateData.advisory.notes.map((note: string, nIdx: number) => (
                    <View key={nIdx} style={styles.advisoryNoteRow}>
                      <View style={[styles.advisoryNoteDot, { backgroundColor: colors.textSubtle }]} />
                      <Text style={[styles.advisoryNoteText, { color: colors.textMuted }]}>
                        {note}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

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
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{`What's New in v${updateData.latestVersion}`}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, padding: spacing.lg }]}>
              {updateData.changelog.map((item, i: number) => (
                <View key={i} style={[styles.changelogBullet, i === updateData.changelog.length - 1 && { marginBottom: 0 }]}>
                  <View style={[styles.bulletDot, { backgroundColor: getChangelogDotColor(item.type, i) }]} />
                  <Text style={[styles.changelogText, { color: colors.text }]}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
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
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.md,
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
  updateBanner: {
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  bannerLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: typography.body,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: typography.bodySm,
  },
  versionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  versionBadgeText: {
    fontSize: typography.caption,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    width: '100%',
  },
  primaryButtonText: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  advisoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  advisorySubBadge: {
    fontSize: typography.caption,
  },
  advisoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  advisoryIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  advisoryTitleText: {
    fontSize: typography.bodySm,
    fontWeight: 'bold',
  },
  advisoryDescription: {
    fontSize: typography.bodySm,
    lineHeight: 20,
  },
  advisoryNotesList: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  advisoryNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  advisoryNoteDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7,
    marginRight: spacing.sm,
  },
  advisoryNoteText: {
    flex: 1,
    fontSize: typography.bodySm,
    lineHeight: 18,
  },
  changelogBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    marginTop: 7,
    marginRight: spacing.md,
  },
  changelogText: {
    flex: 1,
    fontSize: typography.bodySm,
    lineHeight: 20,
  },
});
