// Compatibility entry point. The theme now lives in src/design; these names remain so existing imports keep working.
import { lightTheme, Theme } from '../design/theme';

export type { Theme };
export type ThemeVariant = 'reader' | 'owner';

/** Both roles share one palette now (one product, one brand). The variant is kept for role-specific cues. */
export const readerTheme: Theme = lightTheme;
export const ownerTheme: Theme = lightTheme;
