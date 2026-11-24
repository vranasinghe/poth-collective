import { useCallback, useState } from 'react';
import { Platform, ViewStyle } from 'react-native';
import { Theme } from '../design/theme';

/**
 * Hover / focus tracking for pressable components.
 *
 * React Native's Pressable state callback only reports `pressed`, so hover and focus are tracked here. On web a focus
 * ring is shown only for keyboard users ("focus-visible"): after a mouse or touch interaction the ring stays hidden,
 * exactly like native browser behaviour. Native platforms have no visible focus ring, so `focusVisible` is false there.
 */
let keyboardModality = true;
let installed = false;

const installModalityListeners = () => {
    if (installed || Platform.OS !== 'web' || typeof document === 'undefined') return;
    installed = true;
    const keyboard = () => { keyboardModality = true; };
    const pointer = () => { keyboardModality = false; };
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Enter' || e.key === ' ') keyboard();
    }, true);
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('mousedown', pointer, true);
    document.addEventListener('touchstart', pointer, true);
};

export type InteractionState = {
    hovered: boolean;
    focusVisible: boolean;
    handlers: {
        onHoverIn: () => void;
        onHoverOut: () => void;
        onFocus: () => void;
        onBlur: () => void;
    };
};

export const useInteraction = (): InteractionState => {
    installModalityListeners();
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const onHoverIn = useCallback(() => setHovered(true), []);
    const onHoverOut = useCallback(() => setHovered(false), []);
    const onFocus = useCallback(() => setFocused(true), []);
    const onBlur = useCallback(() => setFocused(false), []);
    return {
        hovered,
        focusVisible: focused && Platform.OS === 'web' && keyboardModality,
        handlers: { onHoverIn, onHoverOut, onFocus, onBlur }
    };
};

/** Web-only focus ring (2 px, offset). Returns an empty style on native. */
export const focusRingStyle = (theme: Theme, visible: boolean): ViewStyle => {
    if (!visible || Platform.OS !== 'web') return {};
    return {
        outlineStyle: 'solid',
        outlineWidth: 2,
        outlineOffset: 2,
        outlineColor: theme.colors.focusRing
    } as unknown as ViewStyle;
};

/** Extends a visual size to the 44 dp touch target without changing layout. */
export const hitSlopFor = (visualSize: number, target = 44) => {
    const extra = Math.max(0, Math.ceil((target - visualSize) / 2));
    return { top: extra, bottom: extra, left: extra, right: extra };
};

/** Cursor and user-select for web; harmless elsewhere. */
export const webPointer = (disabled?: boolean): ViewStyle =>
    (Platform.OS === 'web' ? { cursor: disabled ? 'not-allowed' : 'pointer' } : {}) as unknown as ViewStyle;
