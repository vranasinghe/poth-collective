const request = require('supertest');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const f = require('./helpers/factory');
const User = require('../models/userModel');
const Book = require('../models/bookModel');
const Shop = require('../models/shopModel');
const Order = require('../models/orderModel');
const Review = require('../models/reviewModel');
const Blog = require('../models/Blog');

let app;
beforeAll(async () => { app = await startDb(); });
afterAll(stopDb);
beforeEach(clearDb);

const del = (token) => request(app).delete('/api/users/profile').set(f.bearer(token));
const review = (token, targetId, targetModel, rating) =>
    request(app).post('/api/reviews').set(f.bearer(token))
        .field('targetId', targetId).field('targetModel', targetModel).field('rating', String(rating)).field('comment', 'c');

describe('user deletion does not break protected authentication', () => {
    test('the deleted user’s token stops working with a clean 401 everywhere, and other users are unaffected', async () => {
        const s = await f.scenario(app);
        const a = await f.customer(app);
        const b = await f.customer(app);
        await f.placeOrder(app, b.token, { book: s.book._id });

        expect((await del(a.token)).status).toBe(200);

        // every kind of protected endpoint answers 401 (never 500) for the deleted account
        const calls = [
            (t) => request(app).get(`/api/orders/reader/${a.id}`).set(f.bearer(t)),
            (t) => request(app).put('/api/users/profile').set(f.bearer(t)).send({ firstName: 'x' }),
            (t) => request(app).delete('/api/users/profile').set(f.bearer(t)),
            (t) => request(app).get('/api/reviews/me').set(f.bearer(t)),
            (t) => request(app).get('/api/reports').set(f.bearer(t)),
            (t) => request(app).get('/api/shops/owner/me').set(f.bearer(t)),
            (t) => request(app).post(`/api/shops/${s.shop._id}/follow`).set(f.bearer(t)),
            (t) => f.placeOrder(app, t, { book: s.book._id })
        ];
        for (const call of calls) {
            const res = await call(a.token);
            expect(res.status).toBe(401);
        }

        // cannot sign in again
        const login = await request(app).post('/api/users/login').send({ email: a.email, password: a.password });
        expect(login.status).toBe(401);

        // an unrelated user is completely unaffected
        const mine = await request(app).get(`/api/orders/reader/${b.id}`).set(f.bearer(b.token));
        expect(mine.status).toBe(200);
        expect(mine.body).toHaveLength(1);
        const buy = await f.placeOrder(app, b.token, { book: s.book._id });
        expect(buy.status).toBe(201);
    });

    test('the account becomes an anonymised tombstone and the email can be reused', async () => {
        const a = await f.customer(app);
        await del(a.token);
        const doc = await User.findById(a.id);
        expect(doc.deletedAt).not.toBeNull();
        expect(doc.email).toBe(`deleted-${a.id}@deleted.invalid`);
        expect(doc.firstName).toBe('Deleted');
        expect(doc.password).not.toMatch(new RegExp(a.password));

        const again = await f.registerUser(app, { email: a.email });
        expect(again.id).not.toBe(a.id);
    });

    test('deleting twice with the same token is a clean 401, not an error', async () => {
        const a = await f.customer(app);
        expect((await del(a.token)).status).toBe(200);
        expect((await del(a.token)).status).toBe(401);
    });
});

