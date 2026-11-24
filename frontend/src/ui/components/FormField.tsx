import React, { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppText } from './AppText';
import { Icon } from './Icon';

export type FormFieldProps = {
    /** Visible label. Sentence case; it is the control's accessible name, so it is never replaced by a placeholder. */
    label: string;
    children: ReactNode;
    required?: boolean;
    /** Persistent helper text under the control */
    helperText?: string;
    /** Inline validation message. Replaces the helper text and is announced to screen readers. */
    error?: string;
    /** Optional hint after the label, e.g. "(optional)" */
    hint?: string;
    style?: StyleProp<ViewStyle>;
};

/**
 * Label + control + helper/error layout, shared by TextField, PasswordField and any custom control (RoleSelector,
 * pickers). The error is a live region, so a screen reader announces it the moment it appears.
 */
export function FormField({ label, children, required, helperText, error, hint, style }: FormFieldProps) {
    const theme = useTheme();
    return (
        <View style={[{ width: '100%', marginBottom: theme.spacing.mdl }, style]}>
            {label ? (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: theme.spacing.xs + 2 }}>
                    <AppText variant="label" color="text">{label}</AppText>
                    {required ? <AppText variant="label" color="textMuted" accessibilityElementsHidden importantForAccessibility="no"> *</AppText> : null}
                    {hint ? <AppText variant="caption" color="textMuted"> {hint}</AppText> : null}
                </View>
            ) : null}
            {children}
            {error ? (
                <View
                    accessible
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xs + 2, marginTop: theme.spacing.xs + 2 }}
                >
                    <Icon name="alert-circle" size="sm" color="danger" style={{ marginTop: 2 }} />
                    <AppText variant="bodySmall" color="danger" style={{ flex: 1 }}>{error}</AppText>
                </View>
            ) : helperText ? (
                <AppText variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xs + 2 }}>{helperText}</AppText>
            ) : null}
        </View>
    );
}
