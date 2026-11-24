const Order = require('../models/orderModel');
const Book = require('../models/bookModel');
const Shop = require('../models/shopModel');
const imageStorage = require('../utils/imageStorage');
const { reserveAndCreateOrder, transitionOrder, canTransition } = require('../services/orderService');
const { badRequest, forbidden, notFound, conflict } = require('../utils/AppError');

const sameId = (a, b) => String(a) === String(b);

// Loads an order and works out which party the caller is. Anyone else gets 403.
// (404 is returned for unknown ids, 403 for orders the caller has no relationship to.)
const loadOrderForParty = async (orderId, user) => {
    const order = await Order.findById(orderId);
    if (!order) throw notFound('Order not found');
    const shop = await Shop.findById(order.shop).select('shopOwner');
    const isReader = sameId(order.reader, user._id);
    const isShop = Boolean(shop) && sameId(shop.shopOwner, user._id);
    if (!isReader && !isShop) throw forbidden('Not authorized');
    return { order, isReader, isShop };
};

// @desc    Place an order
// @route   POST /api/orders   (any signed-in user; multipart with paymentSlip)
// Reader, shop, price and status are decided here from trusted records. Any such values in the request
// were already stripped by validation.
const addOrder = async (req, res) => {
    const { book: bookId, shop: claimedShop, quantity, deliveryDetails } = req.body;

    if (!req.file) throw badRequest('Please upload a payment slip');

    const book = await Book.findOne({ _id: bookId, archivedAt: null }).populate('shop', 'shopOwner archivedAt');
    if (!book || !book.shop || book.shop.archivedAt) throw notFound('Book not found');

    // The selected shop must be the shop that actually sells this book
    if (claimedShop && !sameId(claimedShop, book.shop._id)) {
        throw badRequest('The selected book does not belong to the selected shop');
    }
    if (sameId(book.shop.shopOwner, req.user._id)) {
        throw forbidden('You cannot order from your own shop');
    }
    // Cheap early check so obviously impossible orders do not upload a slip. The authoritative check is the
    // atomic reservation below.
    if (book.stockCount < quantity) throw conflict('Not enough stock available');

    const slipUrl = await imageStorage.storeImage(req.file);

    const order = await reserveAndCreateOrder({
        readerId: req.user._id,
        bookId: book._id,
        quantity,
        delivery: deliveryDetails,
        slipUrl,
        quotedUnitPrice: req.body.quotedUnitPrice
    });
    res.status(201).json(order);
};

// @route   GET /api/orders/reader/:readerId   (the reader themself)
const getReaderOrders = async (req, res) => {
    if (!sameId(req.params.readerId, req.user._id)) throw forbidden('Not authorized');
    const orders = await Order.find({ reader: req.user._id, readerArchived: { $ne: true } })
        .sort({ createdAt: -1 })
        .populate('book', 'title author imageUrl price')
        .populate('shop', 'name location');
    res.status(200).json(orders);
};

// @route   GET /api/orders/shop/:shopId   (owner of that shop)
const getShopOrders = async (req, res) => {
    const shop = await Shop.findById(req.params.shopId).select('shopOwner');
    if (!shop) throw notFound('Shop not found');
    if (!sameId(shop.shopOwner, req.user._id)) throw forbidden('Not authorized');

    const orders = await Order.find({ shop: shop._id, shopArchived: { $ne: true } })
        .sort({ createdAt: -1 })
        .populate('book', 'title author imageUrl price')
        .populate('reader', 'firstName lastName email phoneNumber');
    res.status(200).json(orders);
};

// @route   PUT /api/orders/:id/status   (owner of the order's shop only)
const updateOrderStatus = async (req, res) => {
    const { order, isShop } = await loadOrderForParty(req.params.id, req.user);
    if (!isShop) throw forbidden('Only the shop owner can change the order status');

    const next = req.body.status;
    if (!canTransition(order.status, next)) {
        throw conflict(`An order that is ${order.status} cannot be changed to ${next}`);
    }
    const updated = await transitionOrder(order, next);
    res.status(200).json(updated);
};

// @route   PUT /api/orders/:id/delivery   (the reader, only while Pending)
const updateOrderDelivery = async (req, res) => {
    const { order, isReader } = await loadOrderForParty(req.params.id, req.user);
    if (!isReader) throw forbidden('Only the customer can change delivery details');

    // Compare-and-set on status so a shop confirming at the same moment cannot be raced
    const updated = await Order.findOneAndUpdate(
        { _id: order._id, status: 'Pending' },
        { $set: { deliveryDetails: req.body.deliveryDetails } },
        { new: true, runValidators: true }
    );
    if (!updated) throw conflict('Cannot update delivery details after confirmation');
    res.status(200).json(updated);
};

// @route   DELETE /api/orders/:id   (reader or shop owner)
// Orders are never destroyed. The effect depends on the status:
//   Pending    -> cancelled (reader or owner), stock returned exactly once
//   Confirmed  -> cancelled (owner only), stock returned exactly once
//   Cancelled / Delivered -> hidden from the caller's own list (order record is kept)
//   Shipped    -> refused (409), the goods are in transit
const deleteOrder = async (req, res) => {
    const { order, isShop } = await loadOrderForParty(req.params.id, req.user);

    if (order.status === 'Pending' || order.status === 'Confirmed') {
        if (order.status === 'Confirmed' && !isShop) {
            throw conflict('Only the shop can cancel an order after it has been confirmed');
        }
        const updated = await transitionOrder(order, 'Cancelled');
        return res.status(200).json({ id: req.params.id, status: updated.status, message: 'Order cancelled' });
    }

    if (order.status === 'Shipped') {
        throw conflict('Orders that are in transit cannot be cancelled or removed');
    }

    // Cancelled or Delivered: hide for the caller only. (A caller cannot be both parties: owners cannot
    // order from their own shop.)
    await Order.updateOne(
        { _id: order._id },
        { $set: isShop ? { shopArchived: true } : { readerArchived: true } }
    );
    return res.status(200).json({ id: req.params.id, status: order.status, message: 'Order removed from your list' });
};

module.exports = { addOrder, getReaderOrders, getShopOrders, updateOrderStatus, updateOrderDelivery, deleteOrder };
