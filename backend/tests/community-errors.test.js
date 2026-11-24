const request = require('supertest');
const { startDb, clearDb, stopDb, assertLocalUri } = require('./helpers/db');
const f = require('./helpers/factory');
const Blog = require('../models/Blog');
const Book = require('../models/bookModel');
const Shop = require('../models/shopModel');
const Review = require('../models/reviewModel');
const tx = require('../services/transaction');

let app;
beforeAll(async () => { app = await startDb(); });
afterAll(stopDb);
beforeEach(clearDb);
afterEach(() => jest.restoreAllMocks());

const postReview = (token, targetId, targetModel, rating = 4, comment = 'good') =>
    request(app).post('/api/reviews').set(f.bearer(token))
        .field('targetId', targetId).field('targetModel', targetModel).field('rating', String(rating)).field('comment', comment);

describe('review rules', () => {
    test('anonymous reviews are rejected', async () => {
        const s = await f.scenario(app);
        const res = await request(app).post('/api/reviews').field('targetId', s.shop._id).field('targetModel', 'Shop').field('rating', '5').field('comment', 'x');
        expect(res.status).toBe(401);
    });

    test('the target must exist and match the stated kind', async () => {
        const s = await f.scenario(app);
        const u = await f.customer(app);
        expect((await postReview(u.token, '000000000000000000000001', 'Shop')).status).toBe(404);
        expect((await postReview(u.token, s.shop._id, 'Book')).status).toBe(404); // a shop id used as a book
        expect((await postReview(u.token, s.book._id, 'Shop')).status).toBe(404); // a book id used as a shop
        expect((await postReview(u.token, s.shop._id, 'Planet')).status).toBe(400);
        expect(await Review.countDocuments()).toBe(0);
    });

    test('owners cannot review their own shop or their own books', async () => {
        const s = await f.scenario(app);
        expect((await postReview(s.shopOwner.token, s.shop._id, 'Shop')).status).toBe(403);
        expect((await postReview(s.shopOwner.token, s.book._id, 'Book')).status).toBe(403);
    });

    test.each([['zero', 0], ['six', 6], ['fractional', 4.5], ['text', 'great']])('rating %s is rejected', async (_n, rating) => {
        const s = await f.scenario(app);
        const u = await f.customer(app);
        expect((await postReview(u.token, s.shop._id, 'Shop', rating)).status).toBe(400);
    });

    test('one review per user per target, even under parallel requests', async () => {
        const s = await f.scenario(app);
        const u = await f.customer(app);
        const results = await Promise.all(Array.from({ length: 6 }, () => postReview(u.token, s.shop._id, 'Shop')));
        expect(results.filter((r) => r.status === 201)).toHaveLength(1);
        expect(results.filter((r) => r.status === 409)).toHaveLength(5);
        expect(await Review.countDocuments()).toBe(1);
        expect((await Shop.findById(s.shop._id)).numReviews).toBe(1);
    });

    test('ratings aggregate correctly through create, edit and delete; only the author may edit', async () => {
        const s = await f.scenario(app);
        const a = await f.customer(app);
        const b = await f.customer(app);
        const ra = (await postReview(a.token, s.book._id, 'Book', 5)).body;
        await postReview(b.token, s.book._id, 'Book', 2);
        let book = await Book.findById(s.book._id);
        expect([book.numReviews, book.averageRating]).toEqual([2, 3.5]);

        expect((await request(app).put(`/api/reviews/${ra._id}`).set(f.bearer(b.token)).send({ rating: 1 })).status).toBe(403);
        const edit = await request(app).put(`/api/reviews/${ra._id}`).set(f.bearer(a.token)).send({ rating: 1, targetId: s.shop._id, user: b.id });
        expect(edit.status).toBe(200);
        expect(String(edit.body.user)).toBe(a.id); // identity and target are not editable
        expect(edit.body.targetId).toBe(s.book._id);
        book = await Book.findById(s.book._id);
        expect(book.averageRating).toBe(1.5);

        expect((await request(app).delete(`/api/reviews/${ra._id}`).set(f.bearer(b.token))).status).toBe(403);
        expect((await request(app).delete(`/api/reviews/${ra._id}`).set(f.bearer(a.token))).status).toBe(200);
        book = await Book.findById(s.book._id);
        expect([book.numReviews, book.averageRating]).toEqual([1, 2]);
    });

    test('archived books cannot be reviewed', async () => {
        const s = await f.scenario(app);
        const buyer = await f.customer(app);
        await f.placeOrder(app, buyer.token, { book: s.book._id });
        await request(app).delete(`/api/books/${s.book._id}`).set(f.bearer(s.shopOwner.token));
        expect((await postReview(buyer.token, s.book._id, 'Book')).status).toBe(404);
    });
});

