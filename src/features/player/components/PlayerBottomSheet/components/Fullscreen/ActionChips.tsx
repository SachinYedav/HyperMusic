import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Share2, Heart, ArrowDownToLine, BookmarkPlus, CheckCircle2 } from 'lucide-react-native';
import { darkColors } from '@/theme/colors';
import { useDownloadStore } from '@/features/library/store/useDownloadStore';
import { usePlaylistSelectionStore } from '@/store/usePlaylistSelectionStore';
import { shareContent } from '@/utils/shareUtils';
import { spacing, radius, typography } from '@/theme';
import { useToastStore } from '@/store/useToastStore';

/**
 * Horizontal scrollable row of action chips (Like, Download, Save, Share) 
 * positioned below the artwork in fullscreen mode.
 */
export const ActionChipsComponent = memo(({ activeTrack, isLiked, onToggleLike, onDownload, themeColors, isDownloaded, activeDownloadState }: { activeTrack: any, isLiked: boolean, onToggleLike: () => void, onDownload: () => void, themeColors: any, isDownloaded: boolean, activeDownloadState: any }) => {
  const isLocalTrack = activeTrack?.trackType?.startsWith('local_device');
  const handleLocalIntercept = () => {
    useToastStore.getState().showToast('Not available for local files', 'info');
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
      <TouchableOpacity style={[styles.chip, !isLiked && { opacity: 0.7 }, isLocalTrack && { opacity: 0.4 }]} onPress={isLocalTrack ? handleLocalIntercept : onToggleLike}>
        <Heart color={isLiked ? themeColors.brand : darkColors.white} fill={isLiked ? themeColors.brand : "transparent"} size={18} />
        <Text style={styles.chipText}>{isLiked ? "Liked" : "Like"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.chip, isLocalTrack && { opacity: 0.4 }]}
        onPress={isLocalTrack ? handleLocalIntercept : (activeDownloadState?.status === 'error' ? () => {
          useDownloadStore.getState().removeDownload(activeTrack.id);
          onDownload();
        } : onDownload)}
      >
        {isDownloaded ? (
          <CheckCircle2 color={themeColors.success} size={18} />
        ) : activeDownloadState ? (
          activeDownloadState.status === 'error' ? (
            <ArrowDownToLine color={themeColors.error} size={18} />
          ) : (
            <ActivityIndicator color={themeColors.brand} size="small" />
          )
        ) : (
          <ArrowDownToLine color={darkColors.white} size={18} />
        )}
        <Text style={[
          styles.chipText,
          isDownloaded && { color: themeColors.success },
          activeDownloadState?.status === 'error' && { color: themeColors.error },
          activeDownloadState && activeDownloadState.status !== 'error' && { color: themeColors.brand }
        ]}>
          {isDownloaded ? "Downloaded" : activeDownloadState ? (
            activeDownloadState.status === 'error' ? "Retry Download" : `Downloading ${Math.round(activeDownloadState.progress)}%`
          ) : "Download"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.chip, isLocalTrack && { opacity: 0.4 }]} onPress={() => {
        if (isLocalTrack) return handleLocalIntercept();
        if (activeTrack) usePlaylistSelectionStore.getState().openSheet(activeTrack);
      }}>
        <BookmarkPlus color={darkColors.white} size={18} />
        <Text style={styles.chipText}>Save</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.chip, isLocalTrack && { opacity: 0.4 }]} onPress={() => {
        if (isLocalTrack) return handleLocalIntercept();
        if (activeTrack) shareContent('track', activeTrack.id, activeTrack.title || '');
      }}>
        <Share2 color={darkColors.white} size={18} />
        <Text style={styles.chipText}>Share</Text>
      </TouchableOpacity>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  chipsScroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.lg, gap: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: darkColors.highlight, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.xl, gap: spacing.sm },
  chipText: { color: darkColors.white, fontSize: typography.bodySm, fontWeight: '600' },
});
