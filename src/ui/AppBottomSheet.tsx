import React, { useCallback, useRef } from 'react';
import { Modal, StyleSheet, Platform, KeyboardAvoidingView, View, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, radius } from '@/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  headerComponent?: React.ReactNode;
  scrollable?: boolean;
  maxDynamicContentSize?: number;
  /** Enable keyboard avoiding behavior for sheets that contain text inputs */
  keyboardAvoiding?: boolean;
  /** Whether the bottom sheet floats detached with margins (default: true) */
  detached?: boolean;
  /** If provided, AppBottomSheet will render a BottomSheetFlatList instead of standard children */
  flatListProps?: any;
  /** Ensures the sheet never shrinks below a premium minimum height */
  minHeight?: number;
  /** Disables closing via swipe or backdrop tap */
  disableClose?: boolean;
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
  maxDynamicContentSize = SCREEN_HEIGHT * 0.85,
  keyboardAvoiding = false,
  detached = true,
  flatListProps,
  minHeight = 250,
  disableClose = false,
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
        pressBehavior={disableClose ? "none" : "close"}
      />
    ),
    [disableClose]
  );

  const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

  const sheetContent = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        enableDynamicSizing={true}
        maxDynamicContentSize={maxDynamicContentSize}
        keyboardBehavior={Platform.OS === 'ios' ? "interactive" : "extend"}
        enablePanDownToClose={!disableClose}
        enableContentPanningGesture={!(scrollable || !!flatListProps)}
        detached={detached}
        bottomInset={detached ? insets.bottom + spacing.md : 0}
        style={detached ? { marginHorizontal: spacing.md } : { marginHorizontal: 0 }}
        onChange={handleSheetChanges}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderRadius: detached ? radius.lg : undefined,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.textMuted,
          width: 40,
          height: 4,
        }}
        animateOnMount={true}
      >
        {headerComponent}
        {flatListProps ? (
          <BottomSheetFlatList
            {...flatListProps}
            scrollEnabled={flatListProps.data?.length > 0}
            contentContainerStyle={[
              { minHeight },
              flatListProps.contentContainerStyle
            ]}
          />
        ) : (
          <ContentWrapper 
            style={[styles.contentContainer, !detached && { paddingBottom: insets.bottom + spacing.lg }, { minHeight }]}
            contentContainerStyle={scrollable ? [styles.scrollContent, !detached && { paddingBottom: insets.bottom + spacing.lg }, { minHeight }] : undefined}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ContentWrapper>
        )}
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
