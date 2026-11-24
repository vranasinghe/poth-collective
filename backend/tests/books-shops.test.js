const request = require('supertest');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const f = require('./helpers/factory');
const Book = require('../models/bookModel');
const Shop = require('../models/shopModel');
const Review = require('../models/reviewModel');
const tx = require('../services/transaction');

let app;
beforeAll(async () => { app = await startDb(); });
afterAll(stopDb);
beforeEach(async () => { await clearDb(); tx.__resetDetection(); });

const bookForm = (token, shopId, extra = {}) => {
    let req = request(app).post('/api/books').set(f.bearer(token))
        .field('title', 'T').field('author', 'A').field('description', 'D')
        .field('price', '100').field('category', 'C').field('stockCount', '5');
    if (shopId !== undefined) req = req.field('shop', shopId);
    for (const [k, v] of Object.entries(extra)) req = req.field(k, String(v));
    return req;
};

describe('book creation authorization', () => {
    test('anonymous callers are rejected', async () => {
        const { shop } = await f.scenario(app);
        const res = await request(app).post('/api/books').field('title', 'x').field('shop', shop._id);
        expect(res.status).toBe(401);
    });

    test('foreign-shop book creation is rejected and nothing is written', async () => {
        const a = await f.scenario(app);
        const b = await f.owner(app);
        const before = await Book.countDocuments();
        const res = await bookForm(b.token, a.shop._id);
        expect(res.status).toBe(403);
        expect(await Book.countDocuments()).toBe(before);
    });

    test('a customer cannot create books at all', async () => {
        const { shop } = await f.scenario(app);
        const c = await f.customer(app);
        expect((await bookForm(c.token, shop._id)).status).toBe(403);
    });

    test('a customer cannot create shops', async () => {
        const c = await f.customer(app);
        const res = await request(app).post('/api/shops').set(f.bearer(c.token))
            .field('name', 'Sneaky Shop').field('description', 'd').field('location', 'l').field('contactNumber', '0112223334');
        expect(res.status).toBe(403);
    });

    test('unknown shop is 404, malformed shop id is 400', async () => {
        const o = await f.owner(app);
        expect((await bookForm(o.token, '000000000000000000000001')).status).toBe(404);
        expect((await bookForm(o.token, 'nope')).status).toBe(400);
        expect((await bookForm(o.token, undefined)).status).toBe(400);
    });

    test('the owner can create a book in their own shop; ratings start at zero even if supplied', async () => {
        const o = await f.owner(app);
        const shop = await f.createShop(app, o.token);
        const res = await bookForm(o.token, shop._id, { averageRating: 5, numReviews: 999, archivedAt: '2020-01-01' });
        expect(res.status).toBe(201);
        expect(res.body.averageRating).toBe(0);
        expect(res.body.numReviews).toBe(0);
        expect(res.body.archivedAt).toBeNull();
    });

    test.each([
        ['negative price', { price: '-5' }],
        ['negative stock', { stockCount: '-1' }],
        ['fractional stock', { stockCount: '2.5' }],
        ['non-numeric price', { price: 'free' }],
        ['empty title', { title: '' }]
    ])('invalid book data is rejected: %s', async (_n, override) => {
        const o = await f.owner(app);
        const shop = await f.createShop(app, o.token);
        const res = await request(app).post('/api/books').set(f.bearer(o.token))
            .field('title', override.title ?? 'T').field('author', 'A').field('description', 'D')
            .field('price', override.price ?? '100').field('category', 'C')
            .field('stockCount', override.stockCount ?? '5').field('shop', shop._id);
        expect(res.status).toBe(400);
    });
});

