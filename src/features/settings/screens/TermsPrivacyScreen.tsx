import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { termsData, privacyData, LegalDocument } from '@/assets/data/legal';

/**
 * Screen presenting user-facing legal declarations, privacy policies, and terms of service documentation.
 */
export function TermsPrivacyScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const activeDocument: LegalDocument = activeTab === 'terms' ? termsData : privacyData;

  return (
    <Screen disableSafeAreaBottom>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Legal</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.filterGroup}>
            <TouchableOpacity
              style={[styles.filterChip, activeTab === 'terms' && styles.filterChipActive]}
              onPress={() => setActiveTab('terms')}
            >
              <Text style={activeTab === 'terms' ? styles.filterTextActive : styles.filterText}>Terms</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, activeTab === 'privacy' && styles.filterChipActive]}
              onPress={() => setActiveTab('privacy')}
            >
              <Text style={activeTab === 'privacy' ? styles.filterTextActive : styles.filterText}>Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.documentHeader}>
          <Text style={styles.documentTitle}>{activeDocument.title}</Text>
          <Text style={styles.lastUpdated}>Last Updated: {activeDocument.lastUpdated}</Text>
        </View>

        {activeDocument.sections.map((section, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((paragraph, pIndex) => (
              <Text key={pIndex} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.text,
  },
  filterText: {
    fontSize: typography.bodySm,
    fontWeight: '600',
    color: colors.text,
  },
  filterTextActive: {
    fontSize: typography.bodySm,
    fontWeight: '600',
    color: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.lg,
    paddingBottom: 140,
  },
  documentHeader: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  documentTitle: {
    fontSize: typography.header,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    color: colors.text,
  },
  lastUpdated: {
    fontSize: typography.bodySm,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  paragraph: {
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.md,
    color: colors.textMuted,
  },
});
