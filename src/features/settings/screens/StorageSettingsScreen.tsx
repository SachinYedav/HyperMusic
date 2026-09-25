import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { AppConfirmSheet } from '@/ui/AppConfirmSheet';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/ui/Screen';
import { SettingsSection, SettingsActionRow } from '@/features/settings/components/SettingsComponents';
import { Trash2, ArrowLeft, Database, History } from 'lucide-react-native';
import { formatBytes } from '@/utils/formatters';
import { useStorageStats } from '@/features/settings/hooks/useStorageStats';
import { useStorageActions } from '@/features/settings/hooks/useStorageActions';

export function StorageSettingsScreen() {
  const { colors, isDark } = useTheme();
  const db = useSafeDatabase();
  const navigation = useNavigation();

  const { stats, refreshing, onRefresh, fetchStats } = useStorageStats();
  const {
    sheetConfig,
    setSheetConfig,
    handleClearCache,
    handleClearHistory,
    handleDeleteAllDownloads
  } = useStorageActions(db, fetchStats);

  const renderStorageBar = () => {
    if (!stats) return <View style={[styles.barContainer, { backgroundColor: colors.surfaceMuted }]} />;

    const appTotal = stats.downloads + stats.cache + stats.appData;
    const minPercent = 2;

    let downloadPct = appTotal > 0 ? (stats.downloads / appTotal) * 100 : 0;
    let cachePct = appTotal > 0 ? (stats.cache / appTotal) * 100 : 0;
    let appDataPct = appTotal > 0 ? (stats.appData / appTotal) * 100 : 0;

    const barScale = 0.85;

    return (
      <View style={styles.barWrapper}>
        <View style={[styles.barContainer, { backgroundColor: colors.surfaceMuted }]}>
          {downloadPct > 0 && (
            <View style={[styles.barSegment, { width: `${Math.max(downloadPct * barScale, minPercent)}%`, backgroundColor: colors.success }]} />
          )}
          {cachePct > 0 && (
            <View style={[styles.barSegment, { width: `${Math.max(cachePct * barScale, minPercent)}%`, backgroundColor: colors.blue }]} />
          )}
          {appDataPct > 0 && (
            <View style={[styles.barSegment, { width: `${Math.max(appDataPct * barScale, minPercent)}%`, backgroundColor: colors.brand, borderTopRightRadius: radius.full, borderBottomRightRadius: radius.full }]} />
          )}
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Downloads</Text>
            <Text style={[styles.legendValue, { color: colors.text }]}>{formatBytes(stats.downloads)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.blue }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Cache</Text>
            <Text style={[styles.legendValue, { color: colors.text }]}>{formatBytes(stats.cache)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.brand }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>App Data</Text>
            <Text style={[styles.legendValue, { color: colors.text }]}>{formatBytes(stats.appData)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.surfaceMuted }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Free</Text>
            <Text style={[styles.legendValue, { color: colors.text }]}>{formatBytes(stats.freeSpace)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Data & Storage</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <View style={styles.storageSection}>
          {renderStorageBar()}
        </View>

        <SettingsSection title="Free up space" colors={colors}>
          <SettingsActionRow
            icon={Database}
            label="Clear Cache"
            valueLabel={stats ? formatBytes(stats.cache) : ""}
            onPress={handleClearCache}
            colors={colors}
            isDark={isDark}
            isSelector={true}
          />
          <SettingsActionRow
            icon={History}
            label="Clear Playback History"
            valueLabel=""
            onPress={handleClearHistory}
            colors={colors}
            isDark={isDark}
            isSelector={true}
          />
          <SettingsActionRow
            icon={Trash2}
            label="Remove All Downloads"
            valueLabel={stats ? formatBytes(stats.downloads) : ""}
            onPress={handleDeleteAllDownloads}
            colors={colors}
            isDark={isDark}
            danger={true}
            isLast={true}
            isSelector={true}
          />
        </SettingsSection>
      </ScrollView>

      <AppConfirmSheet
        visible={sheetConfig.visible}
        title={sheetConfig.title}
        message={sheetConfig.message}
        onCancel={() => setSheetConfig(prev => ({ ...prev, visible: false }))}
        onConfirm={sheetConfig.onConfirm}
        isDestructive={true}
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
    paddingHorizontal: spacing.md,
  },
  storageSection: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  barWrapper: {
    marginTop: spacing.md,
  },
  barContainer: {
    height: 12,
    borderRadius: radius.full,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  barSegment: {
    height: '100%',
  },
  legendContainer: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.sm,
    marginRight: spacing.md,
  },
  legendText: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: typography.body,
    fontWeight: 'bold',
  },
});
