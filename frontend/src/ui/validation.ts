/**
 * Client-side validators for inline feedback. They exist to help people fix mistakes before submitting; the backend
 * (backend/validators/schemas.js) remains the authority and uses the same rules. Each returns an error message or
 * `undefined` when the value is fine, so they plug straight into `TextField validate={...}`.
 */
export type Validator = (value: string) => string | undefined;

export const required = (label: string): Validator => (v) => (v.trim() ? undefined : `${label} is required`);

export const validateEmail: Validator = (v) => {
    const value = v.trim();
    if (!value) return 'Email is required';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : 'Enter a valid email address, like name@example.com';
};

/** Sri Lankan style numbers: exactly 10 digits, as enforced by the API. */
export const validatePhone: Validator = (v) => {
    const value = v.trim();
    if (!value) return 'Phone number is required';
    return /^\d{10}$/.test(value) ? undefined : 'Enter exactly 10 digits, without spaces or dashes';
};

export type PasswordRule = { id: string; label: string; test: (v: string) => boolean };

/** Mirrors the server policy: 9 to 128 characters with at least one letter and one number. */
export const passwordRules: PasswordRule[] = [
    { id: 'length', label: 'At least 9 characters', test: (v) => v.length >= 9 && v.length <= 128 },
    { id: 'letter', label: 'Contains a letter', test: (v) => /[A-Za-z]/.test(v) },
    { id: 'number', label: 'Contains a number', test: (v) => /\d/.test(v) }
];

export const validateNewPassword: Validator = (v) => {
    if (!v) return 'Password is required';
    const failed = passwordRules.find((r) => !r.test(v));
    return failed ? `Password needs: ${failed.label.toLowerCase()}` : undefined;
};

/** Run validators in order; the first message wins. */
export const compose = (...validators: Validator[]): Validator => (v) => {
    for (const validate of validators) {
        const message = validate(v);
        if (message) return message;
    }
    return undefined;
};
