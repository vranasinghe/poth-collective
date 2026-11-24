const Shop = require('../models/shopModel');
const imageStorage = require('../utils/imageStorage');
const { removeShop } = require('../services/deletionService');
const { forbidden, notFound, badRequest } = require('../utils/AppError');

const ACTIVE = { archivedAt: null };

// Public shop representation.
//  - The owner's email is never exposed (only name, for display).
//  - `followers` no longer lists other users. It contains only the viewer's own id when the viewer follows
//    the shop, which keeps the existing client check `followers.includes(userId)` working.
const toPublicShop = (shop, viewerId) => {
    const obj = shop.toObject();
    const followerIds = (obj.followers || []).map(String);
    obj.followersCount = followerIds.length;
    obj.followers = viewerId && followerIds.includes(String(viewerId)) ? [String(viewerId)] : [];
    return obj;
};

const loadOwnedShop = async (shopId, user) => {
    const shop = await Shop.findOne({ _id: shopId, ...ACTIVE });
    if (!shop) throw notFound('Shop not found');
    if (String(shop.shopOwner) !== String(user._id)) throw forbidden('Not authorized to modify this shop');
    return shop;
};

// @route GET /api/shops  (public)
const getShops = async (req, res) => {
    if (req.query.page !== undefined) {
        const { filter, sort, page, limit } = require('../utils/catalogueQuery').catalogueQuery(req.query, 'shop');
        if (req.query.following === 'true') {
            if (!req.user) throw require('../utils/AppError').unauthorized();
            filter.followers = req.user._id;
        }
        const [shops, total, locations] = await Promise.all([
            Shop.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate('shopOwner', 'firstName lastName'),
            Shop.countDocuments(filter), Shop.distinct('location', ACTIVE)
        ]);
        return res.json({ items: shops.map((s) => toPublicShop(s, req.user?._id)), total, page, pages: Math.ceil(total / limit), locations: locations.sort() });
    }
    const shops = await Shop.find(ACTIVE).populate('shopOwner', 'firstName lastName');
    res.status(200).json(shops.map((s) => toPublicShop(s, req.user?._id)));
};

// @route GET /api/shops/:id  (public)
const getShopById = async (req, res) => {
    const shop = await Shop.findOne({ _id: req.params.id, ...ACTIVE }).populate('shopOwner', 'firstName lastName');
    if (!shop) throw notFound('Shop not found');
    res.status(200).json(toPublicShop(shop, req.user?._id));
};

// @route POST /api/shops  (Shop Owner)
const createShop = async (req, res) => {
    const imageUrl = req.file ? await imageStorage.storeImage(req.file) : undefined;
    const shop = await Shop.create({ ...req.body, shopOwner: req.user._id, ...(imageUrl ? { imageUrl } : {}) });
    res.status(201).json(shop);
};

// @route GET /api/shops/owner/me
const getShopsByOwner = async (req, res) => {
    const shops = await Shop.find({ shopOwner: req.user._id, ...ACTIVE });
    res.status(200).json(shops);
};

// @route PUT /api/shops/:id  (owner of the shop)
const updateShop = async (req, res) => {
    const shop = await loadOwnedShop(req.params.id, req.user);

    // location is deliberately immutable; owner, ratings and followers are never client-writable
    const { name, description, contactNumber } = req.body;
    if (name) shop.name = name;
    if (description) shop.description = description;
    if (contactNumber) shop.contactNumber = contactNumber;
    if (req.file) shop.imageUrl = await imageStorage.storeImage(req.file);

    await shop.save();
    res.status(200).json(shop);
};

// @route DELETE /api/shops/:id  (owner of the shop)
// Archives or deletes according to the policy in services/deletionService.js; 409 while orders are open.
const deleteShop = async (req, res) => {
    const shop = await loadOwnedShop(req.params.id, req.user);
    const { archived } = await removeShop(shop);
    res.status(200).json({
        message: archived
            ? 'Shop removed. Its order history has been retained.'
            : 'Shop and all associated content removed successfully'
    });
};

// @route POST /api/shops/:id/follow
const toggleFollowShop = async (req, res) => {
    const shop = await Shop.findOne({ _id: req.params.id, ...ACTIVE }).select('shopOwner');
    if (!shop) throw notFound('Shop not found');
    if (String(shop.shopOwner) === String(req.user._id)) throw badRequest('You cannot follow your own shop');

    // Atomic add/remove: concurrent taps cannot duplicate or lose a follower
    const wasFollowing = await Shop.exists({ _id: shop._id, followers: req.user._id });
    const updated = await Shop.findOneAndUpdate(
        { _id: shop._id },
        wasFollowing ? { $pull: { followers: req.user._id } } : { $addToSet: { followers: req.user._id } },
        { new: true }
    );
    res.status(200).json({ followersCount: updated.followers.length, followed: !wasFollowing });
};

module.exports = { getShops, getShopById, createShop, getShopsByOwner, updateShop, deleteShop, toggleFollowShop };
