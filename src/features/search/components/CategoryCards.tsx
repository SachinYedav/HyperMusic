import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Flame, BarChart2, Smile, Mic } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, spacing, radius, typography } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';


export const CategoryCards: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const categories = React.useMemo(() => [
    { id: 'new', title: 'New Releases', color: colors.brand, Icon: Flame },
    { id: 'charts', title: 'Charts', color: '#8A2BE2', Icon: BarChart2 },
    { id: 'moods', title: 'Moods & Genres', color: '#FF8C00', Icon: Smile },
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
});
