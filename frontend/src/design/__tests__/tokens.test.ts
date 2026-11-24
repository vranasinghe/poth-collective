import { breakpointFor, breakpointOrder, breakpoints, fontFiles, iconSizes, radii, sizes, spacing, textStyles } from '../tokens';
import { darkTheme, lightTheme } from '../theme';
import { computeColumns } from '../../ui/components/ResponsiveGrid';
import { formatDate, formatPrice, initials, shortId } from '../../ui/format';
import { compose, passwordRules, required, validateEmail, validateNewPassword, validatePhone } from '../../ui/validation';

describe('breakpoints', () => {
    test.each([
        [320, 'compact'], [359, 'compact'], [360, 'phone'], [393, 'phone'], [599, 'phone'],
        [600, 'tablet'], [820, 'tablet'], [1023, 'tablet'], [1024, 'desktop'], [1439, 'desktop'], [1440, 'wide'], [2560, 'wide']
    ] as const)('%ipx is %s', (width, expected) => {
        expect(breakpointFor(width)).toBe(expected);
    });

    test('are strictly increasing in declared order', () => {
        const values = breakpointOrder.map((b) => breakpoints[b]);
        expect(values).toEqual([...values].sort((a, b) => a - b));
        expect(new Set(values).size).toBe(values.length);
    });

    test('every breakpoint has a gutter and grid gap', () => {
        for (const b of breakpointOrder) {
            expect(sizes.gutter[b]).toBeGreaterThanOrEqual(16);
            expect(sizes.gridGap[b]).toBeGreaterThanOrEqual(12);
        }
    });
});

describe('scales', () => {
    test('spacing is strictly increasing', () => {
        const values = Object.values(spacing);
        expect(values).toEqual([...values].sort((a, b) => a - b));
    });

    test('interactive controls are really 44 dp (React Native Web has no hitSlop, so the visual size must meet it)', () => {
        expect(sizes.touchTarget).toBeGreaterThanOrEqual(44);
        expect(sizes.button.md).toBeGreaterThanOrEqual(44);
        expect(sizes.button.sm).toBeGreaterThanOrEqual(44);
        expect(sizes.chip).toBeGreaterThanOrEqual(44);
        expect(sizes.field).toBeGreaterThanOrEqual(44);
        expect(sizes.iconButton.md).toBeGreaterThanOrEqual(44);
    });

    test('type scale: nothing below 12px; line height >= 1.25x up to 20px and >= 1.15x for larger headings; headings use the serif', () => {
        for (const [name, s] of Object.entries(textStyles)) {
            expect({ name, ok: s.size >= 12 && s.lineHeight / s.size >= (s.size <= 20 ? 1.25 : 1.15) }).toEqual({ name, ok: true });
        }
        expect(textStyles.display.family).toBe('serif');
        expect(textStyles.screenTitle.family).toBe('serif');
        expect(textStyles.sectionTitle.family).toBe('serif');
        expect(textStyles.body.family).toBe('sans');
        expect(textStyles.body.size).toBeGreaterThanOrEqual(16); // avoids iOS zoom on inputs
    });

    test('hierarchy: display > screen title > section title > card title > body > caption', () => {
        const order = ['display', 'screenTitle', 'sectionTitle', 'cardTitle', 'body', 'bodySmall', 'caption'] as const;
        const sizesInOrder = order.map((k) => textStyles[k].size);
        expect(sizesInOrder).toEqual([...sizesInOrder].sort((a, b) => b - a));
    });

    test('every font weight used by a text style has a font file', () => {
        for (const s of Object.values(textStyles)) {
            expect(fontFiles[s.family][s.weight]).toBeTruthy();
        }
    });

    test('radii and icon sizes are ordered', () => {
        expect([radii.xs, radii.sm, radii.md, radii.lg, radii.xl]).toEqual([4, 8, 16, 24, 32]);
        expect(iconSizes.xs).toBeLessThan(iconSizes.sm);
        expect(iconSizes.lg).toBeLessThan(iconSizes.xl);
    });
});

