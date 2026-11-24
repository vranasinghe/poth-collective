import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { motion, sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { animateTo } from '../motionUtils';
import { AppText } from './AppText';
import { PrimaryButton, SecondaryButton } from './Buttons';

export type DialogAction = {
    label: string;
    onPress: () => void;
    /** primary: main choice. danger: destructive choice. cancel: dismiss without acting. */
    tone?: 'primary' | 'danger' | 'cancel';
    loading?: boolean;
};

export type DialogProps = {
    visible: boolean;
    title: string;
    message?: string;
    actions: DialogAction[];
    /** Called for the scrim, Escape and the Android back button */
    onDismiss: () => void;
    /** When false the dialog can only be closed with its buttons (use while an action is pending) */
    dismissable?: boolean;
};

/**
 * Modal dialog with a scrim, built on React Native's Modal (so on web it is portalled, traps keyboard focus and
 * closes on Escape). It fades and scales in with an exponential ease-out; with reduced motion it simply appears.
 */
export function Dialog({ visible, title, message, actions, onDismiss, dismissable = true }: DialogProps) {
    const theme = useTheme();
    const reduced = useReducedMotion();
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) animateTo(progress, 1, reduced, motion.duration.normal);
        else progress.setValue(0);
    }, [visible, progress, reduced]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={dismissable ? onDismiss : undefined}
            statusBarTranslucent
            accessibilityViewIsModal
        >
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg }}>
                <Pressable
                    accessibilityLabel="Dismiss dialog"
                    accessibilityRole="button"
                    onPress={dismissable ? onDismiss : undefined}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.scrim }}
                />
                <Animated.View
                    role="alertdialog"
                    aria-modal
                    accessibilityLabel={title}
                    style={{
                        width: '100%',
                        maxWidth: sizes.dialogMaxWidth,
                        padding: theme.spacing.lg,
                        gap: theme.spacing.md,
                        borderRadius: theme.radii.lg,
                        backgroundColor: theme.colors.surfaceRaised,
                        opacity: progress,
                        transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
                        ...theme.shadows.high
                    }}
                >
                    <AppText variant="sectionTitle" accessibilityRole="header">{title}</AppText>
                    {message ? <AppText variant="body" color="textSecondary">{message}</AppText> : null}
                    <View style={{ flexDirection: actions.length > 2 ? 'column' : 'row', gap: theme.spacing.smd, marginTop: theme.spacing.xs }}>
                        {actions.map((a) =>
                            a.tone === 'cancel' ? (
                                <SecondaryButton key={a.label} title={a.label} onPress={a.onPress} fullWidth style={actions.length > 2 ? undefined : { flex: 1 }} />
                            ) : (
                                <PrimaryButton key={a.label} title={a.label} tone={a.tone === 'danger' ? 'danger' : 'default'} onPress={a.onPress} loading={a.loading} fullWidth style={actions.length > 2 ? undefined : { flex: 1 }} />
                            )
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

export type ConfirmationDialogProps = {
    visible: boolean;
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** `danger` for destructive confirmations: the confirm button turns red and names the action */
    tone?: 'default' | 'danger';
    /** Pending: the confirm button shows a spinner and the dialog cannot be dismissed until it finishes */
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

/** Ask before something irreversible. Name the action on the button ("Delete shop"), not "OK". */
export function ConfirmationDialog({ visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default', loading, onConfirm, onCancel }: ConfirmationDialogProps) {
    return (
        <Dialog
            visible={visible}
            title={title}
            message={message}
            dismissable={!loading}
            onDismiss={onCancel}
            actions={[
                { label: cancelLabel, tone: 'cancel', onPress: onCancel },
                { label: confirmLabel, tone: tone === 'danger' ? 'danger' : 'primary', onPress: onConfirm, loading }
            ]}
        />
    );
}
