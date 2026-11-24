// Central runtime configuration. Reads process.env lazily so tests can set it before use.
// dotenv is loaded only by server.js (never by the app factory), so tests can never pick up backend/.env.

// Trust the standalone production frontend; previews and custom domains must be configured explicitly.
const DEFAULT_WEB_ORIGINS = ['https://poth-collective-frontend.vercel.app'];

const DEV_ORIGINS = [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:5000'
];

const isProduction = () => process.env.NODE_ENV === 'production';
const isTest = () => process.env.NODE_ENV === 'test';

// Trusted browser origins: built-in defaults + CORS_ORIGINS (comma separated, exact match).
// Localhost origins are only trusted outside production. A wildcard is never accepted.
const allowedOrigins = () => {
    const fromEnv = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o && o !== '*');
    return [...new Set([...DEFAULT_WEB_ORIGINS, ...fromEnv, ...(isProduction() ? [] : DEV_ORIGINS)])];
};

const jwtSecret = () => process.env.JWT_SECRET;

module.exports = {
    isProduction,
    isTest,
    allowedOrigins,
    jwtSecret,
    TOKEN_TTL: '30d',
    DEMO_TOKEN_TTL: '24h',
    JWT_ALGORITHM: 'HS256',
    MAX_IMAGE_BYTES: 5 * 1024 * 1024
};
