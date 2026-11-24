import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '../../design/tokens';
import { useTheme } from '../../theme/ThemeContext';
import type { TextColor } from './AppText';

export type IconName = keyof typeof Ionicons.glyphMap;

export type IconProps = {
    name: IconName;
    size?: keyof typeof iconSizes | number;
    color?: TextColor | (string & {});
    /** Provide a label to expose the icon to screen readers; icons are decorative (hidden) by default. */
    label?: string;
    style?: StyleProp<TextStyle>;
};

/** Token-sized icon. Colour takes a semantic key (or, for rare cases, an explicit colour string). */
export function Icon({ name, size = 'md', color = 'text', label, style }: IconProps) {
    const theme = useTheme();
    const px = typeof size === 'number' ? size : iconSizes[size];
    const c = theme.colors as unknown as Record<string, unknown>;
    let resolved: string = color;
    if (color === 'success' || color === 'warning' || color === 'danger' || color === 'info') {
        resolved = theme.colors.status[color as 'success' | 'warning' | 'danger' | 'info'].text;
    } else if (typeof c[color] === 'string') {
        resolved = c[color] as string;
    }
    const a11y = label
        ? ({ accessibilityLabel: label, accessibilityRole: 'image' } as const)
        : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const);
    return <Ionicons name={name} size={px} color={resolved} style={style} {...a11y} />;
}
