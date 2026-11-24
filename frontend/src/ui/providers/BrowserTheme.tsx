import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const STYLE_ID = 'poth-browser-theme';

/**
 * The parts of a web page that are not drawn by components still carry the design: text selection, scrollbars,
 * form accents, link underline offset and the page background behind short content. Renders nothing; on native it is
 * a no-op.
 */
export function BrowserTheme() {
    const theme = useTheme();
    const c = theme.colors;

    useEffect(() => {
        if (Platform.OS !== 'web' || typeof document === 'undefined') return;
        let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
        if (!el) {
            el = document.createElement('style');
            el.id = STYLE_ID;
            document.head.appendChild(el);
        }
        el.textContent = `
            :root { color-scheme: ${theme.scheme}; accent-color: ${c.primary}; }
            html, body { background-color: ${c.canvas}; }
            ::selection { background: ${c.primary}; color: ${c.onPrimary}; }
            * { scrollbar-width: thin; scrollbar-color: ${c.borderStrong} transparent; }
            *::-webkit-scrollbar { width: 10px; height: 10px; }
            *::-webkit-scrollbar-thumb { background: ${c.borderStrong}; border-radius: 8px; border: 2px solid ${c.canvas}; }
            *::-webkit-scrollbar-track { background: transparent; }
            input, textarea { caret-color: ${c.primary}; }
            input::placeholder, textarea::placeholder { color: ${c.textMuted}; opacity: 1; }
            a { text-underline-offset: 3px; }
            @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
        `;
    }, [theme.scheme, c.primary, c.onPrimary, c.canvas, c.borderStrong, c.textMuted]);

    return null;
}
