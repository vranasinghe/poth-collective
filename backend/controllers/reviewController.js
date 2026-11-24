const Review = require('../models/reviewModel');
const Book = require('../models/bookModel');
const Shop = require('../models/shopModel');
const imageStorage = require('../utils/imageStorage');
const { recalcRating } = require('../services/ratingService');
const { badRequest, forbidden, notFound, conflict } = require('../utils/AppError');

const duplicateMessage = 'You have already reviewed this item';

// @route GET /api/reviews/:targetId  (public)
const getReviews = async (req, res) => {
    const reviews = await Review.find({ targetId: req.params.targetId })
        .sort({ createdAt: -1 })
        .populate('user', 'firstName lastName');
    res.status(200).json(reviews);
};

// @route POST /api/reviews  (signed in; multipart, optional image)
const addReview = async (req, res) => {
    const { targetId, targetModel, rating, comment } = req.body;

    // The target must exist, be active, and be of the stated kind
    let ownerId;
    if (targetModel === 'Shop') {
        const shop = await Shop.findOne({ _id: targetId, archivedAt: null }).select('shopOwner');
        if (!shop) throw notFound('Shop not found');
        ownerId = shop.shopOwner;
    } else {
        const book = await Book.findOne({ _id: targetId, archivedAt: null }).populate('shop', 'shopOwner');
        if (!book || !book.shop) throw notFound('Book not found');
        ownerId = book.shop.shopOwner;
    }

    // Owners cannot review their own shop or the books it sells
    if (String(ownerId) === String(req.user._id)) {
        throw forbidden(targetModel === 'Shop' ? 'Shop owners cannot review their own shops' : 'Shop owners cannot review their own books');
    }

    if (await Review.exists({ user: req.user._id, targetModel, targetId })) {
        throw conflict(duplicateMessage);
    }

    const imageUrl = req.file ? await imageStorage.storeImage(req.file) : null;

    let review;
    try {
        review = await Review.create({ user: req.user._id, targetId, targetModel, rating, comment, imageUrl });
    } catch (err) {
        if (err.code === 11000) throw conflict(duplicateMessage); // lost a race; the unique index decided
        throw err;
    }

    await recalcRating(targetModel, targetId);
    res.status(201).json(review);
};

// @route GET /api/reviews/me
const getMyReviews = async (req, res) => {
    const reviews = await Review.find({ user: req.user._id })
        .populate({ path: 'targetId', select: 'title name' });
    res.status(200).json(reviews);
};

const loadOwnReview = async (id, user) => {
    const review = await Review.findById(id);
    if (!review) throw notFound('Review not found');
    if (String(review.user) !== String(user._id)) throw forbidden('You can only change your own reviews');
    return review;
};

// @route PUT /api/reviews/:id  (author only; only rating and comment are editable)
const updateReview = async (req, res) => {
    const review = await loadOwnReview(req.params.id, req.user);
    if (req.body.rating === undefined && req.body.comment === undefined) {
        throw badRequest('Nothing to update');
    }
    if (req.body.rating !== undefined) review.rating = req.body.rating;
    if (req.body.comment !== undefined) review.comment = req.body.comment;
    await review.save();
    await recalcRating(review.targetModel, review.targetId);
    res.status(200).json(review);
};

// @route DELETE /api/reviews/:id  (author only)
const deleteReview = async (req, res) => {
    const review = await loadOwnReview(req.params.id, req.user);
    const { targetModel, targetId } = review;
    await review.deleteOne();
    await recalcRating(targetModel, targetId);
    res.status(200).json({ message: 'Review removed' });
};

module.exports = { getReviews, addReview, getMyReviews, updateReview, deleteReview };
