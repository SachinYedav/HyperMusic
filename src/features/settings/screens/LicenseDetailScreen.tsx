import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Text, Linking, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import type { SettingsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<SettingsStackParamList, 'LicenseDetail'>;

/**
 * Screen presenting exhaustive open source legal texts, copyright statements, and external repository links.
 */
export function LicenseDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const { licenseName, licenseText, repository } = route.params;

  const openRepository = async () => {
    if (repository) {
      try {
        await Linking.openURL(repository);
      } catch (err) {
        console.warn('Failed to open repository:', err);
      }
    }
  };

  return (
    <Screen disableSafeAreaBottom>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{licenseName}</Text>
        {!!repository && (
          <TouchableOpacity style={styles.headerRightAction} onPress={openRepository}>
            <ExternalLink color={colors.text} size={22} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.licenseText}>
          {licenseText}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
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
    color: colors.text,
  },
  headerRightAction: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 140,
  },
  licenseText: {
    fontSize: typography.bodySm,
    fontFamily: 'monospace',
    lineHeight: 22,
    color: colors.textMuted,
  },
});
