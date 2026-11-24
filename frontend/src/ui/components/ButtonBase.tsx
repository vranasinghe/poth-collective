import React from 'react';
import { ActivityIndicator, GestureResponderEvent, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { motion, sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { focusRingStyle, hitSlopFor, useInteraction, webPointer } from '../interaction';
import { AppText, TextColor } from './AppText';
import { Icon, IconName } from './Icon';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonBaseVariant = 'primary' | 'danger' | 'outline' | 'tonal';

export type ButtonProps = {
    title: string;
    onPress?: (event: GestureResponderEvent) => void;
    /** Leading icon */
    icon?: IconName;
    /** Trailing icon (e.g. an arrow) */
    iconRight?: IconName;
    size?: ButtonSize;
    /** Stretch to the width of the container (default for the form-width layouts) */
    fullWidth?: boolean;
    /** Pending: shows a spinner, ignores presses and tells assistive tech the control is busy */
    loading?: boolean;
    disabled?: boolean;
    /** Defaults to the title. Set when the visible text is not enough ("Add The Hobbit to cart"). */
    accessibilityLabel?: string;
    accessibilityHint?: string;
    testID?: string;
    style?: StyleProp<ViewStyle>;
};

type Internal = ButtonProps & { variant: ButtonBaseVariant };

/**
 * Shared implementation of PrimaryButton and SecondaryButton. Press feedback is a plain style change (colour and a
 * 2% scale) rather than a JS-driven animation, so it can never delay a tap. Hover and keyboard focus are web-only.
 */
export function ButtonBase({
    variant, title, onPress, icon, iconRight, size = 'md', fullWidth, loading, disabled,
    accessibilityLabel, accessibilityHint, testID, style
}: Internal) {
    const theme = useTheme();
    const c = theme.colors;
    const { hovered, focusVisible, handlers } = useInteraction();
    const inactive = !!disabled || !!loading;
    const height = sizes.button[size];

    const palette = (pressed: boolean) => {
        if (disabled) {
            return { bg: c.disabledFill, fg: 'textDisabled' as TextColor, border: 'transparent' };
        }
        switch (variant) {
            case 'danger':
                // Danger has no darker token: pressed and hover dim the fill slightly instead (see `opacity` below)
                return { bg: c.status.danger.solid, fg: 'onPrimary' as TextColor, border: 'transparent' };
            case 'outline':
                return { bg: pressed ? c.primarySoft : hovered ? c.hoverOverlay : 'transparent', fg: 'primary' as TextColor, border: c.borderStrong };
            case 'tonal':
                return { bg: pressed ? c.pressedOverlay : c.surfaceMuted, fg: 'primary' as TextColor, border: 'transparent' };
            default:
                return { bg: pressed ? c.primaryPressed : hovered ? c.primaryHover : c.primary, fg: 'onPrimary' as TextColor, border: 'transparent' };
        }
    };

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: inactive, busy: !!loading }}
            disabled={inactive}
            onPress={inactive ? undefined : onPress}
            hitSlop={hitSlopFor(height)}
            testID={testID}
            {...handlers}
            style={({ pressed }) => {
                const p = palette(pressed);
                return [
                    {
                        minHeight: height,
                        paddingHorizontal: size === 'sm' ? theme.spacing.md : theme.spacing.lg,
                        borderRadius: sizes.buttonRadius,
                        borderWidth: variant === 'outline' ? 1.5 : 0,
                        borderColor: p.border,
                        backgroundColor: p.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: theme.spacing.sm,
                        alignSelf: fullWidth ? 'stretch' : 'flex-start',
                        opacity: variant === 'danger' && !inactive ? (pressed ? 0.82 : hovered ? 0.92 : 1) : 1,
                        transform: [{ scale: pressed && !inactive ? motion.pressScale : 1 }]
                    } as ViewStyle,
                    webPointer(inactive),
                    focusRingStyle(theme, focusVisible),
                    style
                ];
            }}
        >
            {({ pressed }) => {
                const p = palette(pressed);
                return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, opacity: loading ? 0.85 : 1 }}>
                        {loading ? (
                            <ActivityIndicator size="small" color={theme.colors[p.fg === 'onPrimary' ? 'onPrimary' : 'primary'] as string} />
                        ) : icon ? (
                            <Icon name={icon} size="md" color={p.fg} />
                        ) : null}
                        <AppText variant="button" color={p.fg} numberOfLines={1}>{title}</AppText>
                        {iconRight && !loading ? <Icon name={iconRight} size="md" color={p.fg} /> : null}
                    </View>
                );
            }}
        </Pressable>
    );
}