describe('customer deletion and orders', () => {
    test('unfinished orders are cancelled with stock returned; finished order history is kept', async () => {
        const s = await f.scenario(app, { stockCount: 20 });
        const buyer = await f.customer(app);
        const pending = (await f.placeOrder(app, buyer.token, { book: s.book._id, quantity: 3 })).body;
        const confirmed = (await f.placeOrder(app, buyer.token, { book: s.book._id, quantity: 2 })).body;
        const delivered = (await f.placeOrder(app, buyer.token, { book: s.book._id, quantity: 1 })).body;
        await f.setStatus(app, s.shopOwner.token, confirmed._id, 'Confirmed');
        for (const st of ['Confirmed', 'Shipped', 'Delivered']) await f.setStatus(app, s.shopOwner.token, delivered._id, st);
        expect((await Book.findById(s.book._id)).stockCount).toBe(14);

        expect((await del(buyer.token)).status).toBe(200);

        expect((await Order.findById(pending._id)).status).toBe('Cancelled');
        expect((await Order.findById(confirmed._id)).status).toBe('Cancelled');
        expect((await Order.findById(delivered._id)).status).toBe('Delivered');
        expect((await Book.findById(s.book._id)).stockCount).toBe(19); // 3 + 2 returned, delivered 1 stays consumed
        expect(await Order.countDocuments()).toBe(3); // nothing destroyed

        // the shop still sees its history, with an anonymised customer
        const shopOrders = await request(app).get(`/api/orders/shop/${s.shop._id}`).set(f.bearer(s.shopOwner.token));
        expect(shopOrders.status).toBe(200);
        expect(shopOrders.body).toHaveLength(3);
        expect(shopOrders.body[0].reader.firstName).toBe('Deleted');
    });

    test('refused while an order is in transit; nothing changes and the account still works', async () => {
        const s = await f.scenario(app, { stockCount: 10 });
        const buyer = await f.customer(app);
        const other = (await f.placeOrder(app, buyer.token, { book: s.book._id, quantity: 1 })).body;
        const shipped = (await f.placeOrder(app, buyer.token, { book: s.book._id, quantity: 2 })).body;
        for (const st of ['Confirmed', 'Shipped']) await f.setStatus(app, s.shopOwner.token, shipped._id, st);

        const res = await del(buyer.token);
        expect(res.status).toBe(409);
        expect((await User.findById(buyer.id)).deletedAt).toBeNull();
        expect((await Order.findById(other._id)).status).toBe('Pending'); // untouched: preflight runs first
        expect((await request(app).get(`/api/orders/reader/${buyer.id}`).set(f.bearer(buyer.token))).status).toBe(200);
    });

    test('reviews are removed and ratings recomputed; follows and community content are cleaned up', async () => {
        const s = await f.scenario(app);
        const a = await f.customer(app);
        const b = await f.customer(app);
        await review(a.token, s.shop._id, 'Shop', 5);
        await review(b.token, s.shop._id, 'Shop', 1);
        await review(a.token, s.book._id, 'Book', 4);
        await request(app).post(`/api/shops/${s.shop._id}/follow`).set(f.bearer(a.token));
        const blog = await request(app).post('/api/blogs').set(f.bearer(a.token)).field('title', 'Mine').field('content', 'text');
        const otherBlog = await request(app).post('/api/blogs').set(f.bearer(b.token)).field('title', 'Theirs').field('content', 'text');
        await request(app).post(`/api/blogs/${otherBlog.body._id}/like`).set(f.bearer(a.token));
        await request(app).post(`/api/blogs/${otherBlog.body._id}/comments`).set(f.bearer(a.token)).send({ text: 'hi' });

        expect((await Shop.findById(s.shop._id)).averageRating).toBe(3);
        expect((await del(a.token)).status).toBe(200);

        const shop = await Shop.findById(s.shop._id);
        expect(shop.numReviews).toBe(1);
        expect(shop.averageRating).toBe(1);
        expect(shop.followers).toHaveLength(0);
        const book = await Book.findById(s.book._id);
        expect(book.numReviews).toBe(0);
        expect(book.averageRating).toBe(0);
        expect(await Review.countDocuments({ user: a.id })).toBe(0);
        expect(await Blog.findById(blog.body._id)).toBeNull();
        const theirs = await Blog.findById(otherBlog.body._id);
        expect(theirs.likes).toHaveLength(0);
        expect(theirs.comments).toHaveLength(0);
    });
});

describe('shop owner deletion', () => {
    test('refused while the shop has open orders', async () => {
        const s = await f.scenario(app);
        const buyer = await f.customer(app);
        await f.placeOrder(app, buyer.token, { book: s.book._id });
        const res = await del(s.shopOwner.token);
        expect(res.status).toBe(409);
        expect((await User.findById(s.shopOwner.id)).deletedAt).toBeNull();
        expect((await Shop.findById(s.shop._id)).archivedAt).toBeNull();
    });

    test('with order history the shop and books are archived, not destroyed, and the buyer’s history still reads', async () => {
        const s = await f.scenario(app);
        const buyer = await f.customer(app);
        const order = (await f.placeOrder(app, buyer.token, { book: s.book._id })).body;
        await f.setStatus(app, s.shopOwner.token, order._id, 'Cancelled');

        expect((await del(s.shopOwner.token)).status).toBe(200);
        expect((await Shop.findById(s.shop._id)).archivedAt).not.toBeNull();
        expect((await Book.findById(s.book._id)).archivedAt).not.toBeNull();
        expect((await request(app).get('/api/shops')).body).toHaveLength(0);

        const history = await request(app).get(`/api/orders/reader/${buyer.id}`).set(f.bearer(buyer.token));
        expect(history.status).toBe(200);
        expect(history.body).toHaveLength(1);
        expect(history.body[0].shop.name).toBeDefined();

        // the owner's token is dead
        expect((await request(app).get('/api/shops/owner/me').set(f.bearer(s.shopOwner.token))).status).toBe(401);
    });

    test('an owner with a never-ordered shop leaves nothing behind', async () => {
        const s = await f.scenario(app);
        const fan = await f.customer(app);
        await request(app).post(`/api/shops/${s.shop._id}/follow`).set(f.bearer(fan.token));
        expect((await del(s.shopOwner.token)).status).toBe(200);
        expect(await Shop.countDocuments()).toBe(0);
        expect(await Book.countDocuments()).toBe(0);
    });
});

describe('no orphaned references after deletions', () => {
    test('every order still points at an existing user, shop and book after a mix of deletions', async () => {
        const s1 = await f.scenario(app);
        const s2 = await f.scenario(app);
        const b1 = await f.customer(app);
        const b2 = await f.customer(app);
        const o1 = (await f.placeOrder(app, b1.token, { book: s1.book._id })).body;
        await f.placeOrder(app, b2.token, { book: s2.book._id });
        await f.setStatus(app, s1.shopOwner.token, o1._id, 'Cancelled');

        await request(app).delete(`/api/books/${s1.book._id}`).set(f.bearer(s1.shopOwner.token));
        await request(app).delete(`/api/shops/${s1.shop._id}`).set(f.bearer(s1.shopOwner.token));
        await del(b1.token);

        for (const order of await Order.find()) {
            expect(await User.exists({ _id: order.reader })).toBeTruthy();
            expect(await Shop.exists({ _id: order.shop })).toBeTruthy();
            expect(await Book.exists({ _id: order.book })).toBeTruthy();
        }
    });
});