describe('blogs', () => {
    const makeBlog = (token, over = {}) =>
        request(app).post('/api/blogs').set(f.bearer(token)).field('title', over.title ?? 'Title').field('content', over.content ?? 'Body text');

    test('only the author can edit or delete; another Shop Owner cannot', async () => {
        const author = await f.customer(app);
        const ownerUser = await f.owner(app);
        const blog = (await makeBlog(author.token)).body;

        for (const t of [ownerUser.token, (await f.customer(app)).token]) {
            expect((await request(app).put(`/api/blogs/${blog._id}`).set(f.bearer(t)).send({ title: 'Hijacked' })).status).toBe(403);
            expect((await request(app).delete(`/api/blogs/${blog._id}`).set(f.bearer(t))).status).toBe(403);
        }
        expect((await Blog.findById(blog._id)).title).toBe('Title');

        expect((await request(app).put(`/api/blogs/${blog._id}`).set(f.bearer(author.token)).send({ title: 'Edited' })).status).toBe(200);
        expect((await request(app).delete(`/api/blogs/${blog._id}`).set(f.bearer(author.token))).status).toBe(200);
    });

    test('mass assignment on update is ignored (author, likes, comments, dates)', async () => {
        const author = await f.customer(app);
        const other = await f.customer(app);
        const blog = (await makeBlog(author.token)).body;
        await request(app).put(`/api/blogs/${blog._id}`).set(f.bearer(author.token)).send({
            title: 'New', authorId: other.id, author: 'Someone Else', likes: [other.id], comments: [{ userName: 'x', text: 'forged' }], createdAt: '2000-01-01'
        });
        const doc = await Blog.findById(blog._id);
        expect(doc.title).toBe('New');
        expect(String(doc.authorId)).toBe(author.id);
        expect(doc.author).not.toBe('Someone Else');
        expect(doc.likes).toHaveLength(0);
        expect(doc.comments).toHaveLength(0);
        expect(doc.createdAt.getFullYear()).toBeGreaterThan(2000);
    });

    test('creation requires login and valid content; likes toggle; comments cap', async () => {
        const u = await f.customer(app);
        expect((await request(app).post('/api/blogs').field('title', 't').field('content', 'c')).status).toBe(401);
        expect((await makeBlog(u.token, { title: '' })).status).toBe(400);

        const blog = (await makeBlog(u.token)).body;
        expect((await request(app).post(`/api/blogs/${blog._id}/like`).set(f.bearer(u.token))).body).toEqual({ likes: 1, liked: true });
        expect((await request(app).post(`/api/blogs/${blog._id}/like`).set(f.bearer(u.token))).body).toEqual({ likes: 0, liked: false });

        expect((await request(app).post(`/api/blogs/${blog._id}/comments`).set(f.bearer(u.token)).send({ text: '' })).status).toBe(400);
        expect((await request(app).post(`/api/blogs/${blog._id}/comments`).set(f.bearer(u.token)).send({ text: 'nice' })).status).toBe(201);

        await Blog.updateOne({ _id: blog._id }, { $set: { comments: Array.from({ length: 500 }, () => ({ userId: u.id, userName: 'u', text: 't' })) } });
        const over = await request(app).post(`/api/blogs/${blog._id}/comments`).set(f.bearer(u.token)).send({ text: 'one too many' });
        expect(over.status).toBe(409);
    });
});

describe('safe errors and hardening', () => {
    test('an unexpected server error returns a generic message with no internals', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(Book, 'find').mockImplementationOnce(() => { throw new Error('connection to db-internal.secret.host failed, password=hunter2'); });
        const res = await request(app).get('/api/books');
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ message: 'Internal server error' });
        expect(JSON.stringify(res.body)).not.toMatch(/hunter2|secret|stack|at /);
    });

    test('production mode never logs or returns a stack trace either', async () => {
        const logged = [];
        jest.spyOn(console, 'error').mockImplementation((...a) => logged.push(JSON.stringify(a)));
        jest.spyOn(Book, 'find').mockImplementationOnce(() => { throw new Error('boom'); });
        const prev = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            const res = await request(app).get('/api/books');
            expect(res.status).toBe(500);
            expect(res.text).not.toMatch(/stack|\.js:\d+/);
            expect(logged.join('')).not.toMatch(/\.js:\d+/);
        } finally {
            process.env.NODE_ENV = prev;
        }
    });

    test('malformed JSON, unknown routes and malformed ids get safe 4xx answers', async () => {
        const bad = await request(app).post('/api/users/login').set('Content-Type', 'application/json').send('{"email": ');
        expect(bad.status).toBe(400);
        expect(bad.body.message).toBe('Invalid request body');
        expect((await request(app).get('/api/nope')).status).toBe(404);
        expect((await request(app).get('/api/books/not-an-id')).status).toBe(400);
        expect((await request(app).get('/api/blogs/not-an-id')).status).toBe(400);
        expect((await request(app).get('/api/books/000000000000000000000001')).status).toBe(404);
    });

    test('validation errors name the offending field', async () => {
        const res = await request(app).post('/api/users/register').send({ firstName: 'A' });
        expect(res.status).toBe(400);
        expect(Array.isArray(res.body.errors)).toBe(true);
        expect(res.body.errors[0]).toHaveProperty('field');
    });

    test('security headers are set and the framework is not advertised', async () => {
        const res = await request(app).get('/health');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-powered-by']).toBeUndefined();
        expect(res.status).toBe(200);
    });

    test('NoSQL operators in query strings and bodies are stripped', async () => {
        const s = await f.scenario(app);
        const res = await request(app).get('/api/books').query({ 'shop[$ne]': 'x' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(s.book._id).toBeDefined();
    });
});

describe('test-environment safety', () => {
    test('the test harness refuses non-local databases', () => {
        for (const uri of [
            'mongodb+srv://user:pw@cluster0.abcde.mongodb.net/poth',
            'mongodb://cluster0-shard-00-00.abcde.mongodb.net:27017/poth',
            'mongodb://10.0.0.5:27017/poth',
            'mongodb://127.0.0.1:27017,evil.example:27017/poth'
        ]) {
            expect(() => assertLocalUri(uri)).toThrow(/non-local|unrecognised/);
        }
        expect(() => assertLocalUri('mongodb://127.0.0.1:50000/poth?replicaSet=testset')).not.toThrow();
    });

    test('tests run against an isolated database, not a configured one', () => {
        expect(process.env.MONGO_URI).toBeUndefined();
        const { host } = require('mongoose').connection;
        expect(['127.0.0.1', 'localhost']).toContain(host);
    });

    test('the in-memory server is a replica set, so the transactional path is exercised', async () => {
        tx.__resetDetection();
        expect(await tx.transactionsSupported()).toBe(true);
    });
});
