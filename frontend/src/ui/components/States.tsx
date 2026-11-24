import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';
import { PrimaryButton, SecondaryButton } from './Buttons';

type Action = { label: string; onPress: () => void; icon?: IconName };

const StateLayout = ({ icon, tone, title, message, children, compact, alert }: {
    icon: IconName; tone: 'textMuted' | 'danger'; title: string; message?: string; children?: React.ReactNode; compact?: boolean; alert?: boolean;
}) => {
    const theme = useTheme();
    const disc = compact ? 48 : 72;
    return (
        <View style={{ alignItems: 'center', alignSelf: 'center', width: '100%', maxWidth: 360, paddingVertical: compact ? theme.spacing.lg : theme.spacing.xxl, paddingHorizontal: theme.spacing.md, gap: theme.spacing.smd }}>
            {/* The message is announced as one unit; the action buttons below stay separately focusable */}
            <View
                accessible={alert}
                accessibilityRole={alert ? 'alert' : undefined}
                accessibilityLiveRegion={alert ? 'polite' : undefined}
                style={{ alignItems: 'center', gap: theme.spacing.smd }}
            >
                <View
                    style={{
                        width: disc, height: disc, borderRadius: disc / 2, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: tone === 'danger' ? theme.colors.status.danger.soft : theme.colors.surfaceMuted
                    }}
                >
                    <Icon name={icon} size={compact ? 'lg' : 'xl'} color={tone === 'danger' ? 'danger' : 'textSecondary'} />
                </View>
                <AppText variant={compact ? 'cardTitle' : 'sectionTitle'} align="center">{title}</AppText>
                {message ? <AppText variant="body" color="textSecondary" align="center">{message}</AppText> : null}
            </View>
            {children ? <View style={{ marginTop: theme.spacing.sm, gap: theme.spacing.sm, alignSelf: 'stretch', alignItems: 'center' }}>{children}</View> : null}
        </View>
    );
};

export type EmptyStateProps = {
    title: string;
    /** Say what will appear here and what to do next, in the product's own words */
    message?: string;
    icon?: IconName;
    action?: Action;
    secondaryAction?: Action;
    compact?: boolean;
};

/** "Nothing here yet". Always explains what belongs here and offers the next step. */
export function EmptyState({ title, message, icon = 'book-outline', action, secondaryAction, compact }: EmptyStateProps) {
    return (
        <StateLayout icon={icon} tone="textMuted" title={title} message={message} compact={compact}>
            {action ? <PrimaryButton title={action.label} icon={action.icon} onPress={action.onPress} /> : null}
            {secondaryAction ? <SecondaryButton title={secondaryAction.label} icon={secondaryAction.icon} appearance="tonal" onPress={secondaryAction.onPress} /> : null}
        </StateLayout>
    );
}

export type ErrorStateProps = {
    /** Defaults to "We couldn't load this" */
    title?: string;
    /** Name the problem and the way out. Defaults to a connection hint. */
    message?: string;
    /** Retry handler. When given, a "Try again" button is shown. */
    onRetry?: () => void;
    /** Show the retry button as pending while a retry is in flight */
    retrying?: boolean;
    /** Use the offline wording and icon */
    offline?: boolean;
    compact?: boolean;
};

/** Error with recovery. Announced to screen readers when it appears; the retry button shows its own pending state. */
export function ErrorState({ title, message, onRetry, retrying, offline, compact }: ErrorStateProps) {
    return (
        <StateLayout
            alert
            icon={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
            tone="danger"
            title={title ?? (offline ? "You're offline" : "We couldn't load this")}
            message={message ?? (offline ? 'Check your connection. Your changes are safe and nothing was lost.' : 'This is usually a temporary connection problem. Try again in a moment.')}
            compact={compact}
        >
            {onRetry ? <PrimaryButton title="Try again" icon="refresh" onPress={onRetry} loading={retrying} /> : null}
        </StateLayout>
    );
}
