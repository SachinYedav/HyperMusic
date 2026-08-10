import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme, spacing, typography } from '@/theme';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { PremiumImage } from '@/ui/PremiumImage';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Play, Shuffle, Bookmark, MoreVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { WaveLoader } from '@/ui/WaveLoader';
import { ErrorState } from '@/ui/ErrorState';
import { AppConfirmSheet } from '@/ui/AppConfirmSheet';
import { BatchDownloadButton } from '@/features/library/components/BatchDownloadButton';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { downloadService } from '@/features/library/services/downloadService';

const HEADER_MAX_HEIGHT = 350;
const HEADER_MIN_HEIGHT = 90;
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

export interface CollectionDetailsTemplateProps {
  title: string;
  artworkUrl: string;
  dominantColor: string;
  subtitleComponent?: React.ReactNode;

  tracks: any[];
  mappedTracks: any[];

  isSaved: boolean;
  onSave: () => void;

  collectionId: string;
  collectionType: 'playlist' | 'album' | 'podcast';

  isLoading: boolean;
  error: any;
  onRetry: () => void;

  renderItem: (props: { item: any; index: number }) => React.ReactElement;
  ListHeaderComponent?: React.ReactNode;

  onPlay: (tracks: any[]) => void;
  onShuffle: (tracks: any[]) => void;
}

export function CollectionDetailsTemplate({
  title,
  artworkUrl,
  dominantColor,
  subtitleComponent,
  tracks,
  mappedTracks,
  isSaved,
  onSave,
  collectionId,
  collectionType,
  isLoading,
  error,
  onRetry,
  renderItem,
  ListHeaderComponent,
  onPlay,
  onShuffle
}: CollectionDetailsTemplateProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scrollY = useSharedValue(0);
  const { openSheet } = useActionSheetStore();
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const db = useSafeDatabase();



  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(
        scrollY.value,
        [-100, 0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
        [HEADER_MAX_HEIGHT + 100, HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
        Extrapolation.CLAMP
      ),
    };
  });

  const imageOpacityStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT - 50],
        [1, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  const titleOpacityStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT - 50, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
        [0, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  if (isLoading && tracks.length === 0 && (!title || title === 'Loading...')) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <WaveLoader />
      </View>
    );
  }

  if (error && tracks.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ErrorState error={error} onRetry={onRetry} />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.infoSection}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitleComponent}

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.playBtn, { backgroundColor: colors.text }]}
          onPress={() => {
            if (mappedTracks.length > 0) onPlay(mappedTracks);
          }}
        >
          <Play color={colors.background} size={22} fill={colors.background} />
          <Text style={[styles.playBtnText, { color: colors.background }]}>Play</Text>
        </Pressable>

        <Pressable
          style={[styles.circleBtn, { backgroundColor: colors.border }]}
          onPress={() => {
            if (mappedTracks.length > 0) onShuffle(mappedTracks);
          }}
        >
          <Shuffle color={colors.text} size={20} />
        </Pressable>

        <Pressable
          style={[styles.circleBtn, { backgroundColor: colors.border }]}
          onPress={onSave}
        >
          <Bookmark color={colors.text} size={20} fill={isSaved ? colors.text : 'transparent'} />
        </Pressable>

        <BatchDownloadButton
          collectionId={collectionId}
          mappedTracks={mappedTracks}
          onPressDownload={() => {
            if (mappedTracks.length > 0) setShowDownloadConfirm(true);
          }}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.headerContainer, headerStyle, { backgroundColor: dominantColor }]}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', colors.background]}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.imageContainer, imageOpacityStyle]}>
          <PremiumImage
            source={{ uri: artworkUrl }}
            contextType={collectionType === 'podcast' ? 'podcast' : collectionType === 'album' ? 'album' : 'playlist'}
            style={[styles.headerImage, { backgroundColor: colors.border }]}
            fallbackIconSize={48}
          />
        </Animated.View>

      </Animated.View>

      <Animated.View style={[styles.topBar, { paddingTop: insets.top, paddingBottom: spacing.sm }]}>
        <Pressable
          style={styles.iconBtnDirect}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color={colors.text} size={28} />
        </Pressable>
        <Animated.Text style={[styles.headerTitle, { color: colors.text }, titleOpacityStyle]} numberOfLines={1}>
          {title}
        </Animated.Text>
        <Pressable
          hitSlop={12}
          style={styles.iconBtnDirect}
          onPress={() => openSheet(collectionType, {
            id: collectionId,
            name: title,
            coverUrl: artworkUrl
          })}
        >
          <MoreVertical color={colors.text} size={28} />
        </Pressable>
      </Animated.View>

      <AnimatedFlashList
        data={tracks}
        keyExtractor={(item: any, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        // @ts-ignore
        estimatedItemSize={60}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: HEADER_MAX_HEIGHT,
          paddingBottom: insets.bottom + 100,
        }}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {ListHeaderComponent}
          </>
        }
        ListEmptyComponent={isLoading ? <WaveLoader /> : undefined}
      />

      <AppConfirmSheet
        visible={showDownloadConfirm}
        title="Download Collection?"
        message={`This will download ${mappedTracks.length} tracks to your device for offline listening. Audio will be prioritized.`}
        confirmText="Download"
        cancelText="Cancel"
        onConfirm={() => {
          if (db && mappedTracks.length > 0) {
            downloadService.startBatchDownload(db, mappedTracks);
          }
          setShowDownloadConfirm(false);
        }}
        onCancel={() => setShowDownloadConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerImage: {
    width: 250,
    height: 250,
    borderRadius: 8,
    marginTop: 40,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  iconBtnDirect: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  infoSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  playBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 40,
    gap: spacing.xs,
  },
  playBtnText: {
    fontSize: typography.bodyLg,
    fontWeight: 'bold',
  },
  circleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
