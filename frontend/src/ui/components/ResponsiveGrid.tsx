import React, { ReactNode, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { Breakpoint, sizes } from '../../design/tokens';
import { useBreakpoint } from '../hooks/useBreakpoint';

export const DEFAULT_COLUMNS: Record<Breakpoint, number> = { compact: 2, phone: 2, tablet: 3, desktop: 4, wide: 5 };

/**
 * Column count for a container of `width`. With `minItemWidth` the grid fits as many columns as keep every item at
 * least that wide ("auto-fit"); otherwise the per-breakpoint `columns` table decides. Pure, so it is unit tested.
 */
export const computeColumns = (opts: {
    width: number;
    gap: number;
    breakpoint: Breakpoint;
    columns?: Partial<Record<Breakpoint, number>>;
    minItemWidth?: number;
}): number => {
    const { width, gap, breakpoint, columns, minItemWidth } = opts;
    if (minItemWidth && width > 0) {
        return Math.max(1, Math.floor((width + gap) / (minItemWidth + gap)));
    }
    const table = { ...DEFAULT_COLUMNS, ...columns };
    return Math.max(1, table[breakpoint]);
};

export type ResponsiveGridProps = {
    children: ReactNode;
    /** Columns per breakpoint. Missing breakpoints fall back to 2 / 2 / 3 / 4 / 5. */
    columns?: Partial<Record<Breakpoint, number>>;
    /** Auto-fit instead: as many columns as fit with items at least this wide (default for catalogues: sizes.cardMinWidth) */
    minItemWidth?: number;
    /** Override the breakpoint-based gap */
    gap?: number;
};

/**
 * Wrapping grid sized from its own measured width (not the window), so it stays correct inside the width-limited
 * ScreenContainer column and inside side-by-side layouts. Items stretch to fill their column.
 */
export function ResponsiveGrid({ children, columns, minItemWidth, gap: gapProp }: ResponsiveGridProps) {
    const { breakpoint, gridGap, gutter, width: windowWidth } = useBreakpoint();
    const gap = gapProp ?? gridGap;
    // Until the first layout pass reports the real width, estimate it as the page column (window minus gutters,
    // capped at the content width) so the first paint is already close and nothing visibly jumps
    const [measured, setMeasured] = useState(0);
    const width = measured || Math.max(0, Math.min(windowWidth, sizes.maxContentWidth.content) - gutter * 2);

    const count = computeColumns({ width, gap, breakpoint, columns, minItemWidth });
    const itemWidth = Math.floor((width - gap * (count - 1)) / count);
    const onLayout = (e: LayoutChangeEvent) => {
        const w = Math.floor(e.nativeEvent.layout.width);
        if (w !== measured) setMeasured(w);
    };

    return (
        <View onLayout={onLayout} style={{ flexDirection: 'row', flexWrap: 'wrap', gap, width: '100%' }}>
            {React.Children.toArray(children).map((child, i) => (
                <View key={i} style={{ width: itemWidth }}>{child}</View>
            ))}
        </View>
    );
}
