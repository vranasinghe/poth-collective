import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { fontFamilyFor } from '../../design/fonts';
import { FontWeightName, TextVariant, headingScale, maxFontSizeMultiplier, scalableVariants } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

export type TextColor =
    | 'text' | 'textSecondary' | 'textMuted' | 'textDisabled'
    | 'primary' | 'accent' | 'onPrimary' | 'onAccentFill'
    | 'success' | 'warning' | 'danger' | 'info';

export type AppTextProps = TextProps & {
    /** Typographic role. Defaults to `body`. */
    variant?: TextVariant;
    /** Semantic colour. Defaults to `text`. Status colours resolve to their contrast-safe text shade. */
    color?: TextColor;
    align?: TextStyle['textAlign'];
    /** Override the weight of the variant (picks the matching font file). */
    weight?: FontWeightName;
    /** Render the variant in the other family (rare). */
    serif?: boolean;
};

const HEADING_VARIANTS: readonly TextVariant[] = ['display', 'screenTitle', 'sectionTitle'];

/**
 * The only way text should be rendered in new code. It applies the family, weight, size, line height and colour of a
 * typographic role from the tokens, scales large headings with the screen width, caps user font scaling so layouts do
 * not break, and marks headings for screen readers.
 */
export function AppText({ variant = 'body', color = 'text', align, weight, serif, style, accessibilityRole, ...rest }: AppTextProps) {
    const theme = useTheme();
    const { breakpoint } = useBreakpoint();
    const token = theme.typography.text[variant];

    const family = serif === undefined ? token.family : serif ? 'serif' : 'sans';
    const scale = scalableVariants.includes(variant) ? headingScale[breakpoint] : 1;
    const resolved =
        color === 'success' || color === 'warning' || color === 'danger' || color === 'info'
            ? theme.colors.status[color].text
            : (theme.colors[color] as string);

    const base: TextStyle = {
        ...({ fontFamily: fontFamilyFor(family, weight ?? token.weight) } as TextStyle),
        fontSize: Math.round(token.size * scale),
        lineHeight: Math.round(token.lineHeight * scale),
        letterSpacing: token.letterSpacing,
        color: resolved,
        ...(align ? { textAlign: align } : null)
    };

    return (
        <Text
            allowFontScaling
            maxFontSizeMultiplier={maxFontSizeMultiplier}
            accessibilityRole={accessibilityRole ?? (HEADING_VARIANTS.includes(variant) ? 'header' : undefined)}
            style={[base, style]}
            {...rest}
        />
    );
}
