import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Animated, DimensionValue, Easing, Platform, StyleProp, View, ViewStyle } from 'react-native';
import { motion, sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ResponsiveGrid } from './ResponsiveGrid';

/**
 * One shared pulse drives every placeholder in a group, so a screenful of skeletons costs a single animation. With
 * "reduce motion" enabled the placeholders are static: the shape still communicates "loading" without moving.
 */
const PulseContext = createContext<Animated.Value | null>(null);

const usePulse = (enabled: boolean) => {
    const value = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!enabled) {
            value.setValue(0);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(value, { toValue: 1, duration: motion.duration.skeleton / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
                Animated.timing(value, { toValue: 0, duration: motion.duration.skeleton / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [enabled, value]);
    return value;
};

export type SkeletonProps = {
    width?: DimensionValue;
    height?: DimensionValue;
    radius?: number;
    style?: StyleProp<ViewStyle>;
};

/** A single placeholder block. Decorative: hidden from assistive technology (the group announces "Loading"). */
export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
    const theme = useTheme();
    const reduced = useReducedMotion();
    const shared = useContext(PulseContext);
    const own = usePulse(!shared && !reduced);
    const pulse = shared ?? own;
    const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
    return (
        <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[{ width, height, borderRadius: radius ?? theme.radii.sm, backgroundColor: theme.colors.skeleton, opacity: reduced ? 1 : opacity }, style]}
        />
    );
}

export type LoadingSkeletonProps = {
    /**
     * card: one book/shop card · bookGrid: a responsive grid of cards · list: rows with a thumbnail ·
     * text: a paragraph · profile: avatar + two lines
     */
    variant?: 'card' | 'bookGrid' | 'list' | 'text' | 'profile';
    count?: number;
    /** Spoken to screen reader users while loading */
    label?: string;
};

const CardSkeleton = () => {
    const theme = useTheme();
    return (
        <View style={{ gap: theme.spacing.smd }}>
            <Skeleton height={undefined} style={{ aspectRatio: sizes.bookCoverRatio, borderRadius: theme.radii.md }} />
            <Skeleton height={14} width="85%" />
            <Skeleton height={12} width="55%" />
        </View>
    );
};

const ListRowSkeleton = () => {
    const theme = useTheme();
    return (
        <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
            <Skeleton width={64} height={88} radius={theme.radii.sm} />
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
                <Skeleton height={16} width="70%" />
                <Skeleton height={12} width="45%" />
                <Skeleton height={12} width="30%" />
            </View>
        </View>
    );
};

/** Skeleton screen presets. The wrapper is one busy region with a spoken label; the blocks inside are silent. */
export function LoadingSkeleton({ variant = 'card', count, label = 'Loading' }: LoadingSkeletonProps) {
    const theme = useTheme();
    const reduced = useReducedMotion();
    const pulse = usePulse(!reduced);

    const items = (n: number, render: (i: number) => React.ReactNode) => Array.from({ length: n }, (_, i) => <React.Fragment key={i}>{render(i)}</React.Fragment>);

    let body: React.ReactNode;
    switch (variant) {
        case 'bookGrid':
            body = <ResponsiveGrid>{items(count ?? 6, () => <CardSkeleton />)}</ResponsiveGrid>;
            break;
        case 'list':
            body = <View style={{ gap: theme.spacing.lg }}>{items(count ?? 4, () => <ListRowSkeleton />)}</View>;
            break;
        case 'text':
            body = (
                <View style={{ gap: theme.spacing.sm }}>
                    {items(count ?? 4, (i) => <Skeleton height={14} width={i === (count ?? 4) - 1 ? '60%' : '100%'} />)}
                </View>
            );
            break;
        case 'profile':
            body = (
                <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
                    <Skeleton width={sizes.avatar.lg} height={sizes.avatar.lg} radius={theme.radii.full} />
                    <View style={{ flex: 1, gap: theme.spacing.sm }}>
                        <Skeleton height={16} width="55%" />
                        <Skeleton height={12} width="35%" />
                    </View>
                </View>
            );
            break;
        default:
            body = <View style={{ width: 180 }}><CardSkeleton /></View>;
    }

    return (
        <PulseContext.Provider value={pulse}>
            <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite">
                {body}
            </View>
        </PulseContext.Provider>
    );
}
