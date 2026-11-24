import React from 'react';
import { TextStyle, ViewStyle } from 'react-native';
import { PrimaryButton, SecondaryButton } from '../src/ui/components/Buttons';
import type { IconName } from '../src/ui/components/Icon';

/**
 * Legacy Button, kept so existing screens keep working. It now renders the design-system buttons. New code should
 * import PrimaryButton / SecondaryButton from `src/ui` directly.
 *  primary, dark -> PrimaryButton   secondary -> SecondaryButton (tonal)   outline -> SecondaryButton (outline)
 */
interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'dark' | 'outline';
    icon?: IconName;
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    /** @deprecated typography is controlled by the design system */
    textStyle?: TextStyle;
}

export const Button = ({ title, onPress, variant = 'primary', icon, loading, disabled, style }: ButtonProps) => {
    const common = { title, onPress, iconRight: icon, loading, disabled, style, fullWidth: true, size: 'lg' as const };
    if (variant === 'secondary') return <SecondaryButton appearance="tonal" {...common} />;
    if (variant === 'outline') return <SecondaryButton appearance="outline" {...common} />;
    return <PrimaryButton {...common} />;
};
