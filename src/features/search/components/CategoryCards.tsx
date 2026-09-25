import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Flame, BarChart2, Mic } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, spacing, radius, typography } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useExplorePage } from '@/features/explore/hooks/useExplorePage';
import { BrowseItem } from 'react-native-hyper-extractor';
import { usePlayerStore } from '@/store';

export const CategoryCards: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const playTrack = usePlayerStore(state => state.playTrack);
  const { data: shelves, isLoading } = useExplorePage('moods');

  const categories = React.useMemo(() => [
    { id: 'new', title: 'New Releases', color: colors.brand, Icon: Flame },
    { id: 'charts', title: 'Charts', color: '#8A2BE2', Icon: BarChart2 },
    { id: 'podcasts', title: 'Podcasts', color: '#2E8B57', Icon: Mic },
  ], [colors.brand]);

  const handlePress = (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category) {
      navigation.navigate('ExploreCategory', { categoryId: category.id, title: category.title });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: colors.text }]}>Browse all</Text>
      <View style={styles.grid}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.card]}
            activeOpacity={0.8}
            onPress={() => handlePress(category.id)}
          >
            <LinearGradient
              colors={[`${category.color}FF`, `${category.color}40`]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <category.Icon color={colors.white} size={32} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.white }]}>{category.title}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.header, { color: colors.text, marginTop: spacing.xl }]}>Moods & Genres</Text>
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={colors.brand} />
        </View>
      ) : shelves ? (
        <View style={styles.tileGrid}>
          {shelves.map((shelf) => {
            if (shelf.type === 'grid' && shelf.items?.length > 0 && shelf.items[0].type === 'genre') {
              return shelf.items.map((browseItem: BrowseItem, idx: number) => {
                const colorPalette = ['#8A2BE2', colors.brand, '#FF8C00', '#2E8B57', '#008080', '#4169E1', '#C71585', '#D2691E'];
                const tileColor = colorPalette[idx % colorPalette.length];
                
                return (
                  <Pressable
                    key={browseItem.id + idx}
                    style={[styles.genreTile, { backgroundColor: tileColor }]}
                    onPress={() => {
                      if (browseItem.type === 'genre') {
                        navigation.push('ExploreCategory', { categoryId: browseItem.id, title: browseItem.title });
                      } else if (browseItem.type === 'song' || browseItem.type === 'video' || browseItem.type === 'podcast') {
                        playTrack({ id: browseItem.id, title: browseItem.title, artist: browseItem.subtitle, artwork: browseItem.artworkUrl, url: '', duration: 0 } as any);
                      } else if (browseItem.type === 'album') {
                        navigation.navigate('AlbumDetails', { id: browseItem.id });
                      } else if (browseItem.type === 'playlist') {
                        navigation.navigate('PlaylistDetails', { id: browseItem.id });
                      } else if (browseItem.type === 'artist') {
                        navigation.navigate('ArtistProfile', { id: browseItem.id });
                      }
                    }}
                  >
                    <Text style={[styles.genreTileText, { color: colors.white, textShadowColor: 'rgba(0,0,0,0.3)' }]}>{browseItem.title}</Text>
                  </Pressable>
                );
              });
            }
            return null;
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  header: {
    fontSize: typography.title,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    height: 110,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: typography.bodyLg,
    fontWeight: 'bold',
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  loaderContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genreTile: {
    width: '48%',
    height: 80,
    borderRadius: radius.sm,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  genreTileText: {
    fontSize: typography.body,
    fontWeight: 'bold',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
