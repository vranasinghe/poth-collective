import { AA_TEXT, AA_UI, contrastRatio, meets } from './contrast';
import { ColorScheme, ColorTokens, ToneColors, colorSchemes } from './tokens';

/**
 * Every colour pairing the component library depends on, with the WCAG threshold it must meet.
 * `__tests__/contrast.test.ts` fails if any pair in either colour scheme drops below its minimum, and the component
 * gallery prints the same table. When a component starts using a new pairing, declare it here.
 */
export type PairKind = 'text' | 'ui';
export type Pair = {
    id: string;
    usage: string;
    kind: PairKind;
    min: number;
    fg: (c: ColorTokens) => string;
    bg: (c: ColorTokens) => string;
};

const text = (id: string, usage: string, fg: Pair['fg'], bg: Pair['bg']): Pair => ({ id, usage, kind: 'text', min: AA_TEXT, fg, bg });
const ui = (id: string, usage: string, fg: Pair['fg'], bg: Pair['bg']): Pair => ({ id, usage, kind: 'ui', min: AA_UI, fg, bg });

const tones = ['success', 'warning', 'danger', 'info'] as const;
const toneOf = (c: ColorTokens, t: (typeof tones)[number]): ToneColors => c.status[t];

export const pairs: Pair[] = [
    // Body text on every surface
    text('text/canvas', 'Body text on the page', (c) => c.text, (c) => c.canvas),
    text('text/raised', 'Body text on cards, fields, dialogs', (c) => c.text, (c) => c.surfaceRaised),
    text('text/muted', 'Body text on chips and wells', (c) => c.text, (c) => c.surfaceMuted),
    text('secondary/canvas', 'Secondary text on the page', (c) => c.textSecondary, (c) => c.canvas),
    text('secondary/raised', 'Secondary text on cards', (c) => c.textSecondary, (c) => c.surfaceRaised),
    text('secondary/muted', 'Secondary text on chips and wells', (c) => c.textSecondary, (c) => c.surfaceMuted),
    text('textMuted/canvas', 'Captions and placeholders on the page', (c) => c.textMuted, (c) => c.canvas),
    text('textMuted/raised', 'Captions and placeholders in fields and cards', (c) => c.textMuted, (c) => c.surfaceRaised),
    text('textMuted/muted', 'Captions on chips and wells', (c) => c.textMuted, (c) => c.surfaceMuted),
    text('textMuted/primarySoft', 'Captions on selected rows', (c) => c.textMuted, (c) => c.primarySoft),

    // Primary
    text('onPrimary/primary', 'Primary button label', (c) => c.onPrimary, (c) => c.primary),
    text('onPrimary/hover', 'Primary button label, hovered', (c) => c.onPrimary, (c) => c.primaryHover),
    text('onPrimary/pressed', 'Primary button label, pressed', (c) => c.onPrimary, (c) => c.primaryPressed),
    text('primary/canvas', 'Links and secondary button label on the page', (c) => c.primary, (c) => c.canvas),
    text('primary/raised', 'Links and secondary button label on cards', (c) => c.primary, (c) => c.surfaceRaised),
    text('primary/muted', 'Primary text on chips and wells', (c) => c.primary, (c) => c.surfaceMuted),
    text('primary/soft', 'Selected chip / pressed secondary button label', (c) => c.primary, (c) => c.primarySoft),

    // Copper
    text('accent/canvas', 'Copper text and icons on the page', (c) => c.accent, (c) => c.canvas),
    text('accent/raised', 'Copper text and icons on cards (ratings)', (c) => c.accent, (c) => c.surfaceRaised),
    text('accent/muted', 'Copper text on chips and wells', (c) => c.accent, (c) => c.surfaceMuted),
    text('accent/soft', 'Copper text on its tint (badges)', (c) => c.accent, (c) => c.accentSoft),
    text('onAccentFill/accentFill', 'Ink label on a copper fill', (c) => c.onAccentFill, (c) => c.accentFill),
    text('onAccentFill/pressed', 'Ink label on a pressed copper fill', (c) => c.onAccentFill, (c) => c.accentFillPressed),

    // Control boundaries and focus (non-text, 3:1)
    ui('borderStrong/canvas', 'Field and outlined button boundary on the page', (c) => c.borderStrong, (c) => c.canvas),
    ui('borderStrong/raised', 'Field boundary on cards and dialogs', (c) => c.borderStrong, (c) => c.surfaceRaised),
    ui('borderStrong/muted', 'Control boundary on chips and wells', (c) => c.borderStrong, (c) => c.surfaceMuted),
    ui('focusRing/canvas', 'Keyboard focus ring on the page', (c) => c.focusRing, (c) => c.canvas),
    ui('focusRing/raised', 'Keyboard focus ring on cards', (c) => c.focusRing, (c) => c.surfaceRaised),
    ui('focusRing/muted', 'Keyboard focus ring on chips and wells', (c) => c.focusRing, (c) => c.surfaceMuted),
    ui('primary/canvas-ui', 'Selected-state indicator against the page', (c) => c.primary, (c) => c.canvas),

    // Status tones
    ...tones.flatMap((t) => [
        text(`${t}/onSolid`, `${t} solid badge label`, (c) => toneOf(c, t).onSolid, (c) => toneOf(c, t).solid),
        text(`${t}/soft`, `${t} text on its tint`, (c) => toneOf(c, t).text, (c) => toneOf(c, t).soft),
        text(`${t}/canvas`, `${t} message text on the page`, (c) => toneOf(c, t).text, (c) => c.canvas),
        text(`${t}/raised`, `${t} message text on cards`, (c) => toneOf(c, t).text, (c) => c.surfaceRaised)
    ])
];

export type PairResult = Pair & { scheme: ColorScheme; fgHex: string; bgHex: string; ratio: number; pass: boolean };

export const evaluatePairs = (scheme: ColorScheme): PairResult[] => {
    const colors = colorSchemes[scheme];
    return pairs.map((p) => {
        const fgHex = p.fg(colors);
        const bgHex = p.bg(colors);
        const ratio = contrastRatio(fgHex, bgHex);
        return { ...p, scheme, fgHex, bgHex, ratio, pass: meets(ratio, p.min) };
    });
};

/**
 * Colours that are intentionally NOT allowed for text or as the only indicator of a control, with the reason.
 * The test asserts they really are below the threshold, so the rule cannot silently become stale.
 */
export const restrictedPairs = [
    { id: 'accentFill-as-text', why: 'Brand copper fails as text on light surfaces; use `accent` for text and icons', fg: (c: ColorTokens) => c.accentFill, bg: (c: ColorTokens) => c.surfaceRaised, min: AA_TEXT, scheme: 'light' as ColorScheme },
    { id: 'onPrimary-on-accentFill', why: 'White on the copper fill fails; use `onAccentFill` (ink)', fg: (c: ColorTokens) => c.onPrimary, bg: (c: ColorTokens) => c.accentFill, min: AA_TEXT, scheme: 'light' as ColorScheme },
    { id: 'surfaceMuted-boundary', why: 'Sand vs canvas is too faint to be a control boundary; controls use `borderStrong`', fg: (c: ColorTokens) => c.surfaceMuted, bg: (c: ColorTokens) => c.canvas, min: AA_UI, scheme: 'light' as ColorScheme },
    { id: 'border-boundary', why: '`border` is decorative; controls use `borderStrong`', fg: (c: ColorTokens) => c.border, bg: (c: ColorTokens) => c.canvas, min: AA_UI, scheme: 'light' as ColorScheme }
];
