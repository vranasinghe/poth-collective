const Book = require('../models/bookModel');
const Shop = require('../models/shopModel');
const imageStorage = require('../utils/imageStorage');
const { removeBook } = require('../services/deletionService');
const { forbidden, notFound, conflict } = require('../utils/AppError');

const ACTIVE = { archivedAt: null };

// Loads a book together with its shop and verifies the caller owns that shop.
const loadOwnedBook = async (bookId, user) => {
    const book = await Book.findOne({ _id: bookId, ...ACTIVE }).populate('shop');
    if (!book || !book.shop) throw notFound('Book not found');
    if (String(book.shop.shopOwner) !== String(user._id)) throw forbidden('Not authorized to modify this book');
    return book;
};

// @route GET /api/books  (public)
const getBooks = async (req, res) => {
    if (req.query.page !== undefined) {
        const { filter, sort, page, limit } = require('../utils/catalogueQuery').catalogueQuery(req.query);
        const [items, total, categories] = await Promise.all([
            Book.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate('shop', 'name location'),
            Book.countDocuments(filter), Book.distinct('category', ACTIVE)
        ]);
        return res.json({ items, total, page, pages: Math.ceil(total / limit), categories: categories.sort() });
    }
    const books = await Book.find(ACTIVE).populate('shop', 'name location');
    res.status(200).json(books);
};

// @route GET /api/books/:id  (public)
const getBookById = async (req, res) => {
    const book = await Book.findOne({ _id: req.params.id, ...ACTIVE }).populate('shop', 'name location');
    if (!book) throw notFound('Book not found');
    res.status(200).json(book);
};

// @route GET /api/books/shop/:shopId  (public)
const getBooksByShop = async (req, res) => {
    const books = await Book.find({ shop: req.params.shopId, ...ACTIVE });
    res.status(200).json(books);
};

// @route GET /api/books/owner/me
const getBooksByOwner = async (req, res) => {
    const shops = await Shop.find({ shopOwner: req.user._id, archivedAt: null }).select('_id');
    const books = await Book.find({ shop: { $in: shops.map((s) => s._id) }, ...ACTIVE }).populate('shop', 'name');
    res.status(200).json(books);
};

// @route POST /api/books  (Shop Owner, owner of the target shop)
const addBook = async (req, res) => {
    const { shop: shopId, ...fields } = req.body;

    const shop = await Shop.findOne({ _id: shopId, archivedAt: null });
    if (!shop) throw notFound('Shop not found');
    if (String(shop.shopOwner) !== String(req.user._id)) throw forbidden('You can only add books to your own shops');

    const imageUrl = req.file ? await imageStorage.storeImage(req.file) : '';

    // Only allow-listed fields reach the model; ratings and review counts start at zero
    const book = await Book.create({ ...fields, shop: shop._id, imageUrl });
    res.status(201).json(book);
};

// @route PUT /api/books/:id  (owner of the book's shop)
const updateBook = async (req, res) => {
    const book = await loadOwnedBook(req.params.id, req.user);

    // The shop, ratings, review counts and archive state are never client-writable
    const { expectedStockCount, ...fields } = req.body;
    if (expectedStockCount !== undefined) {
        if (req.file) fields.imageUrl = await imageStorage.storeImage(req.file);
        const updated = await Book.findOneAndUpdate(
            { _id: book._id, archivedAt: null, stockCount: expectedStockCount },
            { $set: fields }, { new: true, runValidators: true }
        );
        if (!updated) throw conflict('Stock changed while you were editing. Reload this book and review the current quantity.');
        return res.json(updated);
    }
    book.set(fields);
    if (req.file) book.imageUrl = await imageStorage.storeImage(req.file);

    await book.save(); // runs schema validators
    res.status(200).json(book);
};

// @route DELETE /api/books/:id  (owner of the book's shop)
// Archives the book (or hard-deletes it if it never appeared in an order); see services/deletionService.js
const deleteBook = async (req, res) => {
    const book = await loadOwnedBook(req.params.id, req.user);
    const { archived } = await removeBook(book);
    res.status(200).json({
        id: req.params.id,
        message: archived ? 'Book removed from sale. Order history has been retained.' : 'Book deleted'
    });
};

module.exports = { getBooks, getBookById, getBooksByShop, addBook, updateBook, deleteBook, getBooksByOwner };
