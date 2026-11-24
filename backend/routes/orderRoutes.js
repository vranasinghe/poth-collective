const express = require('express');
const router = express.Router();
const {
    addOrder,
    getReaderOrders,
    getShopOrders,
    updateOrderStatus,
    updateOrderDelivery,
    deleteOrder
} = require('../controllers/orderController');
const { upload } = require('../middlewares/upload');
const { protect } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const {
    idParam, shopIdParam, readerIdParam,
    createOrderBody, orderStatusBody, orderDeliveryBody
} = require('../validators/schemas');

// Every order endpoint requires a valid token; authentication runs before any upload or body parsing.
router.use(protect);

// A live, non-reserving quote. Creation still computes prices and reserves stock atomically.
router.post('/quote', async (req, res) => {
    const { badRequest, notFound, conflict, forbidden } = require('../utils/AppError');
    const { book: id, quantity } = req.body;
    if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw badRequest('Choose a valid book and a quantity from 1 to 100');
    const book = await require('../models/bookModel').findOne({ _id: id, archivedAt: null }).populate('shop', 'name location shopOwner archivedAt contactNumber');
    if (!book || !book.shop || book.shop.archivedAt) throw notFound('Book not found');
    if (String(book.shop.shopOwner) === String(req.user._id)) throw forbidden('You cannot order from your own shop');
    if (book.stockCount < quantity) throw conflict('Not enough stock available');
    res.json({ book: { _id: book.id, title: book.title, author: book.author, imageUrl: book.imageUrl }, shop: { _id: book.shop.id, name: book.shop.name, location: book.shop.location, contactNumber: book.shop.contactNumber }, quantity, unitPrice: book.price, totalPrice: Math.round(book.price * quantity * 100) / 100, stockCount: book.stockCount, currency: 'LKR', paymentStatus: 'Awaiting shop verification' });
});

router.post('/', upload.single('paymentSlip'), validate(createOrderBody), addOrder);

router.get('/reader/:readerId', validate(readerIdParam, 'params'), getReaderOrders);
router.get('/shop/:shopId', validate(shopIdParam, 'params'), getShopOrders);

router.put('/:id/status', validate(idParam, 'params'), validate(orderStatusBody), updateOrderStatus);
router.put('/:id/delivery', validate(idParam, 'params'), validate(orderDeliveryBody), updateOrderDelivery);
router.delete('/:id', validate(idParam, 'params'), deleteOrder);

module.exports = router;
