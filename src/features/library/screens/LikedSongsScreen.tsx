import React, { useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, typography, spacing, radius } from '@/theme';
import { Screen } from '@/ui/Screen';
import { PremiumImage } from '@/ui/PremiumImage';
import { useLikedSongs } from '@/features/library/hooks/useLibrary';
import { ArrowLeft, MoreVertical, Play, Shuffle, Heart } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '@/store';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { FlashList } from '@shopify/flash-list';
import { AnimatedEQ } from '@/ui/AnimatedEQ';
import { useImageColors } from '@/hooks/useImageColors';

const LikedSongRow = memo(({ item, index, colors, isPlaying, onPlay, onMorePress }: { item: any, index: number, colors: any, isPlaying: boolean, onPlay: (item: any, index: number) => void, onMorePress: (item: any) => void }) => {
  return (
    <TouchableOpacity style={[styles.itemContainer, { borderBottomColor: colors.border }]} onPress={() => onPlay(item, index)} activeOpacity={0.7}>
      {isPlaying ? (
        <View style={{ width: 24, alignItems: 'center', marginRight: spacing.sm }}>
          <AnimatedEQ />
        </View>
      ) : (
        <Text style={[styles.serialText, { color: colors.textMuted }]}>{index + 1}</Text>
      )}
      <PremiumImage source={item.localArtworkPath ? { uri: item.localArtworkPath } : item.artworkUrl} contextType="track" style={[styles.artwork, { backgroundColor: colors.highlightSubtle }]} fallbackIconSize={20} />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <TouchableOpacity style={styles.actionBtn} hitSlop={10} onPress={() => onMorePress(item)}>
        <MoreVertical color={colors.text} size={20} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export function LikedSongsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const playList = usePlayerStore(state => state.playList);
  const activeTrack = usePlayerStore(state => state.activeTrack);
  const { openSheet } = useActionSheetStore();
  const likedSongs = useLikedSongs();
  const firstTrack = likedSongs[0] as any;
  const rawLocal = firstTrack?.localArtworkPath;
  const firstTrackArtwork = rawLocal ? (rawLocal.startsWith('file://') ? rawLocal : `file://${rawLocal}`) : firstTrack?.artworkUrl;

  const { dominantColor } = useImageColors(firstTrackArtwork, { fallback: colors.brand });

  const getMappedQueue = useCallback(() => {
    return likedSongs.map((t: any) => ({
      ...t,
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      artwork: t.localArtworkPath ? (t.localArtworkPath.startsWith('file://') ? t.localArtworkPath : `file://${t.localArtworkPath}`) : t.artworkUrl,
      url: t.localFilePath ? (t.localFilePath.startsWith('file://') ? t.localFilePath : `file://${t.localFilePath}`) : '',
      trackType: t.trackType || 'song',
    }));
  }, [likedSongs]);

  const handlePlay = useCallback((track: any, index: number) => {
    playList(getMappedQueue(), index);
  }, [getMappedQueue, playList]);

  const handleShuffle = useCallback(() => {
    if (likedSongs.length === 0) return;
    playList(getMappedQueue(), 0, true);
  }, [getMappedQueue, playList, likedSongs.length]);

  const handlePlayAll = useCallback(() => {
    if (likedSongs.length === 0) return;
    playList(getMappedQueue(), 0);
  }, [getMappedQueue, playList, likedSongs.length]);



  const handleMorePress = useCallback((track: any) => {
    openSheet('track', track);
  }, [openSheet]);

  return (
    <Screen disableSafeAreaBottom>
      <LinearGradient
        colors={[dominantColor, colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <FlashList
          data={likedSongs}
          keyExtractor={(item) => `liked_${item.id}`}
          contentContainerStyle={{ paddingBottom: 170 }}
          showsVerticalScrollIndicator={false}
          //@ts-ignore
          estimatedItemSize={70}
          ListHeaderComponent={
            likedSongs.length > 0 ? (
              <View style={styles.heroContainer}>
                {firstTrackArtwork && (
                  <View style={styles.headerImageWrapper}>
                    <View style={[styles.headerImageShadow, { shadowColor: colors.black }]}>
                      <PremiumImage
                        source={{ uri: firstTrackArtwork }}
                        contextType="playlist"
                        style={styles.headerImage}
                        fallbackIconSize={60}
                      />
                    </View>
                  </View>
                )}
                <Text style={[styles.heroTitle, { color: colors.text, textAlign: 'center' }]}>Liked Songs</Text>
                <Text style={[styles.heroSubtitle, { color: colors.textMuted, textAlign: 'center' }]}>{likedSongs.length} songs</Text>

                <View style={styles.controlsRow}>
                  <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.white, flex: 1 }]} onPress={handlePlayAll}>
                    <Play fill={colors.background} color={colors.background} size={24} />
                    <Text style={[styles.controlText, { color: colors.background }]}>Play All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.highlightStrong, flex: 1 }]} onPress={handleShuffle}>
                    <Shuffle color={colors.text} size={24} />
                    <Text style={[styles.controlText, { color: colors.text }]}>Shuffle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Heart color={colors.textMuted} size={64} style={{ marginBottom: spacing.md }} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No Liked Songs</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Songs you like will appear here.
              </Text>
            </View>
          }

          renderItem={({ item, index }) => (
            <LikedSongRow
              item={item}
              index={index}
              colors={colors}
              isPlaying={activeTrack?.id === item.id}
              onPlay={handlePlay}
              onMorePress={handleMorePress}
            />
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  heroContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: typography.body,
    marginBottom: spacing.lg,
  },
  headerImageWrapper: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerImageShadow: {
    elevation: 15,
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    borderRadius: radius.md,
  },
  headerImage: {
    width: 200,
    height: 200,
    borderRadius: radius.sm,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  controlText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  serialText: {
    fontSize: typography.body,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
    marginRight: spacing.sm,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: radius.xs,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  artist: {
    fontSize: typography.captionLg,
    marginTop: 2,
  },
  actionBtn: {
    padding: spacing.sm,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteActionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: typography.title,
    fontWeight: 'bold',
  },
  emptySub: {
    fontSize: typography.body,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
