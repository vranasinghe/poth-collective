const mongoose = require('mongoose');
const Review = require('../models/reviewModel');
const Book = require('../models/bookModel');
const Shop = require('../models/shopModel');

// Recomputes a target's rating from the reviews that exist right now (one aggregation, one write),
// so the stored average always converges on the true value even when reviews arrive concurrently.
const recalcRating = async (targetModel, targetId) => {
    const Model = targetModel === 'Book' ? Book : Shop;
    const id = new mongoose.Types.ObjectId(String(targetId));

    const [agg] = await Review.aggregate([
        { $match: { targetModel, targetId: id } },
        { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }
    ]);

    await Model.updateOne(
        { _id: id },
        { $set: { numReviews: agg ? agg.n : 0, averageRating: agg ? Math.round(agg.avg * 100) / 100 : 0 } }
    );
};

module.exports = { recalcRating };
