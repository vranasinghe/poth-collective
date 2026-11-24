import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { BookCover } from '../../../components/BookCover';
import { sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { focusRingStyle, useInteraction, webPointer } from '../interaction';
import { formatPrice } from '../format';
import { AppText } from './AppText';
import { RatingStars } from './Rating';

export type BookCardProps = {
    title: string;
    author: string;
    shopName?: string;
    /** Average rating, 0 when unreviewed (shown as "New") */
    rating: number;
    ratingCount?: number;
    /** Uploaded cover URL. Bundled editions and a fallback are handled by BookCover. */
    image?: string | null;
    price?: number;
    /** Units in stock. 0 shows "Out of stock", 1-5 shows "Only N left". */
    stock?: number;
    onPress: () => void;
    /**
     * Fixed width in dp, for horizontal carousels (adds trailing spacing). Omit to fill the column, which is what
     * ResponsiveGrid wants.
     */
    width?: number;
    /** Kept for backward compatibility with older call sites; unused. */
    id?: string;
    style?: StyleProp<ViewStyle>;
};

/**
 * Cover-first book tile. No box around it: the cover is the hero, with title, author, rating and price underneath.
 * Fluid by default (fills its grid cell) and fixed-width inside carousels. Cover aspect ratio is constant (2:3), so
 * rows never jump as images load.
 */
export function BookCard({ title, author, shopName, rating, ratingCount, image, price, stock, onPress, width, style }: BookCardProps) {
    const theme = useTheme();
    const { hovered, focusVisible, handlers } = useInteraction();

    const stockNote = stock === 0 ? 'Out of stock' : stock !== undefined && stock <= 5 ? `Only ${stock} left` : undefined;
    const summary = [
        `${title} by ${author}`,
        shopName ? `available at ${shopName}` : undefined,
        rating > 0 ? `rated ${rating.toFixed(1)} out of 5` : 'not rated yet',
        price !== undefined ? formatPrice(price) : undefined,
        stockNote
    ].filter(Boolean).join(', ');

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={summary}
            accessibilityHint="Opens book details"
            onPress={onPress}
            {...handlers}
            style={({ pressed }) => [
                {
                    width: width ?? '100%',
                    marginRight: width ? theme.spacing.mdl : 0,
                    gap: theme.spacing.sm,
                    opacity: pressed ? 0.88 : 1,
                    borderRadius: theme.radii.md
                } as ViewStyle,
                webPointer(),
                focusRingStyle(theme, focusVisible),
                style
            ]}
        >
            <View
                style={[
                    { borderRadius: theme.radii.md, overflow: 'hidden', ...theme.shadows[hovered ? 'medium' : 'subtle'], backgroundColor: theme.colors.surfaceMuted },
                    { aspectRatio: sizes.bookCoverRatio }
                ]}
            >
                <BookCover title={title} author={author} imageUrl={image} style={{ flex: 1 }} />
            </View>
            <View style={{ gap: theme.spacing.xxs }}>
                <AppText variant="cardTitle" numberOfLines={2}>{title}</AppText>
                <AppText variant="bodySmall" color="textSecondary" numberOfLines={1}>{author}</AppText>
                {shopName ? <AppText variant="caption" color="textMuted" numberOfLines={1}>{shopName}</AppText> : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: theme.spacing.sm, rowGap: theme.spacing.xxs, marginTop: theme.spacing.xxs }}>
                    <RatingStars value={rating} count={ratingCount} />
                    {price !== undefined ? <AppText variant="bodySmall" weight="semibold">{formatPrice(price)}</AppText> : null}
                </View>
                {stockNote ? <AppText variant="caption" color={stock === 0 ? 'danger' : 'warning'} weight="semibold">{stockNote}</AppText> : null}
            </View>
        </Pressable>
    );
}
