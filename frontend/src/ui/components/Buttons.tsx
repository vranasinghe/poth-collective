import React from 'react';
import { ButtonBase, ButtonProps } from './ButtonBase';

export type { ButtonProps, ButtonSize } from './ButtonBase';

export type PrimaryButtonProps = ButtonProps & {
    /** `danger` for destructive confirmations (delete, cancel order) */
    tone?: 'default' | 'danger';
};

/** The one main action on a screen. Forest-green fill, white label (11.9:1). */
export function PrimaryButton({ tone = 'default', ...props }: PrimaryButtonProps) {
    return <ButtonBase variant={tone === 'danger' ? 'danger' : 'primary'} {...props} />;
}

export type SecondaryButtonProps = ButtonProps & {
    /** `outline` (default): bordered, for a peer action. `tonal`: sand fill, for a quiet supporting action. */
    appearance?: 'outline' | 'tonal';
};

/** A supporting action next to a primary one. */
export function SecondaryButton({ appearance = 'outline', ...props }: SecondaryButtonProps) {
    return <ButtonBase variant={appearance} {...props} />;
}
