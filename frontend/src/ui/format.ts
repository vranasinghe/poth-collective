/** Display formatting shared by the cards. Pure functions. */

/** Rs. 2,800 (whole rupees) or Rs. 2,800.50 when there are cents. */
export const formatPrice = (amount: number): string => {
    const value = Number.isFinite(amount) ? amount : 0;
    const fixed = Number.isInteger(value) ? String(value) : value.toFixed(2);
    const [whole, cents] = fixed.split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `Rs. ${grouped}${cents ? `.${cents}` : ''}`;
};

/** 24 Nov 2026 */
export const formatDate = (value: string | number | Date | undefined | null): string => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** The last six characters of a Mongo id, upper-cased, as shown on orders. */
export const shortId = (id: string | undefined | null): string => (id ? id.slice(-6).toUpperCase() : '------');

/** Up to two initials for an avatar. */
export const initials = (name: string | undefined | null): string => {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};
