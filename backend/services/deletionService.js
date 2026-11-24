const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const Shop = require('../models/shopModel');
const Book = require('../models/bookModel');
const Order = require('../models/orderModel');
const Review = require('../models/reviewModel');
const Report = require('../models/reportModel');
const Blog = require('../models/Blog');
const { runInTransaction, transactionsSupported } = require('./transaction');
const { OPEN_STATUSES, transitionOrder } = require('./orderService');
const { recalcRating } = require('./ratingService');
const { conflict } = require('../utils/AppError');

/*
 * DELETION POLICY (see docs/DATA_LIFECYCLE.md)
 *
 *  Orders     never hard-deleted. They are the record both parties rely on. A party can only hide an order
 *             from their own list once it is Delivered or Cancelled.
 *  Books      "delete" archives (archivedAt). Hidden from catalogues, cannot be ordered, order history still
 *             renders it. Hard-deleted only if it never appeared in an order AND the database supports
 *             transactions (so "never ordered" is proven atomically).
 *  Shops      refused (409) while any order is Pending/Confirmed/Shipped. Otherwise archived together with its
 *             books; hard-deleted (with books, reviews and reports) only if it never had an order.
 *  Users      anonymised, not removed: the document stays as a tombstone (deletedAt set, personal data and
 *             credentials erased) so orders keep a valid reference. Their reviews, blogs, likes, comments and
 *             follows are removed. Pending/Confirmed orders are cancelled and stock returned. Refused (409)
 *             while the user has an order in transit or their shop has open orders.
 *  Reports    kept with an archived shop; removed with a hard-deleted shop.
 *  Reviews    removed with their author or with a hard-deleted target; ratings are recomputed.
 */

const removeBook = async (book) => {
    // 1. Atomically stop any new order for this book
    await Book.updateOne({ _id: book._id, archivedAt: null }, { $set: { archivedAt: new Date() } });

    // 2. Hard delete only when provably never ordered
    if (!(await transactionsSupported())) return { archived: true };

    return runInTransaction(async (session) => {
        const ordered = await Order.countDocuments({ book: book._id }, { session });
        if (ordered > 0) return { archived: true };
        await Review.deleteMany({ targetModel: 'Book', targetId: book._id }, { session });
        await Book.deleteOne({ _id: book._id }, { session });
        return { archived: false };
    });
};

const assertNoOpenOrders = async (shopIds, message) => {
    const open = await Order.countDocuments({ shop: { $in: shopIds }, status: { $in: OPEN_STATUSES } });
    if (open > 0) throw conflict(message);
};

const removeShop = async (shop) => {
    await assertNoOpenOrders([shop._id], 'This shop has open orders. Confirm, ship or cancel them before deleting the shop.');

    // Archive shop and books first: new orders are refused from this point on
    const now = new Date();
    await Shop.updateOne({ _id: shop._id, archivedAt: null }, { $set: { archivedAt: now } });
    await Book.updateMany({ shop: shop._id, archivedAt: null }, { $set: { archivedAt: now } });

    if (!(await transactionsSupported())) return { archived: true };

    return runInTransaction(async (session) => {
        const ordered = await Order.countDocuments({ shop: shop._id }, { session });
        if (ordered > 0) return { archived: true };
        const books = await Book.find({ shop: shop._id }).select('_id').session(session);
        const bookIds = books.map((b) => b._id);
        await Review.deleteMany(
            { $or: [{ targetModel: 'Shop', targetId: shop._id }, { targetModel: 'Book', targetId: { $in: bookIds } }] },
            { session }
        );
        await Report.deleteMany({ shopId: shop._id }, { session });
        await Book.deleteMany({ shop: shop._id }, { session });
        await Shop.deleteOne({ _id: shop._id }, { session });
        return { archived: false };
    });
};

const deleteUserAccount = async (user) => {
    const shops = await Shop.find({ shopOwner: user._id, archivedAt: null }).select('_id');
    const shopIds = shops.map((s) => s._id);

    // Preflight: refuse before changing anything
    const inTransit = await Order.countDocuments({ reader: user._id, status: 'Shipped' });
    if (inTransit > 0) {
        throw conflict('You have an order in transit. Wait for delivery before deleting your account.');
    }
    if (shopIds.length) {
        await assertNoOpenOrders(shopIds, 'Your shop has open orders. Confirm, ship or cancel them before deleting your account.');
    }

    // Reader side: cancel unfinished orders and return their stock
    const cancellable = await Order.find({ reader: user._id, status: { $in: ['Pending', 'Confirmed'] } });
    for (const order of cancellable) {
        try {
            await transitionOrder(order, 'Cancelled');
        } catch (err) {
            if (err.status !== 409) throw err; // someone else just changed it; fine
        }
    }

    // Owner side
    for (const shop of shops) {
        await removeShop(shop);
    }

    // Reviews written by the user, with rating recomputation on every target they touched
    const reviews = await Review.find({ user: user._id }).select('targetId targetModel');
    await Review.deleteMany({ user: user._id });
    for (const r of reviews) {
        await recalcRating(r.targetModel, r.targetId);
    }

    // Community content and follows
    await Blog.deleteMany({ authorId: user._id });
    await Blog.updateMany(
        { $or: [{ likes: user._id }, { 'comments.userId': user._id }] },
        { $pull: { likes: user._id, comments: { userId: user._id } } }
    );
    await Shop.updateMany({ followers: user._id }, { $pull: { followers: user._id } });

    // Tombstone: erase personal data and credentials, keep the _id for historical references
    const unusablePassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    await User.updateOne(
        { _id: user._id },
        {
            $set: {
                firstName: 'Deleted',
                lastName: 'User',
                email: `deleted-${user._id}@deleted.invalid`,
                phoneNumber: '0000000000',
                nearestCity: 'N/A',
                password: unusablePassword,
                passwordChangedAt: new Date(),
                isDemo: false,
                demoExpiresAt: null,
                deletedAt: new Date()
            }
        }
    );
};

module.exports = { removeBook, removeShop, deleteUserAccount };
