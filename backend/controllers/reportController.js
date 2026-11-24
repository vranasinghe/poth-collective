const Report = require('../models/reportModel');
const Book = require('../models/bookModel');
const Shop = require('../models/shopModel');
const imageStorage = require('../utils/imageStorage');
const { forbidden, notFound } = require('../utils/AppError');

const loadOwnedShop = async (shopId, user) => {
    const shop = await Shop.findOne({ _id: shopId, archivedAt: null });
    if (!shop) throw notFound('Shop not found');
    if (String(shop.shopOwner) !== String(user._id)) throw forbidden('Not authorized');
    return shop;
};

const stockBreakdown = async (shop) => {
    const books = await Book.find({ shop: shop._id, archivedAt: null });
    return books.map((b) => ({ bookName: b.title, stockAmount: b.stockCount }));
};

// @route GET /api/reports/preview/:shopId  (Shop Owner, owner of the shop)
const previewReport = async (req, res) => {
    const shop = await loadOwnedShop(req.params.shopId, req.user);
    res.status(200).json({ breakdown: await stockBreakdown(shop), shopName: shop.name });
};

// @route POST /api/reports/:shopId  (Shop Owner, owner of the shop)
const createReport = async (req, res) => {
    const shop = await loadOwnedShop(req.params.shopId, req.user);
    const imageUrl = req.file ? await imageStorage.storeImage(req.file) : null;

    const report = await Report.create({
        shopId: shop._id,
        shopName: shop.name,
        title: req.body.title,
        notes: req.body.notes,
        imageUrl,
        breakdown: await stockBreakdown(shop)
    });
    res.status(201).json(report);
};

// @route GET /api/reports
// Never returns other people's data:
//   Shop Owner -> reports of their own shops
//   Customer   -> reports published by shops they follow (this is what the "Alerts" tab shows)
const getMyReports = async (req, res) => {
    const filter =
        req.user.userType === 'Shop Owner'
            ? { shopOwner: req.user._id }
            : { followers: req.user._id, archivedAt: null };

    const shops = await Shop.find(filter).select('_id');
    const reports = await Report.find({ shopId: { $in: shops.map((s) => s._id) } }).sort({ createdAt: -1 });
    res.status(200).json(reports);
};

module.exports = { previewReport, createReport, getMyReports };
