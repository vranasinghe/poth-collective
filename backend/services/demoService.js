const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Shop = require('../models/shopModel');
const Book = require('../models/bookModel');
const Review = require('../models/reviewModel');
const Order = require('../models/orderModel');
const Blog = require('../models/Blog');
const Report = require('../models/reportModel');

const DEMO_TTL_MS = 24 * 60 * 60 * 1000; // demo data lives for 24 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // sweep every 30 minutes
const MAX_ACTIVE_DEMOS = 500; // cap so the endpoint cannot flood the database

const demoEnabled = () => process.env.DEMO_ENABLED !== 'false';

const SAMPLE_BOOKS = require('../data/sampleBooks');

// Creates a throwaway account (plus sample shop data for shop owners) that expires in 24 hours.
const createDemoAccount = async (userType) => {
    const activeDemos = await User.countDocuments({ isDemo: true });
    if (activeDemos >= MAX_ACTIVE_DEMOS) {
        const err = new Error('Demo accounts are temporarily unavailable, please try again later');
        err.status = 503;
        throw err;
    }

    const id = crypto.randomBytes(6).toString('hex');
    const isOwner = userType === 'Shop Owner';
    const expiresAt = new Date(Date.now() + DEMO_TTL_MS);

    // Random password nobody knows: demo sessions work only through the token we return
    const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

    const user = await User.create({
        firstName: isOwner ? 'Demo Shop' : 'Demo',
        lastName: isOwner ? 'Owner' : 'Reader',
        userType,
        nearestCity: 'Colombo',
        phoneNumber: '0770000000',
        email: `demo-${id}@demo.poth.invalid`,
        password,
        isDemo: true,
        demoExpiresAt: expiresAt
    });

    if (isOwner) {
        const shop = await Shop.create({
            shopOwner: user._id,
            name: `Demo Bookshop ${id.slice(0, 4).toUpperCase()}`,
            description: 'A temporary demo shop. It is deleted automatically after 24 hours.',
            location: 'Colombo',
            contactNumber: '0770000000'
        });
        await Book.insertMany(SAMPLE_BOOKS.map((b) => ({ ...b, shop: shop._id })));
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    return {
        _id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        nearestCity: user.nearestCity,
        phoneNumber: user.phoneNumber,
        email: user.email,
        isDemo: true,
        demoExpiresAt: expiresAt,
        token
    };
};

const recalcRating = async (Model, targetId) => {
    const reviews = await Review.find({ targetId });
    const target = await Model.findById(targetId);
    if (!target) return;
    target.numReviews = reviews.length;
    target.averageRating = reviews.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
    await target.save();
};

// Deletes expired demo users and everything they own or created, including traces on real data.
const cleanupExpiredDemos = async () => {
    const expired = await User.find({ isDemo: true, demoExpiresAt: { $lte: new Date() } }).select('_id');
    if (!expired.length) return 0;
    const userIds = expired.map((u) => u._id);

    const shops = await Shop.find({ shopOwner: { $in: userIds } }).select('_id');
    const shopIds = shops.map((s) => s._id);
    const books = await Book.find({ shop: { $in: shopIds } }).select('_id');
    const bookIds = books.map((b) => b._id);

    // Orders: give stock back on books that survive (real shops) before deleting
    const orders = await Order.find({
        $or: [{ reader: { $in: userIds } }, { shop: { $in: shopIds } }]
    });
    for (const order of orders) {
        if (!['Delivered', 'Cancelled'].includes(order.status) && !bookIds.some((id) => id.equals(order.book))) {
            await Book.findByIdAndUpdate(order.book, { $inc: { stockCount: order.quantity } });
        }
    }
    await Order.deleteMany({ _id: { $in: orders.map((o) => o._id) } });

    // Reviews written by demo users on real shops/books need their ratings recalculated
    const outsideReviews = await Review.find({
        user: { $in: userIds },
        targetId: { $nin: [...shopIds, ...bookIds] }
    }).select('targetId targetModel');

    await Review.deleteMany({
        $or: [
            { user: { $in: userIds } },
            { targetId: { $in: [...shopIds, ...bookIds] } }
        ]
    });
    for (const r of outsideReviews) {
        await recalcRating(r.targetModel === 'Book' ? Book : Shop, r.targetId);
    }

    await Report.deleteMany({ shopId: { $in: shopIds } });
    await Book.deleteMany({ _id: { $in: bookIds } });
    await Shop.deleteMany({ _id: { $in: shopIds } });

    // Blogs by demo users, plus their likes, comments and follows on other people's content
    await Blog.deleteMany({ authorId: { $in: userIds } });
    await Blog.updateMany(
        { $or: [{ likes: { $in: userIds } }, { 'comments.userId': { $in: userIds } }] },
        { $pull: { likes: { $in: userIds }, comments: { userId: { $in: userIds } } } }
    );
    await Shop.updateMany({ followers: { $in: userIds } }, { $pull: { followers: { $in: userIds } } });

    await User.deleteMany({ _id: { $in: userIds } });
    return userIds.length;
};

const startDemoCleanup = () => {
    const run = async () => {
        try {
            const removed = await cleanupExpiredDemos();
            if (removed) console.log(`Demo cleanup: removed ${removed} expired demo account(s)`);
        } catch (err) {
            console.error('Demo cleanup failed:', err.message);
        }
    };
    run();
    return setInterval(run, CLEANUP_INTERVAL_MS).unref();
};

module.exports = { createDemoAccount, cleanupExpiredDemos, startDemoCleanup, demoEnabled };
