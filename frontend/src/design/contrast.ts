/** WCAG 2.x contrast helpers (relative luminance, ratio, AA thresholds). Pure functions, no dependencies. */

export const AA_TEXT = 4.5; // normal text
export const AA_LARGE_TEXT = 3; // 18.66px bold / 24px regular and above
export const AA_UI = 3; // component boundaries, icons and focus indicators (WCAG 1.4.11)

const parseHex = (hex: string): [number, number, number] => {
    const match = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!match) throw new Error(`contrast: expected a 6 digit hex colour, got "${hex}"`);
    const n = parseInt(match[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const relativeLuminance = (hex: string): number => {
    const [r, g, b] = parseHex(hex).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string): number => {
    const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

export const meets = (ratio: number, minimum: number): boolean => ratio + 1e-9 >= minimum;

export const formatRatio = (ratio: number): string => `${ratio.toFixed(2)}:1`;
