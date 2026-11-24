const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/upload');
const { validate } = require('../middlewares/validate');
const { idParam, createBlogBody, updateBlogBody, commentBody } = require('../validators/schemas');
const {
    createBlog, getBlogs, getBlogById, updateBlog, deleteBlog, toggleLike, addComment, getComments
} = require('../controllers/blogController');

router.get('/', getBlogs);
router.post('/', protect, upload.single('coverImage'), validate(createBlogBody), createBlog);

router.get('/:id', validate(idParam, 'params'), getBlogById);
router.put('/:id', protect, validate(idParam, 'params'), upload.single('coverImage'), validate(updateBlogBody), updateBlog);
router.delete('/:id', protect, validate(idParam, 'params'), deleteBlog);

// Likes and comments: any signed-in user. Reading comments is public.
router.post('/:id/like', protect, validate(idParam, 'params'), toggleLike);
router.get('/:id/comments', validate(idParam, 'params'), getComments);
router.post('/:id/comments', protect, validate(idParam, 'params'), validate(commentBody), addComment);

module.exports = router;
