import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, User } from 'lucide-react-native';
import { AppBottomSheet } from '@/ui/AppBottomSheet';
import { useArtistSelectionStore } from '@/store/useArtistSelectionStore';
import { usePlayerStore } from '@/store';
import { useTheme, spacing, typography, radius } from '@/theme';

export function ArtistSelectionSheet() {
  const { visible, artists, closeSheet } = useArtistSelectionStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { colors } = useTheme();

  const handleSelectArtist = (artistId: string, artistName: string) => {
    closeSheet();
    setTimeout(() => {
      usePlayerStore.getState().collapsePlayer();
      navigation.navigate('ArtistProfile', {
        id: artistId,
        artistName: artistName,
        artworkUrl: undefined, // Will use default fallback in ArtistProfile
      });
    }, 50);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Artists</Text>
    </View>
  );

  return (
    <AppBottomSheet
      visible={visible}
      onClose={closeSheet}
      headerComponent={renderHeader()}
      detached={false}
      flatListProps={{
        data: artists,
        keyExtractor: (item: any) => item.id,
        contentContainerStyle: [styles.container, { paddingBottom: spacing.xxl }],
        showsVerticalScrollIndicator: false,
        renderItem: ({ item, index }: { item: any, index: number }) => (
          <TouchableOpacity
            style={[
              styles.artistRow,
              index !== artists.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
            onPress={() => handleSelectArtist(item.id, item.name)}
            activeOpacity={0.7}
          >
            <View style={styles.artistInfo}>
              <View style={[styles.imageFallback, { backgroundColor: colors.surfaceMuted }]}>
                <User size={22} color={colors.text} />
              </View>
              <Text style={[styles.artistName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )
      }}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  headerTitle: {
    fontSize: typography.header,
    fontWeight: '700',
  },
  container: {
    paddingHorizontal: spacing.md,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  artistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  imageFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  artistName: {
    fontSize: typography.subtitle,
    fontWeight: '600',
    flex: 1,
  },
});
