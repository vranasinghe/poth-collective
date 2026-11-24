import { Platform, TextStyle } from 'react-native';
import { useFonts } from 'expo-font';
import {
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold
} from '@expo-google-fonts/inter';
import {
    Newsreader_500Medium, Newsreader_600SemiBold, Newsreader_700Bold
} from '@expo-google-fonts/newsreader';
import { FontFamilyName, FontWeightName, fontFiles } from './tokens';

/**
 * Fonts bundled with the app (no network request at runtime):
 *   Inter       UI text      SIL Open Font License 1.1
 *   Newsreader  headings     SIL Open Font License 1.1
 */
export const fontAssets = {
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    Newsreader_500Medium, Newsreader_600SemiBold, Newsreader_700Bold
};

/** Loads the bundled fonts. `ready` becomes true when loaded or when loading failed (the system font is used). */
export const useAppFonts = (): { ready: boolean; failed: boolean } => {
    const [loaded, error] = useFonts(fontAssets);
    return { ready: loaded || !!error, failed: !!error };
};

// Web gets a full CSS fallback stack so text never falls back to a serif/mono default while a font loads.
const SANS_FALLBACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SERIF_FALLBACK = 'Georgia, "Times New Roman", serif';

/**
 * Returns the font-family string for a family + weight. Custom fonts are single-weight files, so the weight is
 * selected by choosing the right file name. Never combine these families with a `fontWeight` style (native ignores it
 * and web would fake-bold it): use `fontStyleFor` and spread the result.
 */
export const fontFamilyFor = (family: FontFamilyName, weight: FontWeightName): string => {
    const file = fontFiles[family][weight];
    if (Platform.OS === 'web') return `${file}, ${family === 'serif' ? SERIF_FALLBACK : SANS_FALLBACK}`;
    return file;
};

export const fontStyleFor = (family: FontFamilyName, weight: FontWeightName): Pick<TextStyle, 'fontFamily'> => ({
    fontFamily: fontFamilyFor(family, weight)
});
