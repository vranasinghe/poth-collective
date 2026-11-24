import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * True when the user asked the OS / browser to reduce motion. Components then skip or shorten animations
 * (skeletons stop pulsing, toasts and sheets appear without sliding).
 */
export const useReducedMotion = (): boolean => {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        let active = true;

        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            const query = window.matchMedia('(prefers-reduced-motion: reduce)');
            setReduced(query.matches);
            const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
            query.addEventListener?.('change', onChange);
            return () => query.removeEventListener?.('change', onChange);
        }

        AccessibilityInfo.isReduceMotionEnabled().then((v) => active && setReduced(v)).catch(() => {});
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
        return () => {
            active = false;
            sub.remove();
        };
    }, []);

    return reduced;
};
