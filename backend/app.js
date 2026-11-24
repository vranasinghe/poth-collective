// Express application factory. It has no side effects: it does not read .env, connect to a database,
// or listen on a port. server.js does that. Tests import createApp() directly.
require('express-async-errors'); // forwards errors from async handlers to the error middleware

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { allowedOrigins } = require('./config');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const MINUTE = 60 * 1000;

const DEFAULT_LIMITS = {
    api: { windowMs: 15 * MINUTE, limit: 300, message: 'Too many requests, please try again later' },
    // Failed logins only (successful ones are not counted), keyed by IP + email, so one account cannot be
    // brute-forced even from many requests, and one noisy client cannot lock out unrelated users.
    loginAccount: { windowMs: 15 * MINUTE, limit: 8, message: 'Too many failed attempts, please try again later' },
    loginIp: { windowMs: 15 * MINUTE, limit: 30, message: 'Too many failed attempts, please try again later' },
    register: { windowMs: 60 * MINUTE, limit: 10, message: 'Too many sign-ups from this address, please try again later' },
    demo: { windowMs: 60 * MINUTE, limit: 10, message: 'Too many demo accounts requested, please try again later' }
};

// rateLimits: false disables every limiter (unit tests); an object overrides individual limiter options.
const buildLimiters = (rateLimits) => {
    const passthrough = (req, res, next) => next();
    const make = (name, extra = {}) => {
        if (rateLimits === false) return passthrough;
        const cfg = { ...DEFAULT_LIMITS[name], ...(rateLimits && rateLimits[name]) };
        return rateLimit({
            windowMs: cfg.windowMs,
            limit: cfg.limit,
            standardHeaders: 'draft-7',
            legacyHeaders: false,
            message: { message: cfg.message },
            ...extra
        });
    };
    const emailKey = (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.email || '').trim().toLowerCase()}`;
    return {
        api: make('api'),
        loginAccount: make('loginAccount', { skipSuccessfulRequests: true, keyGenerator: emailKey }),
        loginIp: make('loginIp', { skipSuccessfulRequests: true }),
        register: make('register'),
        demo: make('demo')
    };
};

const createApp = ({ rateLimits } = {}) => {
    const app = express();
    app.set('trust proxy', 1); // behind the platform proxy, so rate limiting sees real client IPs

    // Browsers may only call the API from trusted origins (config/index.js). Requests without an Origin header
    // (native apps, curl, server-to-server) are not subject to CORS and are authorised by their token alone.
    const corsOptions = {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins().includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
        credentials: true,
        optionsSuccessStatus: 200
    };

    const limiters = buildLimiters(rateLimits);

    app.use(helmet());
    app.use(cors(corsOptions));
    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: false, limit: '100kb' }));
    app.use(mongoSanitize()); // strips $ and . keys from body, query and params

    app.use('/api', limiters.api);
    app.use('/api/users/login', limiters.loginIp, limiters.loginAccount);
    app.use('/api/users/register', limiters.register);
    app.use('/api/users/demo', limiters.demo);

    app.get('/health', (req, res) => {
        const dbReady = mongoose.connection.readyState === 1;
        res.status(dbReady ? 200 : 503).json({ status: dbReady ? 'ok' : 'degraded' });
    });

    app.use('/api/users', require('./routes/userRoutes'));
    app.use('/api/shops', require('./routes/shopRoutes'));
    app.use('/api/books', require('./routes/bookRoutes'));
    app.use('/api/reviews', require('./routes/reviewRoutes'));
    app.use('/api/orders', require('./routes/orderRoutes'));
    app.use('/api/blogs', require('./routes/blogRoutes'));
    app.use('/api/reports', require('./routes/reportRoutes'));
    app.use('/api/merchant', require('./routes/merchantRoutes'));

    app.get('/', (req, res) => {
        res.status(200).json({ message: 'Poth API is running' });
    });

    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
};

module.exports = { createApp, DEFAULT_LIMITS };
