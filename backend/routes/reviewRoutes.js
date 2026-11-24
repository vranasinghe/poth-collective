const express = require('express');
const router = express.Router();
const { getReviews, addReview, getMyReviews, updateReview, deleteReview } = require('../controllers/reviewController');
const { protect } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/upload');
const { validate } = require('../middlewares/validate');
const { idParam, targetIdParam, createReviewBody, updateReviewBody } = require('../validators/schemas');

router.get('/me', protect, getMyReviews);
router.get('/:targetId', validate(targetIdParam, 'params'), getReviews);

router.post('/', protect, upload.single('image'), validate(createReviewBody), addReview);
router.put('/:id', protect, validate(idParam, 'params'), validate(updateReviewBody), updateReview);
router.delete('/:id', protect, validate(idParam, 'params'), deleteReview);

module.exports = router;