describe('legacy theme compatibility (existing screens must keep resolving every key they read)', () => {
    // Collected from `theme.colors.*`, `theme.spacing.*`, `theme.radii.*`, `theme.shadows.*` usage across app/ and components/
    const legacyColors = ['primary', 'textSecondary', 'textMuted', 'surface', 'error', 'border', 'textPrimary', 'accent', 'background', 'surfaceMuted', 'success', 'primaryLight', 'primaryDark', 'warning', 'pastelBlue', 'info', 'pastelLavender', 'accentLight'];

    test.each([['light', lightTheme], ['dark', darkTheme]] as const)('%s theme exposes every legacy colour as a string', (_n, theme) => {
        for (const key of legacyColors) {
            expect({ key, type: typeof (theme.colors as unknown as Record<string, unknown>)[key] }).toEqual({ key, type: 'string' });
        }
    });

    test('legacy spacing, radii, shadows and type scale keys resolve', () => {
        for (const k of ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']) expect(typeof (lightTheme.spacing as Record<string, number>)[k]).toBe('number');
        for (const k of ['sm', 'md', 'lg', 'full']) expect(typeof (lightTheme.radii as Record<string, number>)[k]).toBe('number');
        expect(lightTheme.shadows.subtle).toHaveProperty('shadowOpacity');
        expect(lightTheme.shadows.medium).toHaveProperty('elevation');
        for (const k of ['h1', 'h2', 'h3', 'body', 'bodySmall', 'caption', 'button']) expect(lightTheme.typography.scale).toHaveProperty(k);
        expect(lightTheme.typography.fontFamily).toBeDefined();
    });

    test('legacy meanings are preserved: surface is the white card, accent is the contrast-safe copper', () => {
        expect(lightTheme.colors.surface).toBe('#FFFFFF');
        expect(lightTheme.colors.surfaceMuted).toBe('#E9E3D7');
        expect(lightTheme.colors.accent).toBe(lightTheme.colors.accent.toUpperCase());
        expect(lightTheme.colors.accent).not.toBe('#C58B59');
        expect(lightTheme.colors.background).toBe('#F8F6F0');
    });
});

describe('ResponsiveGrid column maths', () => {
    const base = { gap: 16 };
    test('uses the breakpoint table by default', () => {
        expect(computeColumns({ ...base, width: 360, breakpoint: 'phone' })).toBe(2);
        expect(computeColumns({ ...base, width: 700, breakpoint: 'tablet' })).toBe(3);
        expect(computeColumns({ ...base, width: 1100, breakpoint: 'desktop' })).toBe(4);
        expect(computeColumns({ ...base, width: 1500, breakpoint: 'wide' })).toBe(5);
    });
    test('per-breakpoint overrides win', () => {
        expect(computeColumns({ ...base, width: 360, breakpoint: 'phone', columns: { phone: 1 } })).toBe(1);
    });
    test('auto-fit never makes items narrower than minItemWidth and always gives at least one column', () => {
        for (const width of [200, 320, 375, 480, 768, 1120]) {
            const cols = computeColumns({ ...base, width, breakpoint: 'phone', minItemWidth: 156 });
            expect(cols).toBeGreaterThanOrEqual(1);
            if (cols > 1) expect((width - base.gap * (cols - 1)) / cols).toBeGreaterThanOrEqual(156);
        }
        expect(computeColumns({ ...base, width: 1120, breakpoint: 'desktop', minItemWidth: 156 })).toBe(6);
    });
});

describe('formatting helpers', () => {
    test('formatPrice', () => {
        expect(formatPrice(2800)).toBe('Rs. 2,800');
        expect(formatPrice(1234567)).toBe('Rs. 1,234,567');
        expect(formatPrice(950.5)).toBe('Rs. 950.50');
        expect(formatPrice(NaN)).toBe('Rs. 0');
    });
    test('formatDate, shortId, initials', () => {
        expect(formatDate('2026-11-24T10:00:00Z')).toMatch(/24 Nov 2026/);
        expect(formatDate(undefined)).toBe('');
        expect(formatDate('not a date')).toBe('');
        expect(shortId('65f1c9a2b7d4e8a1c3f5a9d2')).toBe('F5A9D2');
        expect(initials('Nimali Perera')).toBe('NP');
        expect(initials('Kamal')).toBe('K');
        expect(initials('')).toBe('?');
    });
});

describe('validators mirror the server rules', () => {
    test('email', () => {
        expect(validateEmail('')).toMatch(/required/);
        expect(validateEmail('nope')).toMatch(/valid email/);
        expect(validateEmail('a@b.co')).toBeUndefined();
    });
    test('phone is exactly 10 digits', () => {
        expect(validatePhone('077123456')).toBeDefined();
        expect(validatePhone('0771234567')).toBeUndefined();
        expect(validatePhone('077-123-4567')).toBeDefined();
    });
    test('password policy: 9-128 chars with a letter and a number', () => {
        expect(validateNewPassword('')).toBeDefined();
        expect(validateNewPassword('Abcdefg1')).toMatch(/9 characters/); // 8 characters
        expect(validateNewPassword('abcdefghij')).toMatch(/number/);
        expect(validateNewPassword('1234567890')).toMatch(/letter/);
        expect(validateNewPassword('Sup3rSecret99')).toBeUndefined();
        expect(passwordRules.every((r) => r.test('Sup3rSecret99'))).toBe(true);
    });
    test('compose returns the first message', () => {
        expect(compose(required('Name'), () => 'second')('')).toBe('Name is required');
        expect(compose(required('Name'), () => 'second')('x')).toBe('second');
    });
});
