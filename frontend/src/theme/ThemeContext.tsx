import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { ColorScheme } from '../design/tokens';
import { Theme, themes } from '../design/theme';
import type { ThemeVariant } from './theme';

interface ThemeContextValue {
    theme: Theme;
    scheme: ColorScheme;
    variant: ThemeVariant;
    setVariant: (v: ThemeVariant) => void;
    setScheme: (s: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: themes.light,
    scheme: 'light',
    variant: 'reader',
    setVariant: () => {},
    setScheme: () => {}
});

interface ThemeProviderProps {
    children: ReactNode;
    /** Role cue for a subtree (e.g. the owner layout). Colours are shared by both roles. */
    variant?: ThemeVariant;
    /**
     * Colour scheme for this subtree. Defaults to the parent's scheme, which is light at the root. Dark is
     * opt-in per subtree until every screen has migrated off light-only literals (see docs/DESIGN_SYSTEM.md).
     */
    scheme?: ColorScheme;
}

/**
 * ThemeProvider wraps a subtree with a theme. Providers nest: the innermost one wins, and a nested provider that does
 * not pass `scheme` or `variant` inherits both from its parent.
 */
export const ThemeProvider = ({ children, variant: variantProp, scheme: schemeProp }: ThemeProviderProps) => {
    const parent = useContext(ThemeContext);
    const [internalVariant, setVariant] = useState<ThemeVariant>(variantProp ?? parent.variant);
    const [internalScheme, setScheme] = useState<ColorScheme>(schemeProp ?? parent.scheme);

    const variant = variantProp ?? internalVariant;
    const scheme = schemeProp ?? internalScheme;

    const value = useMemo<ThemeContextValue>(
        () => ({ theme: themes[scheme], scheme, variant, setVariant, setScheme }),
        [scheme, variant]
    );
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/** The active theme. Use `theme.colors.*`, `theme.spacing.*`, `theme.radii.*` and so on; never literal values. */
export const useTheme = (): Theme => useContext(ThemeContext).theme;

/** Theme plus scheme/variant and their setters. */
export const useThemeContext = (): ThemeContextValue => useContext(ThemeContext);
