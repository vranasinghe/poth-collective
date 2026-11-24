const express = require('express');
const router = express.Router();
const { getBooks, getBookById, getBooksByShop, addBook, updateBook, deleteBook, getBooksByOwner } = require('../controllers/bookController');
const { upload } = require('../middlewares/upload');
const { protect, isShopOwner } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { idParam, shopIdParam, createBookBody, updateBookBody } = require('../validators/schemas');

router.get('/', getBooks);
router.post('/', protect, isShopOwner, upload.single('image'), validate(createBookBody), addBook);

router.get('/owner/me', protect, getBooksByOwner);
router.get('/shop/:shopId', validate(shopIdParam, 'params'), getBooksByShop);

router.get('/:id', validate(idParam, 'params'), getBookById);
router.put('/:id', protect, validate(idParam, 'params'), upload.single('image'), validate(updateBookBody), updateBook);
router.delete('/:id', protect, validate(idParam, 'params'), deleteBook);

module.exports = router;
