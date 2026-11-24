const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a book title']
    },
    author: {
        type: String,
        required: [true, 'Please add an author name']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    price: {
        type: Number,
        required: [true, 'Please add a price'],
        min: [0, 'Price cannot be negative']
    },
    imageUrl: {
        type: String,
        default: ''
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Shop'
    },
    category: {
        type: String,
        required: [true, 'Please add a category']
    },
    stockCount: {
        type: Number,
        default: 0,
        min: [0, 'Stock count cannot be negative'],
        validate: { validator: Number.isInteger, message: 'Stock count must be a whole number' }
    },
    averageRating: {
        type: Number,
        default: 0
    },
    numReviews: {
        type: Number,
        default: 0
    },
    // Set instead of deleting when the book appears in orders. Archived books are hidden from catalogues
    // and cannot be ordered, but order history keeps rendering them. Documents without this field are active.
    archivedAt: {
        type: Date,
        default: null
    }
},{
    timestamps: true
});

bookSchema.index({ shop: 1, archivedAt: 1 });
bookSchema.index({ archivedAt: 1, category: 1, price: 1 });
bookSchema.index({ archivedAt: 1, averageRating: -1, numReviews: -1, _id: 1 });
bookSchema.index({ archivedAt: 1, createdAt: -1, _id: 1 });

module.exports = mongoose.model('Book', bookSchema);