describe('book and shop modification', () => {
    test('another owner (or a customer) gets 403, not 401, when editing or deleting', async () => {
        const a = await f.scenario(app);
        const b = await f.owner(app);
        const c = await f.customer(app);
        for (const t of [b.token, c.token]) {
            const put = await request(app).put(`/api/books/${a.book._id}`).set(f.bearer(t)).field('price', '1');
            expect(put.status).toBe(403);
            expect((await request(app).delete(`/api/books/${a.book._id}`).set(f.bearer(t))).status).toBe(403);
            expect((await request(app).put(`/api/shops/${a.shop._id}`).set(f.bearer(t)).send({ name: 'Hijack' })).status).toBe(403);
            expect((await request(app).delete(`/api/shops/${a.shop._id}`).set(f.bearer(t))).status).toBe(403);
        }
        expect((await Book.findById(a.book._id)).price).toBe(1000);
        expect((await Shop.findById(a.shop._id)).name).not.toBe('Hijack');
    });

    test('mass assignment on book update is ignored (shop, ratings, archive state, image URL)', async () => {
        const a = await f.scenario(app);
        const other = await f.scenario(app);
        const res = await request(app).put(`/api/books/${a.book._id}`).set(f.bearer(a.shopOwner.token))
            .field('price', '1500').field('stockCount', '7')
            .field('shop', other.shop._id).field('averageRating', '5').field('numReviews', '100')
            .field('archivedAt', '2020-01-01').field('imageUrl', 'https://evil.example/x.png');
        expect(res.status).toBe(200);
        const book = await Book.findById(a.book._id);
        expect(book.price).toBe(1500);
        expect(book.stockCount).toBe(7);
        expect(String(book.shop)).toBe(a.shop._id);
        expect(book.averageRating).toBe(0);
        expect(book.numReviews).toBe(0);
        expect(book.archivedAt).toBeNull();
        expect(book.imageUrl).not.toContain('evil.example');
    });

    test('owner id cannot be reassigned by updating a shop; location stays immutable', async () => {
        const a = await f.scenario(app);
        const thief = await f.owner(app);
        const res = await request(app).put(`/api/shops/${a.shop._id}`).set(f.bearer(a.shopOwner.token))
            .send({ name: 'Renamed', shopOwner: thief.id, location: 'Mars', averageRating: 5, followers: [thief.id] });
        expect(res.status).toBe(200);
        const shop = await Shop.findById(a.shop._id);
        expect(shop.name).toBe('Renamed');
        expect(String(shop.shopOwner)).toBe(a.shopOwner.id);
        expect(shop.location).toBe('Colombo');
        expect(shop.averageRating).toBe(0);
        expect(shop.followers).toHaveLength(0);
    });

    test('update validation: negative stock via the API is rejected', async () => {
        const a = await f.scenario(app);
        const res = await request(app).put(`/api/books/${a.book._id}`).set(f.bearer(a.shopOwner.token)).field('stockCount', '-3');
        expect(res.status).toBe(400);
        expect((await Book.findById(a.book._id)).stockCount).toBe(10);
    });
});

describe('deletion policy: books', () => {
    test('a never-ordered book is deleted outright (with its reviews)', async () => {
        const a = await f.scenario(app);
        const reviewer = await f.customer(app);
        await request(app).post('/api/reviews').set(f.bearer(reviewer.token))
            .field('targetId', a.book._id).field('targetModel', 'Book').field('rating', '4').field('comment', 'ok');

        const res = await request(app).delete(`/api/books/${a.book._id}`).set(f.bearer(a.shopOwner.token));
        expect(res.status).toBe(200);
        expect(await Book.findById(a.book._id)).toBeNull();
        expect(await Review.countDocuments({ targetId: a.book._id })).toBe(0);
    });

    test('a book with order history is archived, hidden from catalogues, and cannot be ordered', async () => {
        const a = await f.scenario(app);
        const buyer = await f.customer(app);
        const order = (await f.placeOrder(app, buyer.token, { book: a.book._id })).body;

        const res = await request(app).delete(`/api/books/${a.book._id}`).set(f.bearer(a.shopOwner.token));
        expect(res.status).toBe(200);

        const doc = await Book.findById(a.book._id);
        expect(doc).not.toBeNull();
        expect(doc.archivedAt).not.toBeNull();

        expect((await request(app).get('/api/books')).body).toHaveLength(0);
        expect((await request(app).get(`/api/books/${a.book._id}`)).status).toBe(404);
        expect((await request(app).get(`/api/books/shop/${a.shop._id}`)).body).toHaveLength(0);
        const mine = await request(app).get('/api/books/owner/me').set(f.bearer(a.shopOwner.token));
        expect(mine.body).toHaveLength(0);
        expect((await f.placeOrder(app, buyer.token, { book: a.book._id })).status).toBe(404);

        // history still renders the title
        const history = await request(app).get(`/api/orders/reader/${buyer.id}`).set(f.bearer(buyer.token));
        expect(history.body[0]._id).toBe(order._id);
        expect(history.body[0].book.title).toBeDefined();
    });

    test('the archived book’s open order can still be fulfilled and cancelled with stock returned', async () => {
        const a = await f.scenario(app, { stockCount: 5 });
        const buyer = await f.customer(app);
        const order = (await f.placeOrder(app, buyer.token, { book: a.book._id, quantity: 2 })).body;
        await request(app).delete(`/api/books/${a.book._id}`).set(f.bearer(a.shopOwner.token));
        expect((await f.setStatus(app, a.shopOwner.token, order._id, 'Cancelled')).status).toBe(200);
        expect((await Book.findById(a.book._id)).stockCount).toBe(5);
    });
});

