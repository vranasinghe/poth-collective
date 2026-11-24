// The showcase uses its own API; no fallback targets the original project.
const configuredOrigin = process.env.EXPO_PUBLIC_API_URL;
if (process.env.NODE_ENV === 'production' && !configuredOrigin) {
  throw new Error('EXPO_PUBLIC_API_URL must be configured for deployment.');
}
export const API_BASE_URL = (configuredOrigin || 'http://localhost:5000').replace(/\/$/, '');
export const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };
