import React, { ReactNode, useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { motion, sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { animateTo, nativeDriver, easeOut } from '../motionUtils';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export type BottomSheetProps = {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    /** Hide the title row's close button only when the content provides its own clear exit */
    showClose?: boolean;
    /** Block scrim/Escape/swipe dismissal (e.g. while saving) */
    dismissable?: boolean;
};

/**
 * Secondary task surface. On phones it is a sheet from the bottom edge with a drag handle (drag down on the handle
 * to dismiss; content scrolling is never intercepted). From tablet width up it becomes a centred panel, because a
 * full-width bottom sheet on a large window is awkward to reach and to read. Escape, the scrim, the Android back
 * button and the close button all dismiss it unless `dismissable` is false.
 */
export function BottomSheet({ visible, onClose, title, children, showClose = true, dismissable = true }: BottomSheetProps) {
    const theme = useTheme();
    const reduced = useReducedMotion();
    const { isTabletUp, height } = useBreakpoint();
    const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
    const progress = useRef(new Animated.Value(0)).current;
    const drag = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            drag.setValue(0);
            animateTo(progress, 1, reduced, motion.duration.slow);
        } else {
            progress.setValue(0);
        }
    }, [visible, progress, drag, reduced]);

    const pan = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => dismissable && !isTabletUp,
                onMoveShouldSetPanResponder: (_e, g) => dismissable && !isTabletUp && Math.abs(g.dy) > 4,
                onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
                onPanResponderRelease: (_e, g) => {
                    if (g.dy > 90 || g.vy > 0.9) {
                        onClose();
                    } else {
                        Animated.timing(drag, { toValue: 0, duration: motion.duration.fast, easing: easeOut, useNativeDriver: nativeDriver }).start();
                    }
                }
            }),
        [dismissable, isTabletUp, drag, onClose]
    );

    const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [isTabletUp ? 12 : 120, 0] });

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={dismissable ? onClose : undefined} statusBarTranslucent accessibilityViewIsModal>
            <View style={{ flex: 1, justifyContent: isTabletUp ? 'center' : 'flex-end', alignItems: 'center', padding: isTabletUp ? theme.spacing.lg : 0 }}>
                <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: progress, backgroundColor: theme.colors.scrim }}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={dismissable ? onClose : undefined} style={{ flex: 1 }} />
                </Animated.View>

                <Animated.View
                    role="dialog"
                    aria-modal
                    accessibilityLabel={title}
                    style={{
                        width: '100%',
                        maxWidth: isTabletUp ? sizes.sheetMaxWidth : undefined,
                        maxHeight: Math.round(height * 0.88),
                        backgroundColor: theme.colors.surfaceRaised,
                        borderTopLeftRadius: theme.radii.lg,
                        borderTopRightRadius: theme.radii.lg,
                        borderBottomLeftRadius: isTabletUp ? theme.radii.lg : 0,
                        borderBottomRightRadius: isTabletUp ? theme.radii.lg : 0,
                        opacity: progress,
                        transform: [{ translateY: Animated.add(slide, drag) }],
                        ...theme.shadows.high
                    }}
                >
                    {!isTabletUp ? (
                        <View {...pan.panHandlers} style={{ alignItems: 'center', paddingTop: theme.spacing.smd, paddingBottom: theme.spacing.xs }}>
                            <View accessibilityElementsHidden importantForAccessibility="no" style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderStrong }} />
                        </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: theme.spacing.lg, paddingRight: theme.spacing.sm, paddingTop: isTabletUp ? theme.spacing.md : theme.spacing.xs, gap: theme.spacing.sm }}>
                        <AppText variant="sectionTitle" style={{ flex: 1 }} numberOfLines={2}>{title}</AppText>
                        {showClose ? <IconButton icon="close" label="Close" onPress={onClose} disabled={!dismissable} /> : null}
                    </View>
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg + (isTabletUp ? 0 : insets.bottom) }}
                    >
                        {children}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}
