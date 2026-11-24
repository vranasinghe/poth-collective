const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { createDemoAccount, demoEnabled } = require('../services/demoService');
const { deleteUserAccount } = require('../services/deletionService');
const { jwtSecret, TOKEN_TTL, JWT_ALGORITHM } = require('../config');
const { AppError, unauthorized, conflict, notFound } = require('../utils/AppError');

const BCRYPT_ROUNDS = 10;

// bcrypt hash of a random string, compared against when the account does not exist so that
// "unknown email" and "wrong password" take the same time.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_ROUNDS);

const generateToken = (id) =>
    jwt.sign({ id }, jwtSecret(), { expiresIn: TOKEN_TTL, algorithm: JWT_ALGORITHM });

const publicUser = (user, extra = {}) => ({
    _id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    userType: user.userType,
    nearestCity: user.nearestCity,
    phoneNumber: user.phoneNumber,
    email: user.email,
    ...(user.isDemo ? { isDemo: true, demoExpiresAt: user.demoExpiresAt } : {}),
    ...extra
});

// @route POST /api/users/register  (public, rate limited)
const registerUser = async (req, res) => {
    // req.body was validated and normalised (trimmed, lower-cased email, password policy) by validate()
    const { password, ...profile } = req.body;

    if (await User.exists({ email: profile.email })) {
        throw conflict('User exists');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    let user;
    try {
        user = await User.create({ ...profile, password: hashedPassword });
    } catch (err) {
        if (err.code === 11000) throw conflict('User exists'); // lost a race with another signup
        throw err;
    }

    res.status(201).json(publicUser(user, { token: generateToken(user._id) }));
};

// @route POST /api/users/login  (public, rate limited)
const loginUser = async (req, res) => {
    const rawEmail = req.body.email.trim();
    const email = rawEmail.toLowerCase();

    // Fall back to the exact stored value for accounts created before emails were lower-cased
    const user = (await User.findOne({ email })) || (await User.findOne({ email: rawEmail }));

    const hash = user && !user.deletedAt ? user.password : DUMMY_HASH;
    const matches = await bcrypt.compare(req.body.password, hash);

    if (!user || user.deletedAt || !matches) {
        throw unauthorized('Invalid credentials');
    }

    res.json(publicUser(user, { token: generateToken(user._id) }));
};

// @desc    Create a temporary demo account (auto-deleted after 24 hours)
// @route   POST /api/users/demo
const createDemoUser = async (req, res) => {
    if (!demoEnabled()) {
        throw notFound('Demo accounts are disabled');
    }
    const demo = await createDemoAccount(req.body.userType);
    res.status(201).json(demo);
};

// @route PUT /api/users/profile
const updateUser = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) throw notFound('User not found');

    const { firstName, lastName, email, password, currentPassword } = req.body;

    if (password) {
        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) throw new AppError(403, 'Current password is incorrect');
        user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
        user.passwordChangedAt = new Date();
    }
    if (email && email !== user.email) {
        if (await User.exists({ email, _id: { $ne: user._id } })) throw conflict('Email is already registered');
        user.email = email;
    }
    if (firstName) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    try {
        await user.save();
    } catch (err) {
        if (err.code === 11000) throw conflict('Email is already registered');
        throw err;
    }

    // A fresh token is issued on every profile update. After a password change it is the only valid one.
    res.json({
        _id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        token: generateToken(user._id)
    });
};

// @route DELETE /api/users/profile
// Anonymises the account (see services/deletionService.js for the full policy). The token stops working immediately.
const deleteUser = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) throw notFound('User not found');
    await deleteUserAccount(user);
    res.json({ message: 'Your account has been deleted' });
};

module.exports = { registerUser, loginUser, createDemoUser, updateUser, deleteUser, generateToken };