describe('deletion policy: shops', () => {
    test('refused with 409 while orders are open; nothing is changed', async () => {
        const a = await f.scenario(app);
        const buyer = await f.customer(app);
        await f.placeOrder(app, buyer.token, { book: a.book._id });
        const res = await request(app).delete(`/api/shops/${a.shop._id}`).set(f.bearer(a.shopOwner.token));
        expect(res.status).toBe(409);
        expect((await Shop.findById(a.shop._id)).archivedAt).toBeNull();
        expect((await Book.findById(a.book._id)).archivedAt).toBeNull();
    });

    test('with only finished orders the shop is archived and history is retained', async () => {
        const a = await f.scenario(app);
        const buyer = await f.customer(app);
        const order = (await f.placeOrder(app, buyer.token, { book: a.book._id })).body;
        await f.setStatus(app, a.shopOwner.token, order._id, 'Cancelled');

        const res = await request(app).delete(`/api/shops/${a.shop._id}`).set(f.bearer(a.shopOwner.token));
        expect(res.status).toBe(200);
        expect((await Shop.findById(a.shop._id)).archivedAt).not.toBeNull();
        expect((await request(app).get('/api/shops')).body).toHaveLength(0);
        expect((await request(app).get(`/api/shops/${a.shop._id}`)).status).toBe(404);
        const history = await request(app).get(`/api/orders/reader/${buyer.id}`).set(f.bearer(buyer.token));
        expect(history.body).toHaveLength(1);
        expect(history.body[0].shop.name).toBeDefined();
    });

    test('a shop with no orders is removed completely, including books, reviews and reports', async () => {
        const a = await f.scenario(app);
        const reviewer = await f.customer(app);
        await request(app).post('/api/reviews').set(f.bearer(reviewer.token))
            .field('targetId', a.shop._id).field('targetModel', 'Shop').field('rating', '5').field('comment', 'nice');
        await request(app).post(`/api/reports/${a.shop._id}`).set(f.bearer(a.shopOwner.token)).field('title', 'Stock');

        const res = await request(app).delete(`/api/shops/${a.shop._id}`).set(f.bearer(a.shopOwner.token));
        expect(res.status).toBe(200);
        expect(await Shop.findById(a.shop._id)).toBeNull();
        expect(await Book.countDocuments({ shop: a.shop._id })).toBe(0);
        expect(await Review.countDocuments()).toBe(0);
        expect(await require('../models/reportModel').countDocuments()).toBe(0);
    });
});

describe('public shop data', () => {
    test('owner email and other followers are not exposed; the viewer still sees their own follow state', async () => {
        const a = await f.scenario(app);
        const fan = await f.customer(app);
        const other = await f.customer(app);
        expect((await request(app).post(`/api/shops/${a.shop._id}/follow`).set(f.bearer(fan.token))).body.followed).toBe(true);
        await request(app).post(`/api/shops/${a.shop._id}/follow`).set(f.bearer(other.token));

        const anon = await request(app).get(`/api/shops/${a.shop._id}`);
        expect(anon.status).toBe(200);
        expect(JSON.stringify(anon.body)).not.toContain(a.shopOwner.email);
        expect(anon.body.shopOwner.email).toBeUndefined();
        expect(anon.body.followers).toEqual([]);
        expect(anon.body.followersCount).toBe(2);

        const asFan = await request(app).get(`/api/shops/${a.shop._id}`).set(f.bearer(fan.token));
        expect(asFan.body.followers).toEqual([fan.id]); // existing client check keeps working
        expect(JSON.stringify(asFan.body)).not.toContain(other.id);

        const list = await request(app).get('/api/shops').set(f.bearer(fan.token));
        expect(JSON.stringify(list.body)).not.toContain(other.id);
    });

    test('follow toggles, and owners cannot follow their own shop', async () => {
        const a = await f.scenario(app);
        const fan = await f.customer(app);
        const on = await request(app).post(`/api/shops/${a.shop._id}/follow`).set(f.bearer(fan.token));
        expect(on.body).toEqual({ followersCount: 1, followed: true });
        const off = await request(app).post(`/api/shops/${a.shop._id}/follow`).set(f.bearer(fan.token));
        expect(off.body).toEqual({ followersCount: 0, followed: false });
        expect((await request(app).post(`/api/shops/${a.shop._id}/follow`).set(f.bearer(a.shopOwner.token))).status).toBe(400);
    });
});
