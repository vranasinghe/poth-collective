const express = require('express');
const router = express.Router();
const { previewReport, createReport, getMyReports } = require('../controllers/reportController');
const { protect, isShopOwner } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/upload');
const { validate } = require('../middlewares/validate');
const { shopIdParam, createReportBody } = require('../validators/schemas');

router.get('/preview/:shopId', protect, isShopOwner, validate(shopIdParam, 'params'), previewReport);
router.post('/:shopId', protect, isShopOwner, validate(shopIdParam, 'params'), upload.single('image'), validate(createReportBody), createReport);
router.get('/', protect, getMyReports);

module.exports = router;
