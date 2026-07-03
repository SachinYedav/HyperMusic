import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme, spacing, typography } from '@/theme';
import { usePlayerStore } from '@/store';
import { BrowseItem } from 'react-native-hyper-extractor';

interface HeroBannerCardProps {
  section: {
    title: string;
    items: BrowseItem[];
  };
}

const { width } = Dimensions.get('window');

/**
 * High-impact featured item showcase card supporting 1:1 aspect ratio layouts and dynamic entity navigation routing.
 */
export const HeroBannerCard: React.FC<HeroBannerCardProps> = React.memo(({ section }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const playTrack = usePlayerStore(state => state.playTrack);

  if (!section.items || section.items.length === 0) return null;

  const handlePress = useCallback((featured: BrowseItem) => {
    if (featured.type === 'song' || featured.type === 'video' || featured.type === 'podcast') {
      playTrack({
        id: featured.id,
        title: featured.title,
        artist: featured.subtitle,
        artwork: featured.artworkUrl,
        url: '',
        duration: 0,
      });
    } else if (featured.type === 'album') {
      navigation.navigate('AlbumDetails', { id: featured.id });
    } else if (featured.type === 'playlist') {
      navigation.navigate('PlaylistDetails', { id: featured.id });
    } else if (featured.type === 'artist') {
      navigation.navigate('ArtistProfile', { id: featured.id });
    }
  }, [playTrack, navigation]);

  const isSingle = section.items.length === 1;
  const cardWidth = isSingle ? width - spacing.md * 2 : width * 0.85;

  const renderItem = useCallback(({ item }: { item: BrowseItem }) => (
    <Pressable style={[styles.card, { width: cardWidth }]} onPress={() => handlePress(item)}>
      <Image source={{ uri: item.artworkUrl }} style={styles.image} contentFit="cover" />
      <LinearGradient colors={['transparent', colors.overlayDark]} style={styles.gradient} />
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.white }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.subtitle, { color: colors.white, opacity: 0.8 }]} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        <View style={[styles.exploreBtn, { backgroundColor: colors.brand }]}>
          <Text style={[styles.exploreText, { color: colors.white }]}>Explore</Text>
        </View>
      </View>
    </Pressable>
  ), [cardWidth, colors.brand, handlePress]);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
      <FlatList
        data={section.items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, idx) => item.id + '-' + idx}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        snapToInterval={cardWidth + spacing.md}
        decelerationRate="fast"
        getItemLayout={(data, index) => ({
          length: cardWidth + spacing.md,
          offset: (cardWidth + spacing.md) * index,
          index,
        })}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={true}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.header,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  card: {
    aspectRatio: 1, 
    maxHeight: 360,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  image: {
    ...StyleSheet.absoluteFill as any,
  },
  gradient: {
    ...StyleSheet.absoluteFill as any,
  },
  content: {
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.title,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: typography.bodySm,
  },
  exploreBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exploreText: {
    fontWeight: 'bold',
    fontSize: typography.bodySm,
  },
});
