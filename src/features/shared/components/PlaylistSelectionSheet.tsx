import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeDatabase } from '@/database/useSafeDatabase';
import { useTheme, spacing, radius, typography } from '@/theme';
import { usePlaylistSelectionStore } from '@/store/usePlaylistSelectionStore';
import { usePlaylists, Playlist } from '@/features/library/hooks/useLibrary';
import { createPlaylist, addTrackToPlaylist } from '@/features/library/services/libraryService';
import { Plus, CheckCircle2 } from 'lucide-react-native';
import { AppBottomSheet } from '@/ui/AppBottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Singleton bottom sheet controller governing user playlist creation, live database entry commits, and track-to-playlist associations.
 * Features robust layout race-condition prevention to guarantee precise keyboard dismissal and seamless state transitions without side effects.
 */
export function PlaylistSelectionSheet() {
  const { isOpen, trackToAdd, closeSheet } = usePlaylistSelectionStore();
  const { colors, isDark } = useTheme();
  const db = useSafeDatabase();
  const playlists = usePlaylists();
  const insets = useSafeAreaInsets();

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNewPlaylistName('');
      setIsProcessing(null);
    }
  }, [isOpen]);

  const handleCreatePlaylist = async () => {
    Keyboard.dismiss();
    if (!db || !newPlaylistName.trim() || !trackToAdd || isProcessing) return;
    setIsProcessing('create');

    setTimeout(async () => {
      const newId = await createPlaylist(db, newPlaylistName.trim());
      await addTrackToPlaylist(db, newId, trackToAdd);
      setIsProcessing(null);
      closeSheet();
    }, 150);
  };

  const handleSelectPlaylist = async (playlist: Playlist) => {
    Keyboard.dismiss();
    if (!db || !trackToAdd || isProcessing) return;
    setIsProcessing(playlist.id);

    setTimeout(async () => {
      await addTrackToPlaylist(db, playlist.id, trackToAdd);
      setIsProcessing(null);
      closeSheet();
    }, 150);
  };

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Add to Playlist</Text>

      <View style={styles.createContainer}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.highlightSubtle,
              borderColor: colors.highlight,
              borderWidth: 1
            }
          ]}
          placeholder="New playlist name..."
          placeholderTextColor={colors.textMuted}
          value={newPlaylistName}
          onChangeText={setNewPlaylistName}
          onSubmitEditing={handleCreatePlaylist}
          returnKeyType="done"
          editable={!isProcessing}
        />
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor: newPlaylistName.trim() && !isProcessing ? colors.brand : colors.highlight,
            }
          ]}
          disabled={!newPlaylistName.trim() || !!isProcessing}
          onPress={handleCreatePlaylist}
          activeOpacity={0.8}
        >
          {isProcessing === 'create' ? (
            <ActivityIndicator size="small" color={newPlaylistName.trim() && !isProcessing ? colors.background : colors.text} />
          ) : (
            <Plus color={newPlaylistName.trim() && !isProcessing ? colors.background : colors.textMuted} size={22} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <AppBottomSheet
      visible={isOpen}
      onClose={closeSheet}
      headerComponent={renderHeader()}
      scrollable={true}
      maxDynamicContentSize={SCREEN_HEIGHT * 0.75}
      keyboardAvoiding={true}
      detached={false}
    >
      <View style={[styles.listContent, { paddingBottom: insets.bottom + spacing.xxl, minHeight: SCREEN_HEIGHT * 0.4 }]}>
        {playlists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Playlists Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Create your first playlist above to start curating your collection.
            </Text>
          </View>
        ) : (
          playlists.map((item) => {
            const isTargetProcessing = isProcessing === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.playlistItem, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectPlaylist(item)}
                activeOpacity={0.7}
                disabled={!!isProcessing}
              >
                <View style={styles.playlistInfo}>
                  <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.trackCount, { color: colors.textMuted }]} numberOfLines={1}>
                    Saved Playlist
                  </Text>
                </View>
                {isTargetProcessing ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <CheckCircle2 color={colors.border} size={20} style={{ opacity: 0.4 }} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: typography.title,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  createContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    fontSize: typography.body,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    minHeight: 200,
  },
  emptyTitle: {
    fontSize: typography.bodyLg,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    fontSize: typography.bodySm,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playlistInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.md,
  },
  playlistName: {
    fontSize: typography.bodyLg,
    fontWeight: '600',
    marginBottom: 3,
  },
  trackCount: {
    fontSize: typography.captionLg,
  },
});
