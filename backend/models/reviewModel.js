const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'User'
    },
    targetId: {
        type: mongoose.Schema.ObjectId,
        required: true,
        refPath: 'targetModel'
    },
    targetModel: {
        type: String,
        required: true,
        enum: ['Shop', 'Book']
    },
    rating: {
        type: Number,
        required: [true, 'Add a rating between 1 and 5'],
        min: 1,
        max: 5,
        validate: { validator: Number.isInteger, message: 'Rating must be a whole number from 1 to 5' }
    },
    comment: {
        type: String,
        required: [true, 'Add a comment']
    },
    imageUrl: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// One review per user per target. If an existing database already holds duplicates this index cannot be built;
// the controller still rejects duplicates, and scripts/report-duplicate-reviews.js lists them (read-only).
reviewSchema.index({ user: 1, targetModel: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
