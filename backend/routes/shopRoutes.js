const express = require('express');
const router = express.Router();
const { getShops, getShopById, createShop, getShopsByOwner, updateShop, deleteShop, toggleFollowShop } = require('../controllers/shopController');
const { protect, optionalAuth, isShopOwner } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/upload');
const { validate } = require('../middlewares/validate');
const { idParam, createShopBody, updateShopBody } = require('../validators/schemas');

router.get('/', optionalAuth, getShops);
router.post('/', protect, isShopOwner, upload.single('image'), validate(createShopBody), createShop);

router.get('/owner/me', protect, getShopsByOwner);

router.get('/:id', validate(idParam, 'params'), optionalAuth, getShopById);
router.put('/:id', protect, validate(idParam, 'params'), upload.single('image'), validate(updateShopBody), updateShop);
router.delete('/:id', protect, validate(idParam, 'params'), deleteShop);

router.post('/:id/follow', protect, validate(idParam, 'params'), toggleFollowShop);

module.exports = router;
