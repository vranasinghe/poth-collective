import React, { ReactNode, useContext } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { sizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

export type ContentWidth = 'form' | 'reading' | 'content' | 'wide' | 'full';

export type ScreenContainerProps = {
    children: ReactNode;
    /**
     * Maximum width of the content column, centred on wide windows.
     *   form (480)     sign-in, sign-up, checkout: never stretch a phone-sized form across a desktop
     *   reading (720)  blog posts, long text
     *   content (1120) catalogues, dashboards (default)
     *   wide (1280)    dense tables
     *   full           edge to edge
     */
    width?: ContentWidth;
    /** Scroll the content (default) or render a fixed, non-scrolling column */
    scroll?: boolean;
    /** Move content above the on-screen keyboard (iOS padding; Android resizes the window itself) */
    keyboardAvoiding?: boolean;
    /** Pull-to-refresh. Provide both props to enable it. */
    refreshing?: boolean;
    onRefresh?: () => void;
    /** Apply the responsive page gutter (default true) */
    padded?: boolean;
    /** Which system bars to keep content clear of (default both) */
    edges?: ('top' | 'bottom')[];
    background?: 'canvas' | 'surfaceMuted';
    /** Pinned above the scrolling area, e.g. an AppHeader */
    header?: ReactNode;
    /** Pinned below the scrolling area, e.g. a primary action */
    footer?: ReactNode;
    contentContainerStyle?: StyleProp<ViewStyle>;
    testID?: string;
};

const ZERO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * The page shell. It supplies the canvas background, safe-area padding, a width-limited centred column on large
 * windows, responsive gutters, optional keyboard avoidance and optional pull-to-refresh. Every screen starts here.
 */
export function ScreenContainer({
    children, width = 'content', scroll = true, keyboardAvoiding, refreshing, onRefresh, padded = true,
    edges = ['top', 'bottom'], background = 'canvas', header, footer, contentContainerStyle, testID
}: ScreenContainerProps) {
    const theme = useTheme();
    const { gutter } = useBreakpoint();
    // Works with or without a SafeAreaProvider (tests, gallery previews)
    const insets = useContext(SafeAreaInsetsContext) ?? ZERO_INSETS;

    const maxWidth = width === 'full' ? undefined : sizes.maxContentWidth[width];
    const bg = background === 'canvas' ? theme.colors.canvas : theme.colors.surfaceMuted;

    const column: ViewStyle = {
        width: '100%',
        maxWidth,
        alignSelf: 'center',
        paddingHorizontal: padded ? gutter : 0,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xl
    };

    const body = scroll ? (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
                onRefresh ? (
                    <RefreshControl
                        refreshing={!!refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary}
                        colors={[theme.colors.primary]}
                        progressBackgroundColor={theme.colors.surfaceRaised}
                    />
                ) : undefined
            }
        >
            <View style={column}>{children}</View>
        </ScrollView>
    ) : (
        <View style={[{ flex: 1 }, column, contentContainerStyle]}>{children}</View>
    );

    const shell = (
        <View
            testID={testID}
            style={{
                flex: 1,
                backgroundColor: bg,
                paddingTop: edges.includes('top') ? insets.top : 0,
                paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
                paddingLeft: insets.left,
                paddingRight: insets.right
            }}
        >
            {header}
            {body}
            {footer}
        </View>
    );

    if (!keyboardAvoiding) return shell;
    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {shell}
        </KeyboardAvoidingView>
    );
}
