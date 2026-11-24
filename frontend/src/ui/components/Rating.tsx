import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { focusRingStyle, hitSlopFor, useInteraction, webPointer } from '../interaction';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

const starFor = (value: number, index: number): IconName => {
    if (value >= index + 1) return 'star';
    if (value >= index + 0.5) return 'star-half';
    return 'star-outline';
};

export type RatingStarsProps = {
    value: number;
    count?: number;
    size?: 'sm' | 'md' | 'lg';
    /** Show the number next to the stars (default true) */
    showValue?: boolean;
};

/**
 * Read-only rating. The number is shown next to the stars and is part of the accessible label, so the copper stars
 * are decoration rather than the only carrier of the value.
 */
export function RatingStars({ value, count, size = 'sm', showValue = true }: RatingStarsProps) {
    const theme = useTheme();
    const safe = Math.max(0, Math.min(5, value || 0));
    const label = safe > 0
        ? `Rated ${safe.toFixed(1)} out of 5${count !== undefined ? ` from ${count} ${count === 1 ? 'review' : 'reviews'}` : ''}`
        : 'Not rated yet';
    return (
        <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row' }}>
                {[0, 1, 2, 3, 4].map((i) => (
                    <Icon key={i} name={starFor(safe, i)} size={size === 'lg' ? 'lg' : size === 'md' ? 'md' : 'sm'} color="accent" />
                ))}
            </View>
            {showValue ? (
                <AppText variant={size === 'sm' ? 'caption' : 'bodySmall'} color="textSecondary" weight="medium">
                    {safe > 0 ? safe.toFixed(1) : 'Not rated'}{count !== undefined && safe > 0 ? ` (${count})` : ''}
                </AppText>
            ) : null}
        </View>
    );
}

function StarButton({ index, value, onChange }: { index: number; value: number; onChange: (v: number) => void }) {
    const theme = useTheme();
    const { focusVisible, handlers } = useInteraction();
    const filled = value >= index + 1;
    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${index + 1} ${index === 0 ? 'star' : 'stars'}`}
            accessibilityState={{ checked: value === index + 1 }}
            onPress={() => onChange(index + 1)}
            hitSlop={hitSlopFor(32)}
            {...handlers}
            style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.sm }, webPointer(), focusRingStyle(theme, focusVisible)]}
        >
            <Icon name={filled ? 'star' : 'star-outline'} size="xl" color="accent" />
        </Pressable>
    );
}

export type RatingInputProps = { value: number; onChange: (value: number) => void; label?: string };

/** Pick a whole-star rating from 1 to 5. Exposed as a radio group with five labelled options. */
export function RatingInput({ value, onChange, label = 'Your rating' }: RatingInputProps) {
    return (
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row' }}>
            {[0, 1, 2, 3, 4].map((i) => (
                <StarButton key={i} index={i} value={value} onChange={onChange} />
            ))}
        </View>
    );
}
