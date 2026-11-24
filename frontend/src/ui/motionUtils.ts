import { Animated, Easing, Platform } from 'react-native';
import { motion } from '../design/tokens';

/** Exponential ease-out: fast start, long soft landing. The only entrance curve used by the system. */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const nativeDriver = Platform.OS !== 'web';

/**
 * Animate a value to `to`. With reduced motion the value jumps immediately, so the end state is identical and only
 * the movement is removed. Animations are always opacity/transform, never layout, and never gate user input.
 */
export const animateTo = (value: Animated.Value, to: number, reduced: boolean, duration: number = motion.duration.normal, callback?: () => void) => {
    if (reduced || duration === 0) {
        value.setValue(to);
        callback?.();
        return;
    }
    Animated.timing(value, { toValue: to, duration, easing: easeOut, useNativeDriver: nativeDriver }).start(callback ? () => callback() : undefined);
};
