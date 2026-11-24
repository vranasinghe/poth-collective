import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { Breakpoint, breakpointFor, breakpointOrder, sizes } from '../../design/tokens';

export type BreakpointInfo = {
    width: number;
    height: number;
    breakpoint: Breakpoint;
    /** True from `tablet` upwards */
    isTabletUp: boolean;
    /** True from `desktop` upwards */
    isDesktopUp: boolean;
    /** True below `tablet` */
    isPhone: boolean;
    /** Horizontal page padding for this width */
    gutter: number;
    /** Gap between grid items for this width */
    gridGap: number;
    /** True when the window is at least `min` */
    atLeast: (min: Breakpoint) => boolean;
};

/**
 * Responsive information from the live window size (updates on resize and rotation, unlike Dimensions.get).
 *
 * Web is pre-rendered statically with no window, so the server HTML is laid out at width 0 ("compact"). To keep
 * hydration identical, the first client render also reports width 0 and switches to the real size right after mount
 * (same approach as hooks/use-color-scheme.web.ts). Native has no pre-render and uses the real size immediately.
 */
export const useBreakpoint = (): BreakpointInfo => {
    const window = useWindowDimensions();
    const [hydrated, setHydrated] = useState(Platform.OS !== 'web');
    useEffect(() => {
        setHydrated(true);
    }, []);

    const width = hydrated ? window.width : 0;
    const height = hydrated ? window.height : 0;
    const breakpoint = breakpointFor(width);
    const rank = breakpointOrder.indexOf(breakpoint);
    return {
        width,
        height,
        breakpoint,
        isTabletUp: rank >= breakpointOrder.indexOf('tablet'),
        isDesktopUp: rank >= breakpointOrder.indexOf('desktop'),
        isPhone: rank < breakpointOrder.indexOf('tablet'),
        gutter: sizes.gutter[breakpoint],
        gridGap: sizes.gridGap[breakpoint],
        atLeast: (min) => rank >= breakpointOrder.indexOf(min)
    };
};
