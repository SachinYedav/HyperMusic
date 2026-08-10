import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { Screen } from '@/ui/Screen';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme';
import type { SettingsStackParamList } from '@/navigation/types';
import { useLicenses } from '../hooks/useLicenses';
import { LicenseRow } from '../components/LicenseRow';

/**
 * Renders the full catalog of open-source dependency declarations.
 */
export function LicensesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { sortedLicenses, totalCount, gplCount, openDetail } = useLicenses();

  return (
    <Screen disableSafeAreaBottom>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Open Source</Text>
          <Text style={styles.headerSubtitle}>
            {totalCount} packages · {gplCount} GPL
          </Text>
        </View>
      </View>

      <FlashList
        data={sortedLicenses}
        keyExtractor={(item) => item.id}
        // @ts-ignore: FlashList types are unstable in this version
        estimatedItemSize={72}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <LicenseRow item={item} colors={colors} onPress={openDetail} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
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
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: typography.title,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    listContent: {
      paddingBottom: spacing.xxl,
    }
  });
