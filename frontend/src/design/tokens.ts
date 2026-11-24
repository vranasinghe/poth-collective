/**
 * Poth design tokens: the single source of truth for every colour, size, type style and motion value.
 *
 * Rules
 *  - Screens and components read tokens (through `useTheme()` or by importing from here); they never write hex values.
 *  - Every text/background and component-boundary pairing is declared in `a11yPairs.ts` and verified by
 *    `__tests__/contrast.test.ts`. Add a colour here, add its pairs there.
 *  - See docs/DESIGN_SYSTEM.md for the reasoning behind each decision.
 */

// ---------------------------------------------------------------------------------------------------------------
// Brand palette: the six starting colours exactly as briefed
// ---------------------------------------------------------------------------------------------------------------
export const palette = {
    canvas: '#F8F6F0', // warm paper: page background
    primary: '#243C33', // deep forest green
    accent: '#C58B59', // copper
    surface: '#E9E3D7', // sand: muted panels, chips, input wells
    text: '#242C28', // ink
    white: '#FFFFFF'
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Semantic colour schemes
// ---------------------------------------------------------------------------------------------------------------
export type ToneColors = {
    /** Strong fill (badges, solid buttons, icons) */
    solid: string;
    /** Text/icon colour ON `solid` */
    onSolid: string;
    /** Pale tinted background */
    soft: string;
    /** Text/icon colour on `soft`, `canvas` and `surfaceRaised` */
    text: string;
};

export type ColorTokens = {
    // Backgrounds
    canvas: string; // page background
    surfaceRaised: string; // cards, fields, dialogs (white in light mode)
    surfaceMuted: string; // chips, wells, skeleton base: brand "Surface"
    // Text
    text: string;
    textSecondary: string;
    textMuted: string; // also used for placeholders, so it must pass 4.5:1
    textDisabled: string; // inactive controls (exempt from contrast rules, still readable)
    // Brand: primary
    primary: string;
    primaryHover: string;
    primaryPressed: string;
    primarySoft: string; // tinted background (selected rows, secondary button pressed)
    onPrimary: string;
    // Brand: copper. `accent` is the TEXT/ICON-safe copper; `accentFill` is the brand copper for fills.
    accent: string;
    accentSoft: string;
    accentFill: string;
    accentFillPressed: string;
    onAccentFill: string;
    // Lines
    border: string; // decorative dividers and card outlines (not a control boundary)
    borderStrong: string; // control boundaries (inputs, outlined buttons, checkboxes), >= 3:1
    focusRing: string; // keyboard focus indicator, >= 3:1 on every surface
    // Status tones: colors.status.success.solid / .onSolid / .soft / .text
    status: { success: ToneColors; warning: ToneColors; danger: ToneColors; info: ToneColors };
    // Overlays and states (translucent, never used for text pairs)
    scrim: string;
    hoverOverlay: string;
    pressedOverlay: string;
    skeleton: string;
    skeletonHighlight: string;
    disabledFill: string;
};

export const lightColors: ColorTokens = {
    canvas: palette.canvas,
    surfaceRaised: palette.white,
    surfaceMuted: palette.surface,
    text: palette.text,
    textSecondary: '#3F4A44',
    textMuted: '#58625C',
    textDisabled: '#8D938A',
    primary: palette.primary,
    primaryHover: '#2D4A3F',
    primaryPressed: '#182B23',
    primarySoft: '#E1EAE4',
    onPrimary: palette.white,
    accent: '#855425', // copper darkened until it passes 4.5:1 as text on every light surface
    accentSoft: '#F3E4D3',
    accentFill: palette.accent,
    accentFillPressed: '#D2A074', // lighter, not darker: the label on copper is ink, so lighter raises contrast
    onAccentFill: palette.text, // white on copper is only 2.9:1; ink on copper is 4.9:1
    border: '#DAD3C4',
    borderStrong: '#767B71',
    focusRing: palette.primary,
    status: {
        success: { solid: '#1D6A43', onSolid: palette.white, soft: '#E2F0E8', text: '#1D6A43' },
        warning: { solid: '#7F4E00', onSolid: palette.white, soft: '#FAEBCB', text: '#7F4E00' },
        danger: { solid: '#A22C22', onSolid: palette.white, soft: '#FAE3E0', text: '#A22C22' },
        info: { solid: '#1B5688', onSolid: palette.white, soft: '#E1ECF7', text: '#1B5688' }
    },
    scrim: 'rgba(24, 33, 28, 0.55)',
    hoverOverlay: 'rgba(36, 60, 51, 0.06)',
    pressedOverlay: 'rgba(36, 60, 51, 0.12)',
    skeleton: '#E9E3D7',
    skeletonHighlight: '#F3EFE6',
    disabledFill: '#E3DED2'
};

/**
 * Dark scheme. Defined and contrast-verified, but NOT enabled app-wide yet: most existing screens still contain
 * light-only literals. It is opt-in per subtree (`<ThemeProvider scheme="dark">`), used by the gallery and by
 * screens as they are migrated in later phases.
 */
export const darkColors: ColorTokens = {
    canvas: '#131A16',
    surfaceRaised: '#1C2621',
    surfaceMuted: '#26322C',
    text: '#F2F0E8',
    textSecondary: '#CDD4CE',
    textMuted: '#AEB8B1',
    textDisabled: '#6C7870',
    primary: '#9CCDB4',
    primaryHover: '#AAD6C0',
    primaryPressed: '#BFE2CF',
    primarySoft: '#243A2F',
    onPrimary: '#10201A',
    accent: '#DDA87A',
    accentSoft: '#3A2D21',
    accentFill: '#C58B59',
    accentFillPressed: '#D29A6B',
    onAccentFill: '#131A16',
    border: '#33403A',
    borderStrong: '#7C8A82',
    focusRing: '#9CCDB4',
    status: {
        success: { solid: '#8FD3A9', onSolid: '#0E2318', soft: '#1D3527', text: '#8FD3A9' },
        warning: { solid: '#EDC074', onSolid: '#2B1C00', soft: '#3A2D12', text: '#EDC074' },
        danger: { solid: '#F0A59C', onSolid: '#2E0D09', soft: '#3D2220', text: '#F0A59C' },
        info: { solid: '#9CC6EA', onSolid: '#0C2236', soft: '#1D3043', text: '#9CC6EA' }
    },
    scrim: 'rgba(0, 0, 0, 0.62)',
    hoverOverlay: 'rgba(242, 240, 232, 0.08)',
    pressedOverlay: 'rgba(242, 240, 232, 0.14)',
    skeleton: '#26322C',
    skeletonHighlight: '#33403A',
    disabledFill: '#222C27'
};

export type ColorScheme = 'light' | 'dark';
export const colorSchemes: Record<ColorScheme, ColorTokens> = { light: lightColors, dark: darkColors };

// ---------------------------------------------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------------------------------------------
// UI text: Inter (SIL OFL 1.1). Headings: Newsreader (SIL OFL 1.1), an editorial serif drawn for on-screen reading.
// Both ship through @expo-google-fonts and are bundled by expo-font, so there is no runtime request to Google.
export const fontWeights = { regular: '400', medium: '500', semibold: '600', bold: '700' } as const;
export type FontWeightName = keyof typeof fontWeights;

export const fontFiles = {
    sans: { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' },
    serif: { regular: 'Newsreader_500Medium', medium: 'Newsreader_500Medium', semibold: 'Newsreader_600SemiBold', bold: 'Newsreader_700Bold' }
} as const;
export type FontFamilyName = keyof typeof fontFiles;

export type TextVariant =
    | 'display'
    | 'screenTitle'
    | 'sectionTitle'
    | 'cardTitle'
    | 'body'
    | 'bodyStrong'
    | 'bodySmall'
    | 'caption'
    | 'label'
    | 'button'
    | 'link';

export type TextStyleToken = {
    family: FontFamilyName;
    weight: FontWeightName;
    size: number;
    lineHeight: number;
    letterSpacing: number;
};

export const textStyles: Record<TextVariant, TextStyleToken> = {
    display: { family: 'serif', weight: 'bold', size: 36, lineHeight: 44, letterSpacing: -0.4 },
    screenTitle: { family: 'serif', weight: 'semibold', size: 28, lineHeight: 34, letterSpacing: -0.2 },
    sectionTitle: { family: 'serif', weight: 'semibold', size: 20, lineHeight: 26, letterSpacing: -0.1 },
    cardTitle: { family: 'sans', weight: 'semibold', size: 17, lineHeight: 22, letterSpacing: 0 },
    body: { family: 'sans', weight: 'regular', size: 16, lineHeight: 24, letterSpacing: 0 },
    bodyStrong: { family: 'sans', weight: 'semibold', size: 16, lineHeight: 24, letterSpacing: 0 },
    bodySmall: { family: 'sans', weight: 'regular', size: 14, lineHeight: 20, letterSpacing: 0 },
    caption: { family: 'sans', weight: 'regular', size: 12, lineHeight: 16, letterSpacing: 0.1 },
    label: { family: 'sans', weight: 'semibold', size: 13, lineHeight: 18, letterSpacing: 0.1 },
    button: { family: 'sans', weight: 'semibold', size: 16, lineHeight: 20, letterSpacing: 0.1 },
    link: { family: 'sans', weight: 'semibold', size: 14, lineHeight: 20, letterSpacing: 0 }
};

/** Large headings grow a little on larger screens (multiplier by breakpoint); body text never scales with width. */
export const headingScale = { compact: 0.9, phone: 1, tablet: 1.1, desktop: 1.25, wide: 1.3 } as const;
export const scalableVariants: readonly TextVariant[] = ['display', 'screenTitle'];

/** Text scaling accessibility: honour the user's font size up to this multiple so layouts cannot break. */
export const maxFontSizeMultiplier = 1.6;

// ---------------------------------------------------------------------------------------------------------------
// Spacing, radii, elevation, icons
// ---------------------------------------------------------------------------------------------------------------
export const spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    smd: 12,
    md: 16,
    mdl: 20,
    lg: 24,
    xl: 32,
    xxl: 40,
    xxxl: 48,
    huge: 64
} as const;

export const radii = { none: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, full: 9999 } as const;

// Warm ink-tinted shadows rather than pure black. Android uses `elevation`.
const shadow = (offsetY: number, opacity: number, radius: number, elevation: number) => ({
    shadowColor: '#18211C',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation
});
export const shadows = {
    none: shadow(0, 0, 0, 0),
    subtle: shadow(1, 0.06, 3, 1),
    medium: shadow(4, 0.1, 12, 4),
    high: shadow(10, 0.16, 28, 12) // dialogs, sheets, toasts
} as const;
export type ShadowName = keyof typeof shadows;

export const iconSizes = { xs: 14, sm: 16, md: 20, lg: 24, xl: 32, hero: 48 } as const;

// ---------------------------------------------------------------------------------------------------------------
// Component dimensions
// ---------------------------------------------------------------------------------------------------------------
export const sizes = {
    /** Minimum interactive target on every platform (WCAG 2.5.5 / Apple HIG / Material) */
    touchTarget: 44,
    button: { sm: 44, md: 48, lg: 56 },
    buttonRadius: 12,
    iconButton: { sm: 40, md: 44, lg: 52 },
    field: 52,
    fieldRadius: 12,
    searchField: 48,
    chip: 44,
    avatar: { sm: 32, md: 40, lg: 56 },
    header: 56,
    badge: { sm: 22, md: 28 },
    maxContentWidth: { form: 480, reading: 720, content: 1120, wide: 1280 },
    gridGap: { compact: 12, phone: 16, tablet: 20, desktop: 24, wide: 24 },
    gutter: { compact: 16, phone: 16, tablet: 24, desktop: 32, wide: 40 },
    bookCoverRatio: 2 / 3,
    cardMinWidth: 156,
    dialogMaxWidth: 440,
    sheetMaxWidth: 560,
    toastMaxWidth: 440
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Responsive breakpoints (minimum window widths in dp / CSS px)
// ---------------------------------------------------------------------------------------------------------------
export const breakpoints = { compact: 0, phone: 360, tablet: 600, desktop: 1024, wide: 1440 } as const;
export type Breakpoint = keyof typeof breakpoints;
export const breakpointOrder: readonly Breakpoint[] = ['compact', 'phone', 'tablet', 'desktop', 'wide'];

export const breakpointFor = (width: number): Breakpoint => {
    let current: Breakpoint = 'compact';
    for (const name of breakpointOrder) {
        if (width >= breakpoints[name]) current = name;
    }
    return current;
};

// ---------------------------------------------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------------------------------------------
export const motion = {
    duration: { instant: 0, fast: 120, normal: 200, slow: 320, skeleton: 1200, toast: 4000, toastError: 6000 },
    /** Subtle press feedback; applied with style, never with a JS-driven animation on the input path */
    pressScale: 0.98
} as const;

export const zIndex = { header: 10, sheet: 100, dialog: 110, toast: 120 } as const;

export const tokens = {
    palette, colorSchemes, fontWeights, fontFiles, textStyles, headingScale, spacing, radii, shadows,
    iconSizes, sizes, breakpoints, motion, zIndex
} as const;
