import React, { useMemo, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text, Linking, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, ExternalLink, FileBracesCorner, Box, User, Link } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography, radius } from '@/theme';
import type { SettingsStackParamList } from '@/navigation/types';
import { SettingsSection, SettingsActionRow } from '../components/SettingsComponents';

type Props = NativeStackScreenProps<SettingsStackParamList, 'LicenseDetail'>;

/**
 * Detail view for a single open-source dependency.
 */
export function LicenseDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const { licenseName, licenseVersion, licenseType, licenseText, repository, publisher } = route.params;

  const typeUpper = (licenseType || '').toUpperCase();
  const isGpl = typeUpper.includes('GPL') || typeUpper.includes('GNU') || typeUpper.includes('GENERAL PUBLIC LICENSE');

  const openRepository = useCallback(async () => {
    if (repository) {
      try {
        await Linking.openURL(repository);
      } catch {
        // Silently fail — browser not available
      }
    }
  }, [repository]);

  // 
  const ackBg = isGpl ? colors.warning + '18' : colors.blue + '14';
  const ackBorder = isGpl ? colors.warning + '44' : colors.blue + '44';
  const ackIconColor = isGpl ? colors.warning : colors.blue;
  const ackText = isGpl
    ? `This software is distributed under the ${licenseType} license. Redistribution of built binaries must satisfy the applicable source and notice obligations.`
    : `This software is distributed under the ${licenseType} license. We acknowledge and thank the open-source community for their contributions.`;

  return (
    <Screen disableSafeAreaBottom>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Details</Text>
        {!!repository && (
          <TouchableOpacity style={styles.headerRight} onPress={openRepository}>
            <ExternalLink color={colors.text} size={22} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.packageName}>{licenseName}</Text>
        <View style={[styles.versionPill, { backgroundColor: colors.blue + '22' }]}>
          <Text style={[styles.versionLabel, { color: colors.blue }]}>Version {licenseVersion}</Text>
        </View>

        <View style={styles.metaCard}>
          <SettingsSection colors={colors}>
            <SettingsActionRow
              icon={FileBracesCorner}
              label="License Type"
              valueLabel={licenseType}
              colors={colors}
              hideChevron
            />
            <SettingsActionRow
              icon={User}
              label="Publisher"
              valueLabel={publisher}
              colors={colors}
              hideChevron
            />
            {!!repository && (
              <SettingsActionRow
                icon={Link}
                label="Repository"
                valueLabel="View Source"
                onPress={openRepository}
                isLast
                colors={colors}
                hideChevron={false}
                isExternal={true}
              />
            )}
          </SettingsSection>
        </View>

        <View style={[styles.ackBox, { backgroundColor: ackBg, borderColor: ackBorder }]}>
          <Box color={ackIconColor} size={20} style={styles.ackIcon} />
          <Text style={[styles.ackText, { color: colors.text }]}>{ackText}</Text>
        </View>

        <Text style={[styles.legalSectionTitle, { color: colors.text }]}>Legal Notice</Text>
        <Text style={[styles.licenseText, { color: colors.textMuted }]}>
          {licenseText}
        </Text>

      </ScrollView>
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
    headerTitle: {
      flex: 1,
      fontSize: typography.title,
      fontWeight: 'bold',
    },
    headerRight: {
      padding: spacing.xs,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 140,
    },
    packageName: {
      fontSize: typography.header,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    versionPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      marginBottom: spacing.xl,
    },
    versionLabel: {
      fontSize: typography.captionLg,
      fontWeight: '600',
    },
    metaCard: {
      marginBottom: spacing.md,
    },
    ackBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: spacing.md,
      borderRadius: radius.md,
      marginBottom: spacing.xl,
      gap: spacing.md,
    },
    ackIcon: {
      marginTop: 2,
      flexShrink: 0,
    },
    ackText: {
      flex: 1,
      fontSize: typography.bodySm,
      lineHeight: 22,
    },
    legalSectionTitle: {
      fontSize: typography.subtitle,
      fontWeight: 'bold',
      marginBottom: spacing.md,
    },
    licenseText: {
      fontSize: typography.bodySm,
      fontFamily: 'monospace',
      lineHeight: 22,
    },
  });
