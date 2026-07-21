import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, spacing, radius, typography } from '@/theme';
import { ExtractedTrack } from 'react-native-hyper-extractor';
import { MoreVertical } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useActionSheetStore } from '@/store/useActionSheetStore';
import { AnimatedEQ } from '@/ui/AnimatedEQ';

interface TrackResultCardProps {
  track: ExtractedTrack;
  onPress: (track: ExtractedTrack) => void;
  isPlaying?: boolean;
}

export const TrackResultCard: React.FC<TrackResultCardProps> = React.memo(({ track, onPress, isPlaying = false }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { openSheet } = useActionSheetStore();

  const handleArtistPress = () => {
    if (track.artistId) {
      navigation.navigate('ArtistProfile', { id: track.artistId });
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(track)}
      activeOpacity={0.7}
    >
      <View>
        <Image 
          source={track.artworkUrl} 
          style={[styles.artwork, { backgroundColor: colors.border }]} 
          contentFit="cover"
          transition={200}
        />
        {isPlaying && (
          <View style={[StyleSheet.absoluteFill, { borderRadius: radius.xs, overflow: 'hidden' }]}>
            <AnimatedEQ isOverlay />
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {track.title}
        </Text>
        <TouchableOpacity 
          onPress={handleArtistPress} 
          disabled={!track.artistId}
          hitSlop={{ top: 5, bottom: 5, left: 0, right: 0 }}
        >
          <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>
            {track.artist}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        style={styles.moreButton} 
        hitSlop={10}
        onPress={() => openSheet('track', track)}
      >
        <MoreVertical color={colors.text} size={20} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: radius.xs,
  },
  infoContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.body,
    fontWeight: '500',
  },
  artist: {
    fontSize: typography.captionLg,
    marginTop: 2,
  },
  moreButton: {
    padding: spacing.xs,
  },
});
