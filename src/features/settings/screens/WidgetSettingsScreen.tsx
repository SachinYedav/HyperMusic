import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { useToastStore } from '@/store';
import { useTheme, typography, spacing } from '@/theme';
import { Screen } from '@/ui/Screen';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { HyperPlayer, type WidgetStyle } from 'react-native-hyper-player';

import { BlurWidget } from '../components/widgets/BlurWidget';
import { MaterialWidget } from '../components/widgets/MaterialWidget';
import { SearchWidget } from '../components/widgets/SearchWidget';
import { ClassicWidget } from '../components/widgets/ClassicWidget';
import { PillWidget } from '../components/widgets/PillWidget';

const WIDGET_CATALOG: Array<{
  style: WidgetStyle;
  title: string;
  description: string;
  Component: React.ComponentType;
}> = [
    {
      style: 'material',
      title: 'Material You',
      description: 'Immersive full-card album art',
      Component: MaterialWidget,
    },
    {
      style: 'blur',
      title: 'Blurred Immersive',
      description: 'Elegant blurred background player',
      Component: BlurWidget,
    },
    {
      style: 'search',
      title: 'Search',
      description: 'Instant search and playback access',
      Component: SearchWidget,
    },
    {
      style: 'classic',
      title: 'Classic Player',
      description: 'Standard player for daily listening',
      Component: ClassicWidget,
    },
    {
      style: 'pill',
      title: 'Pill',
      description: 'Space-saving mini player',
      Component: PillWidget,
    },
  ];

export function WidgetSettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = DeviceEventEmitter.addListener('onWidgetPinSuccess', (event) => {
      const styleName = event.style?.toLowerCase();
      const catalogItem = WIDGET_CATALOG.find(w => w.style.toLowerCase() === styleName);
      const title = catalogItem ? catalogItem.title : 'Widget';
      useToastStore.getState().showToast(`${title} successfully added to home screen!`, 'success');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handlePinWidget = (style: WidgetStyle, title: string) => {
    if (Platform.OS === 'android') {
      const result = HyperPlayer.requestPinWidget(style);
      switch (result) {
        case 'requestStarted':
          // The OS handles showing the "Choose where to place..." UI
          break;
        case 'unsupported':
          useToastStore.getState().showToast('Your launcher does not support adding widgets from the app.', 'error');
          break;
        case 'failed':
          useToastStore.getState().showToast(`Could not start the ${title} widget request.`, 'error');
          break;
      }
    }
  };



  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Home Screen Widgets</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Tap any widget to instantly pin it to your Android home screen.
        </Text>

        {WIDGET_CATALOG.map(({ style, title, description, Component }) => (
          <TouchableOpacity
            key={style}
            activeOpacity={0.8}
            onPress={() => handlePinWidget(style, title)}
            accessibilityLabel={`Pin ${title} widget`}
            accessibilityRole="button"
            style={styles.widgetCard}
          >
            <View style={styles.labelContainer}>
              <Text style={[styles.label, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.subLabel, { color: colors.textMuted }]}>{description}</Text>
            </View>
            <Component />
          </TouchableOpacity>
        ))}
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
    paddingHorizontal: spacing.lg,
  },
  infoText: {
    fontSize: typography.body,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  widgetCard: {
    marginBottom: spacing.xl,
  },
  labelContainer: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.subtitle,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subLabel: {
    fontSize: typography.caption,
  }
});
