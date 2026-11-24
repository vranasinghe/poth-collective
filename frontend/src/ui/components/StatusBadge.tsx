import React from 'react';
import { View } from 'react-native';
import { sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { AppText, TextColor } from './AppText';
import { Icon, IconName } from './Icon';

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';

export const ORDER_STATUS_BADGE: Record<OrderStatus, { tone: BadgeTone; icon: IconName }> = {
    Pending: { tone: 'warning', icon: 'time-outline' },
    Confirmed: { tone: 'info', icon: 'checkmark-circle-outline' },
    Shipped: { tone: 'accent', icon: 'cube-outline' },
    Delivered: { tone: 'success', icon: 'checkmark-done-outline' },
    Cancelled: { tone: 'neutral', icon: 'close-circle-outline' }
};

export type StatusBadgeProps =
    | { status: OrderStatus; label?: string; tone?: undefined; icon?: IconName; size?: 'sm' | 'md' }
    | { status?: undefined; label: string; tone: BadgeTone; icon?: IconName; size?: 'sm' | 'md' };

/**
 * Compact status pill. Meaning never relies on colour alone: every badge carries an icon and a text label, and the
 * accessible name reads "Status: Pending". Pass an order `status` for the standard mapping, or a `tone` + `label`.
 */
export function StatusBadge({ status, tone, label, icon, size = 'md' }: StatusBadgeProps) {
    const theme = useTheme();
    const c = theme.colors;
    const mapped = status ? ORDER_STATUS_BADGE[status] : undefined;
    const resolvedTone: BadgeTone = mapped?.tone ?? tone ?? 'neutral';
    const resolvedLabel = status ?? label ?? '';
    const resolvedIcon = icon ?? mapped?.icon ?? 'ellipse-outline';

    const scheme: Record<BadgeTone, { bg: string; fg: TextColor }> = {
        success: { bg: c.status.success.soft, fg: 'success' },
        warning: { bg: c.status.warning.soft, fg: 'warning' },
        danger: { bg: c.status.danger.soft, fg: 'danger' },
        info: { bg: c.status.info.soft, fg: 'info' },
        accent: { bg: c.accentSoft, fg: 'accent' },
        neutral: { bg: c.surfaceMuted, fg: 'textSecondary' }
    };
    const { bg, fg } = scheme[resolvedTone];

    return (
        <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Status: ${resolvedLabel}`}
            style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                minHeight: sizes.badge[size],
                paddingHorizontal: size === 'sm' ? theme.spacing.sm : theme.spacing.smd,
                borderRadius: theme.radii.full,
                backgroundColor: bg
            }}
        >
            <Icon name={resolvedIcon} size={size === 'sm' ? 'xs' : 'sm'} color={fg} />
            <AppText variant={size === 'sm' ? 'caption' : 'label'} color={fg} weight="semibold">{resolvedLabel}</AppText>
        </View>
    );
}
