import { contrastRatio, formatRatio } from '../contrast';
import { evaluatePairs, pairs, restrictedPairs } from '../a11yPairs';
import { colorSchemes, palette } from '../tokens';

describe.each(['light', 'dark'] as const)('colour contrast (%s scheme)', (scheme) => {
    const results = evaluatePairs(scheme);

    test('declares a meaningful number of pairings', () => {
        expect(results.length).toBe(pairs.length);
        expect(results.length).toBeGreaterThan(40);
    });

    test.each(results.map((r) => [r.id, r] as const))('%s meets its WCAG threshold', (_id, r) => {
        // The failure message names the usage, both colours and the measured ratio
        expect({ usage: r.usage, fg: r.fgHex, bg: r.bgHex, ratio: formatRatio(r.ratio), needs: r.min, pass: r.pass })
            .toEqual(expect.objectContaining({ pass: true }));
    });
});

describe('proposed brand palette', () => {
    test('ink, primary and canvas are comfortably accessible together', () => {
        expect(contrastRatio(palette.text, palette.canvas)).toBeGreaterThan(12);
        expect(contrastRatio(palette.text, palette.surface)).toBeGreaterThan(10);
        expect(contrastRatio(palette.white, palette.primary)).toBeGreaterThan(11);
        expect(contrastRatio(palette.primary, palette.surface)).toBeGreaterThan(9);
    });

    test('the copper accent is NOT usable as text or with white text (documented limitation)', () => {
        expect(contrastRatio(palette.accent, palette.canvas)).toBeLessThan(4.5);
        expect(contrastRatio(palette.accent, palette.white)).toBeLessThan(4.5);
        expect(contrastRatio(palette.white, palette.accent)).toBeLessThan(4.5);
        // ...but ink on copper works, which is what the system uses
        expect(contrastRatio(palette.text, palette.accent)).toBeGreaterThanOrEqual(4.5);
    });
});

describe('restricted pairings stay restricted', () => {
    test.each(restrictedPairs.map((r) => [r.id, r] as const))('%s is below its threshold, so the rule is still needed', (_id, r) => {
        const colors = colorSchemes[r.scheme];
        expect(contrastRatio(r.fg(colors), r.bg(colors))).toBeLessThan(r.min);
    });
});

describe('token hygiene', () => {
    const flatten = (obj: Record<string, unknown>, prefix = ''): [string, string][] =>
        Object.entries(obj).flatMap(([k, v]) =>
            typeof v === 'string' ? [[`${prefix}${k}`, v] as [string, string]] : flatten(v as Record<string, unknown>, `${prefix}${k}.`)
        );

    test.each(['light', 'dark'] as const)('%s tokens are all valid colours', (scheme) => {
        for (const [key, value] of flatten(colorSchemes[scheme] as unknown as Record<string, unknown>)) {
            expect({ key, ok: /^#[0-9a-f]{6}$/i.test(value) || /^rgba\(\d+, \d+, \d+, (0|1|0?\.\d+)\)$/.test(value) }).toEqual({ key, ok: true });
        }
    });

    test('light and dark define exactly the same token names', () => {
        const names = (o: object): string[] => flatten(o as Record<string, unknown>).map(([k]) => k).sort();
        expect(names(colorSchemes.dark)).toEqual(names(colorSchemes.light));
    });
});
