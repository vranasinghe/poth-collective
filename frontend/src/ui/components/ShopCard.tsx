import React, { useState } from 'react';
import { Image, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { focusRingStyle, useInteraction, webPointer } from '../interaction';
import { initials } from '../format';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { RatingStars } from './Rating';

export type ShopCardProps = {
    name: string;
    location: string;
    image?: string | null;
    rating?: number;
    ratingCount?: number;
    followersCount?: number;
    /** The signed-in reader follows this shop */
    following?: boolean;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
};

const usableImage = (url?: string | null): url is string => !!url && /^https?:\/\//i.test(url) && !/via\.placeholder\.com|placehold\.co/i.test(url);

/** Shop row: picture (or initials), name, location, rating and follower count. One tappable surface, no nested cards. */
export function ShopCard({ name, location, image, rating = 0, ratingCount, followersCount, following, onPress, style }: ShopCardProps) {
    const theme = useTheme();
    const { hovered, focusVisible, handlers } = useInteraction();
    const [failed, setFailed] = useState(false);
    const box = sizes.avatar.lg + 8;

    const label = [
        `${name}, ${location}`,
        rating > 0 ? `rated ${rating.toFixed(1)} out of 5` : 'not rated yet',
        followersCount !== undefined ? `${followersCount} ${followersCount === 1 ? 'follower' : 'followers'}` : undefined,
        following ? 'you follow this shop' : undefined
    ].filter(Boolean).join(', ');

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint="Opens shop details"
            onPress={onPress}
            {...handlers}
            style={({ pressed }) => [
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    padding: theme.spacing.md,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: pressed ? theme.colors.primarySoft : hovered ? theme.colors.surfaceMuted : theme.colors.surfaceRaised
                },
                webPointer(),
                focusRingStyle(theme, focusVisible),
                style
            ]}
        >
            {usableImage(image) && !failed ? (
                <Image source={{ uri: image }} onError={() => setFailed(true)} accessibilityIgnoresInvertColors style={{ width: box, height: box, borderRadius: theme.radii.sm, backgroundColor: theme.colors.surfaceMuted }} />
            ) : (
                <View style={{ width: box, height: box, borderRadius: theme.radii.sm, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <AppText variant="sectionTitle" color="primary">{initials(name)}</AppText>
                </View>
            )}
            <View style={{ flex: 1, gap: theme.spacing.xxs }}>
                <AppText variant="cardTitle" numberOfLines={1}>{name}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                    <Icon name="location-outline" size="sm" color="textMuted" />
                    <AppText variant="bodySmall" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>{location}</AppText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.smd, flexWrap: 'wrap' }}>
                    <RatingStars value={rating} count={ratingCount} />
                    {followersCount !== undefined ? <AppText variant="caption" color="textMuted">{followersCount} {followersCount === 1 ? 'follower' : 'followers'}</AppText> : null}
                    {following ? <AppText variant="caption" color="primary" weight="semibold">Following</AppText> : null}
                </View>
            </View>
            <Icon name="chevron-forward" size="md" color="textMuted" />
        </Pressable>
    );
}
