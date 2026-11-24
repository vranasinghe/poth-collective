const { isProduction } = require('../config');
const { AppError } = require('../utils/AppError');

const notFoundHandler = (req, res) => {
    res.status(404).json({ message: 'Route not found' });
};

// Central error handler. Clients only ever receive a stable, safe message:
// stack traces and internal error text are written to the server log, never to the response.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    // Errors thrown deliberately with a client-safe message. Only our own AppError is trusted:
    // third-party errors (body-parser, multer, mongoose) carry messages we do not control.
    if (err instanceof AppError) {
        const body = { message: err.message };
        if (err.details) body.errors = err.details;
        return res.status(err.status).json(body);
    }

    if (err.name === 'MulterError') {
        const messages = {
            LIMIT_FILE_SIZE: 'File is too large (max 5 MB)',
            LIMIT_FILE_COUNT: 'Only one file may be uploaded',
            LIMIT_UNEXPECTED_FILE: 'Unexpected file field'
        };
        return res.status(400).json({ message: messages[err.code] || 'Invalid file upload' });
    }
    if (err.name === 'ValidationError' && err.errors) {
        const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
        return res.status(400).json({ message: details[0]?.message || 'Validation failed', errors: details });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid identifier' });
    }
    if (err.code === 11000) {
        return res.status(409).json({ message: 'Duplicate value' });
    }
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
        return res.status(err.status || 400).json({ message: 'Invalid request body' });
    }
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ message: 'Not allowed by CORS' });
    }

    // Anything else is a server fault. Log privately (no request body, headers or credentials).
    console.error('Unhandled error:', {
        method: req.method,
        path: req.originalUrl.split('?')[0],
        name: err.name,
        message: err.message,
        stack: isProduction() ? undefined : err.stack
    });
    return res.status(500).json({ message: 'Internal server error' });
};

module.exports = { notFoundHandler, errorHandler };
