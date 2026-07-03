import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { Screen } from '@/ui/Screen';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import type { SettingsStackParamList } from '@/navigation/types';
import licensesData from '@/assets/data/licenses.json';

/**
 * Dynamic catalog rendering open source dependency declarations and corresponding licensing attributes.
 */
export function LicensesScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  return (
    <Screen disableSafeAreaBottom>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Open Source</Text>
      </View>

      <FlashList
        data={licensesData}
        keyExtractor={(item) => item.id}
        // @ts-ignore: FlashList types are buggy in this version but required
        estimatedItemSize={70}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.licenseRow,
              pressed && styles.licenseRowPressed
            ]}
            onPress={() => navigation.navigate('LicenseDetail', {
              licenseId: item.id,
              licenseName: item.name,
              licenseText: item.licenseText,
              repository: item.repository
            })}
          >
            <View style={styles.licenseInfo}>
              <Text style={styles.licenseName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.licenseVersion}>v{item.version}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.licenseType.length > 12 ? item.licenseType.substring(0, 12) + '...' : item.licenseType}
              </Text>
            </View>
            <ChevronRight color={colors.textMuted} size={20} style={{ marginLeft: 8 }} />
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
    fontSize: typography.title,
    fontWeight: 'bold',
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
    paddingBottom: 140,
  },
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  licenseRowPressed: {
    backgroundColor: isDark ? '#2A2A2A' : '#F2F2F2',
  },
  licenseInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  licenseName: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  licenseVersion: {
    fontSize: typography.bodySm,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.brand + '15',
  },
  badgeText: {
    fontSize: typography.bodySm,
    color: colors.brand,
    fontWeight: '600',
  },
});
