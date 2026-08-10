import React, { useCallback } from 'react';
import { FlatList, Dimensions, TouchableOpacity, TouchableHighlight, View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, typography, radius } from '@/theme';
import { TrackCard } from './TrackCard';
import { BrowseShelf, BrowseItem } from 'react-native-hyper-extractor';
import { usePlayerStore } from '@/store';
import { useNavigation } from '@react-navigation/native';
import { PremiumImage } from '@/ui/PremiumImage';
import { MoreVertical } from 'lucide-react-native';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { AnimatedEQ } from '@/ui/AnimatedEQ';
import { HeroBannerCard } from './HeroBannerCard';

interface FeedCarouselProps {
  section: BrowseShelf;
}

const { width } = Dimensions.get('window');
const QUICK_PICK_COL_WIDTH = width * 0.85; // 85% of screen width

// Helper to chunk array
const chunkArray = (arr: BrowseItem[], size: number) => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );
};

/**
 * Memoized horizontal carousel managing dynamic layout switching between multi-row Quick Pick grids and wide aspect ratio cards.
 */
export const FeedCarousel: React.FC<FeedCarouselProps> = React.memo(({ section }) => {
  if (section.type === 'grid' && section.items?.length > 0 && (section.items[0].type === 'playlist' || section.items[0].type === 'album')) {
    return <HeroBannerCard section={section} />;
  }

  const { colors } = useTheme();

  const playTrack = usePlayerStore(state => state.playTrack);
  const playList = usePlayerStore(state => state.playList);
  const activeTrack = usePlayerStore(state => state.activeTrack);
  const navigation = useNavigation<any>();

  const handleTrackPress = useCallback((item: BrowseItem) => {
    if (item.type === 'song' || item.type === 'video' || item.type === 'podcast') {
      const internalTrack = {
        id: item.id,
        title: item.title,
        artist: item.subtitle,
        duration: 0,
        artwork: item.artworkUrl,
        url: '',
        trackType: item.type,
      };
      // Always play as a single track so the Up Next radio engine fetches a fresh queue
      playTrack(internalTrack);
    } else if (item.type === 'album') {
      navigation.navigate('AlbumDetails', { id: item.id, name: item.title, coverUrl: item.artworkUrl });
    } else if (item.type === 'playlist') {
      navigation.navigate('PlaylistDetails', { id: item.id, name: item.title, coverUrl: item.artworkUrl });
    } else if (item.type === 'artist') {
      navigation.navigate('ArtistProfile', { id: item.id, artistName: item.title, artworkUrl: item.artworkUrl });
    } else if (item.type === 'podcast_show') {
      navigation.navigate('PodcastDetails', { id: item.id, name: item.title, coverUrl: item.artworkUrl });
    }
  }, [playTrack, navigation]);

  const handlePlayAll = useCallback(() => {
    const shelfSongs = section.items.filter((i: BrowseItem) => i.type === 'song' || i.type === 'video');
    if (shelfSongs.length > 0) {
      const internalTracks = shelfSongs.map((i: BrowseItem) => ({
        id: i.id,
        title: i.title,
        artist: i.subtitle,
        duration: 0,
        artwork: i.artworkUrl,
        url: '',
        trackType: i.type,
      }));
      playList(internalTracks as any[], 0);
    }
  }, [section.items, playList, section.title]);

  const handleOpenSheet = useCallback((track: BrowseItem) => {
    const contextType = (track.type === 'song' || track.type === 'video') ? 'track' : track.type as any;
    useActionSheetStore.getState().openSheet(
      contextType,
      {
        id: track.id,
        title: track.title,
        artist: track.subtitle,
        artworkUrl: track.artworkUrl,
        albumId: undefined,
        artistId: undefined
      }
    );
  }, []);

  // Determine if this shelf should be rendered as Quick Picks (Grid)
  const isQuickPicks = section.items.length > 0 && section.items.every((i: BrowseItem) => 
    i.type === 'song' || i.type === 'video' || i.type === 'podcast' || i.type === 'artist'
  );

  const chunks = React.useMemo(() => isQuickPicks ? chunkArray(section.items, 5) : [], [section.items, isQuickPicks]);

  const isSingleChunk = chunks.length === 1;
  const colWidth = isSingleChunk ? width - (spacing.md * 2) : QUICK_PICK_COL_WIDTH;
  const chunkSnapInterval = colWidth + (isSingleChunk ? 0 : spacing.md);

  const renderChunk = useCallback(({ item: chunk, index: chunkIndex }: { item: BrowseItem[], index: number }) => (
    <View style={{ width: colWidth, marginRight: isSingleChunk ? 0 : spacing.md }}>
      {chunk.map((track, trackIndex) => {
        const globalIndex = chunkIndex * 5 + trackIndex + 1;
        const isArtist = track.type === 'artist';
        const isPlaying = activeTrack?.id === track.id && (track.type === 'song' || track.type === 'video');
        return (
          <TouchableHighlight
            key={track.id}
            style={[styles.quickPickRow, { paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: radius.sm, marginHorizontal: -spacing.sm }]}
            onPress={() => handleTrackPress(track)}
            onLongPress={() => handleOpenSheet(track)}
            underlayColor={colors.brand + '20'}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {isArtist && (
                <Text style={{ width: 28, fontSize: typography.body, fontWeight: 'bold', color: colors.textMuted, textAlign: 'center', marginRight: spacing.sm }}>
                  {globalIndex}
                </Text>
              )}
              <View style={{ width: 48, height: 48 }}>
                <PremiumImage 
                  source={{ uri: track.artworkUrl }} 
                  contextType={isArtist ? 'artist' : (track.type === 'song' || track.type === 'video' ? 'track' : (track.type as any))}
                  style={[styles.quickPickImage, { width: '100%', height: '100%', backgroundColor: colors.border }, isArtist && { borderRadius: radius.full }]} 
                  fallbackIconSize={24}
                />
                {isPlaying && <AnimatedEQ isOverlay />}
              </View>
              <View style={styles.quickPickInfo}>
                <Text style={[styles.quickPickTitle, { color: colors.text }]} numberOfLines={1}>{track.title}</Text>
                <Text style={[styles.quickPickSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{track.subtitle}</Text>
              </View>
              <TouchableOpacity
                hitSlop={15}
                style={{ padding: 4 }}
                onPress={() => handleOpenSheet(track)}
              >
                <MoreVertical color={colors.text} size={20} />
              </TouchableOpacity>
            </View>
          </TouchableHighlight>
        );
      })}
    </View>
  ), [handleTrackPress, colors.text, colors.textMuted, activeTrack?.id, colWidth, isSingleChunk]);

  const renderCard = useCallback(({ item }: { item: BrowseItem }) => (
    <TrackCard track={item} onPress={handleTrackPress} onLongPress={handleOpenSheet} />
  ), [handleTrackPress, handleOpenSheet]);

  const showPlayAll = section.items.length > 0 && section.items.every((i: BrowseItem) => i.type === 'song' || i.type === 'video');

  const Header = () => (
    <View style={styles.headerRow}>
      <Text style={[styles.sectionTitle, { color: colors.text }]} numberOfLines={1}>
        {section.title}
      </Text>

      {showPlayAll ? (
        <TouchableOpacity
          style={styles.playAllBtn}
          onPress={handlePlayAll}
          hitSlop={10}
        >
          <Text style={[styles.playAllText, { color: colors.brand }]}>Play all</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (isQuickPicks) {
    return (
      <View style={styles.container}>
        <Header />
        <FlatList
          horizontal
          data={chunks}
          keyExtractor={(_, index) => `chunk-${index}`}
          renderItem={renderChunk}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          snapToInterval={chunkSnapInterval}
          decelerationRate="fast"
          getItemLayout={(data, index) => ({
            length: chunkSnapInterval,
            offset: chunkSnapInterval * index,
            index,
          })}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={true}
        />
      </View>
    );
  }

  const firstType = section.items[0]?.type;
  const cardWidth = firstType === 'video' ? width * 0.72 : firstType === 'podcast' ? width * 0.62 : 140;
  const snapInterval = cardWidth + spacing.md;

  return (
    <View style={styles.container}>
      <Header />

      <FlatList
        horizontal
        data={section.items}
        keyExtractor={(item, index) => item.id + '-' + index}
        renderItem={renderCard}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        getItemLayout={(data, index) => ({
          length: snapInterval,
          offset: snapInterval * index,
          index,
        })}
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.title,
    fontWeight: 'bold',
    flex: 1,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  playAllText: {
    fontSize: typography.bodySm,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  quickPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickPickImage: {
    width: 48,
    height: 48,
    borderRadius: radius.xs,
  },
  quickPickInfo: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  quickPickTitle: {
    fontSize: typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickPickSubtitle: {
    fontSize: typography.captionLg,
  },
});
