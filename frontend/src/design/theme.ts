import { Platform } from 'react-native';
import {
    ColorScheme, ColorTokens, breakpoints, colorSchemes, iconSizes, motion, radii, shadows,
    sizes, spacing, textStyles, zIndex
} from './tokens';

/**
 * The runtime theme object returned by `useTheme()`.
 *
 * It exposes two vocabularies:
 *  1. The design-system names (canvas, surfaceRaised, surfaceMuted, primarySoft, accentFill, tone colours, ...).
 *     New components use only these.
 *  2. Legacy aliases (background, surface, textPrimary, error, primaryLight, pastelBlue, ...). The ~30 screens written
 *     before the design system read these, so they now render in the new palette without any code change. They are
 *     deprecated: new code must not use them, and Phases 3-4 remove them as screens migrate.
 *
 * Legacy mapping decisions (see docs/DESIGN_SYSTEM.md):
 *   surface       -> surfaceRaised  (legacy screens use it for white cards; the BRAND "Surface" sand is surfaceMuted)
 *   accent        -> accent         (the contrast-safe copper, because legacy uses it for text and star icons)
 *   error         -> danger.solid
 *   pastelBlue / pastelLavender -> primarySoft / accentSoft
 */
type LegacyColors = {
    /** @deprecated use canvas */ background: string;
    /** @deprecated use surfaceRaised */ surface: string;
    /** @deprecated use text */ textPrimary: string;
    /** @deprecated use primarySoft */ primaryLight: string;
    /** @deprecated use primaryPressed */ primaryDark: string;
    /** @deprecated use accentSoft */ accentLight: string;
    /** @deprecated use primarySoft */ pastelBlue: string;
    /** @deprecated use accentSoft */ pastelLavender: string;
    // Flat solid status colours, as strings (the nested tones live under colors.status)
    /** @deprecated use status.danger.solid */ error: string;
    /** @deprecated use status.success.solid */ success: string;
    /** @deprecated use status.warning.solid */ warning: string;
    /** @deprecated use status.info.solid */ info: string;
};

type LegacyScale = Record<'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'button', { fontSize: number; fontWeight: 'normal' | '500' | '600' | '700' | '900'; lineHeight: number }>;

export type Theme = {
    scheme: ColorScheme;
    colors: ColorTokens & Record<keyof LegacyColors, string>;
    typography: {
        /** Legacy: system font. Legacy screens combine it with fontWeight, which only works with system fonts. */
        fontFamily: string | undefined;
        /** Legacy size scale. New code uses <AppText variant> instead. */
        scale: LegacyScale;
        text: typeof textStyles;
    };
    spacing: typeof spacing;
    radii: typeof radii;
    shadows: typeof shadows;
    iconSizes: typeof iconSizes;
    sizes: typeof sizes;
    breakpoints: typeof breakpoints;
    motion: typeof motion;
    zIndex: typeof zIndex;
};

const legacyScale: LegacyScale = {
    h1: { fontSize: 30, fontWeight: '900', lineHeight: 38 },
    h2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
    h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
    body: { fontSize: 16, fontWeight: 'normal', lineHeight: 22 },
    bodySmall: { fontSize: 14, fontWeight: 'normal', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
    button: { fontSize: 16, fontWeight: '700', lineHeight: 20 }
};

const systemFont = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

export const buildTheme = (scheme: ColorScheme): Theme => {
    const c = colorSchemes[scheme];
    return {
        scheme,
        colors: {
            ...c,
            // Legacy aliases (deprecated)
            background: c.canvas,
            surface: c.surfaceRaised,
            textPrimary: c.text,
            primaryLight: c.primarySoft,
            primaryDark: c.primaryPressed,
            accentLight: c.accentSoft,
            pastelBlue: c.primarySoft,
            pastelLavender: c.accentSoft,
            error: c.status.danger.solid,
            success: c.status.success.solid,
            warning: c.status.warning.solid,
            info: c.status.info.solid
        },
        typography: { fontFamily: systemFont, scale: legacyScale, text: textStyles },
        spacing,
        radii,
        shadows,
        iconSizes,
        sizes,
        breakpoints,
        motion,
        zIndex
    };
};

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');
export const themes: Record<ColorScheme, Theme> = { light: lightTheme, dark: darkTheme };
