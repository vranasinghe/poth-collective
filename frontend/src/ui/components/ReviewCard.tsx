import React from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';
import { sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { formatDate, initials } from '../format';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { RatingStars } from './Rating';

export type ReviewCardProps = {
    author: string;
    rating: number;
    comment: string;
    /** ISO date string or Date */
    date?: string | Date;
    /** Optional photo attached to the review */
    imageUrl?: string | null;
    /** What the review is about (shown on "my reviews" lists) */
    target?: string;
    /** Provide for the author's own reviews */
    onEdit?: () => void;
    onDelete?: () => void;
    style?: StyleProp<ViewStyle>;
};

/** One review: avatar, name and date, stars, text and optional photo, with edit/delete for the author. */
export function ReviewCard({ author, rating, comment, date, imageUrl, target, onEdit, onDelete, style }: ReviewCardProps) {
    const theme = useTheme();
    return (
        <View
            accessible={false}
            style={[
                { padding: theme.spacing.md, gap: theme.spacing.smd, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised },
                style
            ]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.smd }}>
                <View
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    style={{ width: sizes.avatar.md, height: sizes.avatar.md, borderRadius: sizes.avatar.md / 2, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}
                >
                    <AppText variant="label" color="primary">{initials(author)}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                    <AppText variant="cardTitle" numberOfLines={1}>{author}</AppText>
                    {date ? <AppText variant="caption" color="textMuted">{formatDate(date)}</AppText> : null}
                </View>
                {onEdit ? <IconButton icon="create-outline" label={`Edit your review${target ? ` of ${target}` : ''}`} size="sm" onPress={onEdit} /> : null}
                {onDelete ? <IconButton icon="trash-outline" label={`Delete your review${target ? ` of ${target}` : ''}`} size="sm" color="danger" onPress={onDelete} /> : null}
            </View>
            {target ? <AppText variant="bodySmall" color="textSecondary" weight="medium">{target}</AppText> : null}
            <RatingStars value={rating} showValue={false} />
            <AppText variant="body">{comment}</AppText>
            {imageUrl ? (
                <Image
                    source={{ uri: imageUrl }}
                    accessibilityLabel={`Photo attached to ${author}'s review`}
                    style={{ width: '100%', maxWidth: 360, height: 180, borderRadius: theme.radii.sm, backgroundColor: theme.colors.surfaceMuted }}
                    resizeMode="cover"
                />
            ) : null}
        </View>
    );
}
