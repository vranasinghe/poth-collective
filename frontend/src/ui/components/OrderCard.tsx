import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { BookCover } from '../../../components/BookCover';
import { useTheme } from '../../theme/ThemeContext';
import { formatDate, formatPrice, shortId } from '../format';
import { AppText } from './AppText';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { OrderStatus, StatusBadge } from './StatusBadge';

export type OrderAction = {
    label: string;
    onPress: () => void;
    /** primary: main next step. secondary: peer action. danger: destructive (cancel). */
    tone?: 'primary' | 'secondary' | 'danger';
    loading?: boolean;
    disabled?: boolean;
};

export type OrderCardProps = {
    orderId: string;
    status: OrderStatus;
    bookTitle: string;
    bookAuthor?: string;
    bookImage?: string | null;
    /** Reader view shows the shop; owner view shows the customer */
    counterpart: { label: 'Shop' | 'Customer'; name: string; detail?: string };
    quantity: number;
    total: number;
    date?: string | Date;
    /** Context actions: only offer transitions that are legal for the current status */
    actions?: OrderAction[];
    style?: StyleProp<ViewStyle>;
};

/** Order summary for both roles. The status is a labelled badge (icon + text); actions are supplied by the screen. */
export function OrderCard({ orderId, status, bookTitle, bookAuthor, bookImage, counterpart, quantity, total, date, actions = [], style }: OrderCardProps) {
    const theme = useTheme();
    return (
        <View
            accessible={false}
            style={[
                { padding: theme.spacing.md, gap: theme.spacing.md, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised },
                style
            ]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
                <View accessible accessibilityLabel={`Order ${shortId(orderId)}${date ? `, placed ${formatDate(date)}` : ''}`}>
                    <AppText variant="label">Order #{shortId(orderId)}</AppText>
                    {date ? <AppText variant="caption" color="textMuted">{formatDate(date)}</AppText> : null}
                </View>
                <StatusBadge status={status} />
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <BookCover title={bookTitle} author={bookAuthor ?? ''} imageUrl={bookImage} style={{ width: 56, height: 84, borderRadius: theme.radii.sm }} />
                <View style={{ flex: 1, gap: theme.spacing.xxs }}>
                    <AppText variant="cardTitle" numberOfLines={2}>{bookTitle}</AppText>
                    <AppText variant="bodySmall" color="textSecondary" numberOfLines={1}>
                        {counterpart.label}: {counterpart.name}
                    </AppText>
                    {counterpart.detail ? <AppText variant="caption" color="textMuted" numberOfLines={2}>{counterpart.detail}</AppText> : null}
                    <AppText variant="bodySmall" color="textSecondary">Quantity: {quantity}</AppText>
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap' }}>
                <AppText variant="bodyStrong" accessibilityLabel={`Total ${formatPrice(total)}`}>{formatPrice(total)}</AppText>
                {actions.length ? (
                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                        {actions.map((a) =>
                            a.tone === 'secondary' ? (
                                <SecondaryButton key={a.label} size="sm" title={a.label} onPress={a.onPress} loading={a.loading} disabled={a.disabled} />
                            ) : (
                                <PrimaryButton key={a.label} size="sm" tone={a.tone === 'danger' ? 'danger' : 'default'} title={a.label} onPress={a.onPress} loading={a.loading} disabled={a.disabled} />
                            )
                        )}
                    </View>
                ) : null}
            </View>
        </View>
    );
}
