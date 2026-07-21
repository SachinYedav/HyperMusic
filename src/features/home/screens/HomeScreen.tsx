import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme, typography, spacing } from '@/theme';
import { Screen } from '@/ui/Screen';
import { ErrorState } from '@/ui/ErrorState';
import { useHomeFeed } from '../hooks/useHomeFeed';
import { FlashList } from '@shopify/flash-list';
import { FilterChips } from '../components/FilterChips';
import { FeedCarousel } from '../components/FeedCarousel';
import { CategoryCards } from '@/features/search/components/CategoryCards';
import { LinearGradient } from 'expo-linear-gradient';
import { BrowseShelf } from 'react-native-hyper-extractor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

/**
 * Primary home exploration screen managing dynamic feed rendering, collapsible sticky headers, and taste filtering.
 */
export function HomeScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = React.useState<string>('All');
  const { data, isLoading, error, refetch, isRefetching } = useHomeFeed(selectedFilter);

  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerTitleStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 54], [0, -54], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, 40], [1, 0], Extrapolation.CLAMP);
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const filterChipsContainerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 54], [0, -54], Extrapolation.CLAMP);
    return {
      transform: [{ translateY }],
      backgroundColor: 'transparent',
    };
  });

  const renderSection = React.useCallback(({ item }: { item: any }) => (
    <FeedCarousel section={item as BrowseShelf} />
  ), []);

  const shelves = React.useMemo(() => {
    if (!data) return [];
    return data.shelves || [];
  }, [data]);

  return (
    <Screen disableSafeAreaTop disableSafeAreaBottom>
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[isDark ? 'rgba(138, 43, 226, 0.2)' : 'rgba(138, 43, 226, 0.05)', colors.background]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.5 }}
        />
      </View>

      <Animated.View style={[styles.header, { top: insets.top }, headerTitleStyle]}>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>HyperMusic</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.stickyFilterContainer, { top: insets.top + 54 }, filterChipsContainerStyle]}>
        <FilterChips selectedFilter={selectedFilter} onSelectFilter={setSelectedFilter} />
      </Animated.View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top + 110 }}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} containerStyle={{ paddingTop: insets.top + 110 }} />
        ) : (
          <AnimatedFlashList
            data={shelves}
            keyExtractor={(item: any, index: number) => item.title + '-' + index}
            renderItem={renderSection}
            // @ts-ignore: FlashList types are buggy in this version but the property is valid and required
            estimatedItemSize={300}
            drawDistance={1000}
            ListFooterComponent={<CategoryCards />}
            contentContainerStyle={{ paddingTop: insets.top + 110, paddingBottom: 170 }}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.brand}
                colors={[colors.brand]}
                progressViewOffset={insets.top + 110}
              />
            }
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    zIndex: 5,
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    paddingRight: 4,
  },
  headerTitleWrap: {
    minWidth: 126,
    paddingRight: spacing.sm,
  },
  stickyFilterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: spacing.xs,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: typography.body,
  },
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
});
