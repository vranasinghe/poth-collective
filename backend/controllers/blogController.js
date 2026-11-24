const Blog = require('../models/Blog');
const imageStorage = require('../utils/imageStorage');
const { forbidden, notFound, conflict } = require('../utils/AppError');

const MAX_COMMENTS_PER_BLOG = 500;

const displayName = (user) => user.firstName + (user.lastName ? ' ' + user.lastName : '');

const loadAuthoredBlog = async (id, user) => {
    const blog = await Blog.findById(id);
    if (!blog) throw notFound('Blog not found');
    // Only the author may change or remove a post (no role-based override)
    if (String(blog.authorId) !== String(user._id)) throw forbidden('Only the author can change this blog');
    return blog;
};

// @route POST /api/blogs  (signed in)
const createBlog = async (req, res) => {
    const coverImage = req.file ? await imageStorage.storeImage(req.file) : null;
    const blog = await Blog.create({
        title: req.body.title,
        content: req.body.content,
        penName: req.body.penName,
        coverImage,
        author: displayName(req.user),
        authorId: req.user._id
    });
    res.status(201).json(blog);
};

// @route GET /api/blogs  (public)
const getBlogs = async (req, res) => {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json(blogs);
};

// @route GET /api/blogs/:id  (public)
const getBlogById = async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    if (!blog) throw notFound('Blog not found');
    res.status(200).json(blog);
};

// @route PUT /api/blogs/:id  (author only; likes, comments, author and dates are not client-writable)
const updateBlog = async (req, res) => {
    const blog = await loadAuthoredBlog(req.params.id, req.user);
    const { title, content, penName } = req.body;
    if (title !== undefined) blog.title = title;
    if (content !== undefined) blog.content = content;
    if (penName !== undefined) blog.penName = penName;
    if (req.body.removeCoverImage === 'true') blog.coverImage = null;
    if (req.file) blog.coverImage = await imageStorage.storeImage(req.file);
    await blog.save();
    res.status(200).json(blog);
};

// @route DELETE /api/blogs/:id  (author only)
const deleteBlog = async (req, res) => {
    const blog = await loadAuthoredBlog(req.params.id, req.user);
    await blog.deleteOne();
    res.status(200).json({ message: 'Blog deleted successfully' });
};

// @route POST /api/blogs/:id/like
const toggleLike = async (req, res) => {
    if (!(await Blog.exists({ _id: req.params.id }))) throw notFound('Blog not found');

    const alreadyLiked = await Blog.exists({ _id: req.params.id, likes: req.user._id });
    const updated = await Blog.findOneAndUpdate(
        { _id: req.params.id },
        alreadyLiked ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } },
        { new: true }
    );
    res.status(200).json({ likes: updated.likes.length, liked: !alreadyLiked });
};

// @route POST /api/blogs/:id/comments
const addComment = async (req, res) => {
    const comment = { userId: req.user._id, userName: displayName(req.user), text: req.body.text };

    // Atomic push guarded by a size cap, so a post cannot grow without bound
    const updated = await Blog.findOneAndUpdate(
        { _id: req.params.id, [`comments.${MAX_COMMENTS_PER_BLOG - 1}`]: { $exists: false } },
        { $push: { comments: comment } },
        { new: true }
    );
    if (!updated) {
        if (!(await Blog.exists({ _id: req.params.id }))) throw notFound('Blog not found');
        throw conflict('This post has reached its comment limit');
    }
    res.status(201).json(updated.comments[updated.comments.length - 1]);
};

// @route GET /api/blogs/:id/comments  (public)
const getComments = async (req, res) => {
    const blog = await Blog.findById(req.params.id).select('comments');
    if (!blog) throw notFound('Blog not found');
    res.status(200).json(blog.comments);
};

module.exports = { createBlog, getBlogs, getBlogById, updateBlog, deleteBlog, toggleLike, addComment, getComments };
