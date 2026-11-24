import React, { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { motion, sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { AppText } from '../components/AppText';
import { Icon, IconName } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { animateTo } from '../motionUtils';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';
export type ToastOptions = {
    message: string;
    tone?: ToastTone;
    /** Milliseconds before it dismisses itself. 0 keeps it until dismissed. Defaults: 4000, errors 6000. */
    duration?: number;
    /** One optional action, e.g. "Undo" or "Retry" */
    action?: { label: string; onPress: () => void };
};
type ToastItem = Required<Pick<ToastOptions, 'message' | 'tone'>> & { id: number; duration: number; action?: ToastOptions['action'] };

export type ToastApi = {
    show: (options: ToastOptions) => number;
    success: (message: string, options?: Omit<ToastOptions, 'message' | 'tone'>) => number;
    error: (message: string, options?: Omit<ToastOptions, 'message' | 'tone'>) => number;
    info: (message: string, options?: Omit<ToastOptions, 'message' | 'tone'>) => number;
    warning: (message: string, options?: Omit<ToastOptions, 'message' | 'tone'>) => number;
    dismiss: (id: number) => void;
};

const noop = () => 0;
const ToastContext = createContext<ToastApi>({ show: noop, success: noop, error: noop, info: noop, warning: noop, dismiss: () => {} });

/** Show brief, non-blocking feedback: `const toast = useToast(); toast.success('Order placed')`. */
export const useToast = (): ToastApi => useContext(ToastContext);

const TONE: Record<ToastTone, { icon: IconName; color: 'success' | 'danger' | 'info' | 'warning' }> = {
    success: { icon: 'checkmark-circle', color: 'success' },
    error: { icon: 'alert-circle', color: 'danger' },
    info: { icon: 'information-circle', color: 'info' },
    warning: { icon: 'warning', color: 'warning' }
};

const MAX_VISIBLE = 3;

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
    const theme = useTheme();
    const reduced = useReducedMotion();
    const progress = useRef(new Animated.Value(0)).current;
    const [paused, setPaused] = useState(false);
    const t = TONE[item.tone];

    useEffect(() => {
        animateTo(progress, 1, reduced, motion.duration.normal);
        if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(item.message);
    }, [item.message, progress, reduced]);

    // Auto-dismiss; hovering or focusing the toast (web) pauses the countdown
    useEffect(() => {
        if (!item.duration || paused) return;
        const timer = setTimeout(() => onDismiss(item.id), item.duration);
        return () => clearTimeout(timer);
    }, [item.duration, item.id, onDismiss, paused]);

    return (
        <Animated.View
            accessibilityRole={item.tone === 'error' ? 'alert' : undefined}
            accessibilityLiveRegion={item.tone === 'error' ? 'assertive' : 'polite'}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            style={{
                opacity: progress,
                transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.smd,
                width: '100%',
                maxWidth: sizes.toastMaxWidth,
                paddingVertical: theme.spacing.smd,
                paddingLeft: theme.spacing.md,
                paddingRight: theme.spacing.xs,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceRaised,
                ...theme.shadows.high
            }}
        >
            <Icon name={t.icon} size="lg" color={t.color} />
            <AppText variant="bodySmall" style={{ flex: 1 }}>{item.message}</AppText>
            {item.action ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={item.action.label}
                    onPress={() => { item.action?.onPress(); onDismiss(item.id); }}
                    hitSlop={8}
                    style={{ minHeight: sizes.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.sm }}
                >
                    <AppText variant="link" color="primary">{item.action.label}</AppText>
                </Pressable>
            ) : null}
            <IconButton icon="close" label="Dismiss notification" size="sm" color="textSecondary" onPress={() => onDismiss(item.id)} />
        </Animated.View>
    );
}

/** Hosts the toast stack. Toasts never block touches on the content beneath them (`box-none`). */
export function ToastProvider({ children }: { children: ReactNode }) {
    const theme = useTheme();
    const { isDesktopUp, gutter } = useBreakpoint();
    const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
    const [items, setItems] = useState<ToastItem[]>([]);
    const nextId = useRef(1);

    const dismiss = useCallback((id: number) => setItems((list) => list.filter((i) => i.id !== id)), []);

    const show = useCallback((options: ToastOptions) => {
        const tone = options.tone ?? 'info';
        const id = nextId.current++;
        const duration = options.duration ?? (tone === 'error' ? motion.duration.toastError : motion.duration.toast);
        setItems((list) => [...list, { id, message: options.message, tone, duration, action: options.action }].slice(-MAX_VISIBLE));
        return id;
    }, []);

    const api = useMemo<ToastApi>(() => ({
        show,
        success: (message, o) => show({ ...o, message, tone: 'success' }),
        error: (message, o) => show({ ...o, message, tone: 'error' }),
        info: (message, o) => show({ ...o, message, tone: 'info' }),
        warning: (message, o) => show({ ...o, message, tone: 'warning' }),
        dismiss
    }), [show, dismiss]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            {items.length ? (
                <View
                    pointerEvents="box-none"
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: theme.zIndex.toast,
                        paddingHorizontal: gutter,
                        paddingBottom: Math.max(insets.bottom, theme.spacing.md) + theme.spacing.xs,
                        alignItems: isDesktopUp ? 'flex-end' : 'center',
                        gap: theme.spacing.sm
                    }}
                >
                    {items.map((item) => <ToastView key={item.id} item={item} onDismiss={dismiss} />)}
                </View>
            ) : null}
        </ToastContext.Provider>
    );
}
