import React, { useCallback, useRef } from 'react';
import { Modal, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, radius } from '@/theme';

interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  headerComponent?: React.ReactNode;
  scrollable?: boolean;
  maxDynamicContentSize?: number;
  /** Enable keyboard avoiding behavior for sheets that contain text inputs */
  keyboardAvoiding?: boolean;
  /** Whether the bottom sheet floats detached with margins (default: true) */
  detached?: boolean;
}

/**
 * Reusable modal bottom sheet implementing dynamic sizing, custom gesture detents, and scrollable content wrappers.
 * Features optimized Platform-specific keyboard avoiding to eliminate layout flickering upon dismissal.
 */
export function AppBottomSheet({
  visible,
  onClose,
  children,
  headerComponent,
  scrollable = false,
  maxDynamicContentSize,
  keyboardAvoiding = false,
  detached = true,
}: AppBottomSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

  const sheetContent = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        enableDynamicSizing={true}
        maxDynamicContentSize={maxDynamicContentSize}
        enablePanDownToClose={true}
        enableContentPanningGesture={!scrollable}
        detached={detached}
        bottomInset={detached ? insets.bottom + spacing.md : 0}
        style={detached ? { marginHorizontal: spacing.md } : { marginHorizontal: 0 }}
        onChange={handleSheetChanges}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderRadius: detached ? radius.lg : undefined,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.textMuted,
          width: 40,
          height: 4,
        }}
        animateOnMount={true}
      >
        {headerComponent}
        <ContentWrapper 
          style={[styles.contentContainer, !detached && { paddingBottom: insets.bottom + spacing.lg }]}
          contentContainerStyle={scrollable ? [styles.scrollContent, !detached && { paddingBottom: insets.bottom + spacing.lg }] : undefined}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ContentWrapper>
      </BottomSheet>
    </GestureHandlerRootView>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
        >
          {sheetContent}
        </KeyboardAvoidingView>
      ) : (
        sheetContent
      )}
    </Modal>
  );
}



const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
});
