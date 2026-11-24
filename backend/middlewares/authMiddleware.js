const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { jwtSecret, JWT_ALGORITHM } = require('../config');
const { AppError, unauthorized, forbidden } = require('../utils/AppError');

const SHOP_OWNER = 'Shop Owner';

// Verifies the bearer token and the current state of the account it names.
// Returns the user document, or throws a 401 AppError. Database outages propagate as 500s.
const authenticate = async (req) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        throw unauthorized('Not authorized, no token');
    }
    const token = header.slice('Bearer '.length).trim();

    let decoded;
    try {
        // Algorithm is pinned; jwt.verify also enforces the exp claim.
        decoded = jwt.verify(token, jwtSecret(), { algorithms: [JWT_ALGORITHM] });
    } catch (err) {
        throw unauthorized(err.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Not authorized, token failed');
    }
    if (!decoded || typeof decoded.id !== 'string' || !/^[a-f\d]{24}$/i.test(decoded.id)) {
        throw unauthorized('Not authorized, token failed');
    }

    const user = await User.findById(decoded.id).select('-password');
    // Deleted accounts (hard-deleted or anonymised tombstones) can never authenticate
    if (!user || user.deletedAt) {
        throw unauthorized('Not authorized, user not found');
    }
    // Tokens issued before the last password change are revoked
    if (user.passwordChangedAt && Math.floor(user.passwordChangedAt.getTime() / 1000) > decoded.iat) {
        throw unauthorized('Session expired, please log in again');
    }
    if (user.isDemo && user.demoExpiresAt && user.demoExpiresAt.getTime() <= Date.now()) {
        throw unauthorized('Demo session expired');
    }
    return user;
};

const protect = async (req, res, next) => {
    req.user = await authenticate(req);
    next();
};

// Attaches req.user when a valid token is present, but never rejects. For public endpoints
// whose response differs for signed-in viewers.
const optionalAuth = async (req, res, next) => {
    if (req.headers.authorization) {
        try {
            req.user = await authenticate(req);
        } catch (err) {
            if (!(err instanceof AppError)) throw err; // real server errors still surface
        }
    }
    next();
};

const requireRole = (role) => (req, res, next) => {
    if (req.user && req.user.userType === role) return next();
    throw forbidden(`Only a ${role} can perform this action`);
};

const isShopOwner = requireRole(SHOP_OWNER);

module.exports = { protect, optionalAuth, requireRole, isShopOwner, SHOP_OWNER };
