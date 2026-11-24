const request = require('supertest');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const f = require('./helpers/factory');
const User = require('../models/userModel');

let app;
beforeAll(async () => { app = await startDb(); });
afterAll(stopDb);
beforeEach(clearDb);

// These walk the same sequences the mobile/web app performs, to prove the hardening did not break them.
describe('end-to-end workflows used by the app', () => {
    test('owner and reader journey: shop, stock, discovery, follow, order, fulfilment, review, report', async () => {
        // Owner sets up
        const o = await f.owner(app);
        const shop = await f.createShop(app, o.token, { name: 'Pages & Co' });
        const mine = await request(app).get('/api/shops/owner/me').set(f.bearer(o.token));
        expect(mine.body.map((s) => s._id)).toEqual([shop._id]);

        const book = await f.createBook(app, o.token, shop._id, { title: 'The Hobbit', price: 2800, stockCount: 8 });
        const stock = await request(app).get('/api/books/owner/me').set(f.bearer(o.token));
        expect(stock.body).toHaveLength(1);

        // Owner edits stock the way manage-stock does (multipart form with a few fields)
        const edit = await request(app).put(`/api/books/${book._id}`).set(f.bearer(o.token))
            .field('price', '2900').field('description', 'Updated').field('category', 'Fantasy').field('stockCount', '9');
        expect(edit.status).toBe(200);
        expect(edit.body.stockCount).toBe(9);

        // Reader discovers
        const reader = await f.customer(app);
        const catalog = await request(app).get('/api/books');
        expect(catalog.body).toHaveLength(1);
        expect(catalog.body[0].shop.name).toBe('Pages & Co');
        const detail = await request(app).get(`/api/books/${book._id}`);
        expect(detail.body.price).toBe(2900);
        const shops = await request(app).get('/api/shops').set(f.bearer(reader.token));
        expect(shops.body[0].shopOwner._id).toBe(o.id); // the client uses shopOwner._id to detect ownership
        const byShop = await request(app).get(`/api/books/shop/${shop._id}`);
        expect(byShop.body).toHaveLength(1);

        // Reader follows and sees follow state the way the shop screen reads it
        await request(app).post(`/api/shops/${shop._id}/follow`).set(f.bearer(reader.token));
        const shopPage = await request(app).get(`/api/shops/${shop._id}`).set(f.bearer(reader.token));
        expect(shopPage.body.followers.includes(reader.id)).toBe(true);

        // Reader orders using exactly the fields the checkout screen sends (including legacy extras)
        const placed = await f.placeOrder(app, reader.token, {
            book: book._id, shop: shop._id, quantity: 2,
            extra: { reader: reader.id, totalPrice: 5800 }
        });
        expect(placed.status).toBe(201);
        expect(placed.body.totalPrice).toBe(5800);
        const myOrders = await request(app).get(`/api/orders/reader/${reader.id}`).set(f.bearer(reader.token));
        expect(myOrders.body[0].book.title).toBe('The Hobbit');
        expect(myOrders.body[0].shop.name).toBe('Pages & Co');

        // Owner works the order through the screens' buttons
        const incoming = await request(app).get(`/api/orders/shop/${shop._id}`).set(f.bearer(o.token));
        expect(incoming.body[0].reader.email).toBe(reader.email);
        expect(incoming.body[0].paymentSlipUrl).toMatch(/^https:\/\//);
        for (const status of ['Confirmed', 'Shipped', 'Delivered']) {
            expect((await f.setStatus(app, o.token, placed.body._id, status)).status).toBe(200);
        }

        // Reader reviews book and shop; ratings show on the catalogue
        expect((await request(app).post('/api/reviews').set(f.bearer(reader.token))
            .field('targetId', book._id).field('targetModel', 'Book').field('rating', '5').field('comment', 'Loved it')
            .attach('image', f.PNG, { filename: 'p.png', contentType: 'image/png' })).status).toBe(201);
        const rated = await request(app).get(`/api/books/${book._id}`);
        expect([rated.body.averageRating, rated.body.numReviews]).toEqual([5, 1]);
        const reviews = await request(app).get(`/api/reviews/${book._id}`);
        expect(reviews.body[0].user.firstName).toBe('Test');
        const mineReviews = await request(app).get('/api/reviews/me').set(f.bearer(reader.token));
        expect(mineReviews.body[0].targetId.title).toBe('The Hobbit');

        // Owner publishes a stock report; the follower sees it in their alerts feed
        const preview = await request(app).get(`/api/reports/preview/${shop._id}`).set(f.bearer(o.token));
        expect(preview.body.shopName).toBe('Pages & Co');
        await request(app).post(`/api/reports/${shop._id}`).set(f.bearer(o.token))
            .field('title', 'Stock Update').field('notes', 'New arrivals')
            .attach('image', f.JPEG, { filename: 'r.jpg', contentType: 'image/jpeg' });
        const alerts = await request(app).get('/api/reports').set(f.bearer(reader.token));
        expect(alerts.body).toHaveLength(1);
        expect(alerts.body[0].title).toBe('Stock Update');

        // Profile update from the account screen
        const profile = await request(app).put('/api/users/profile').set(f.bearer(reader.token))
            .send({ firstName: 'Kamal', lastName: 'Silva', email: reader.email });
        expect(profile.status).toBe(200);
        expect(profile.body.firstName).toBe('Kamal');
    });

    test('community: write a blog with a cover, comment, like, edit and delete', async () => {
        const author = await f.customer(app);
        const reader = await f.customer(app);
        const created = await request(app).post('/api/blogs').set(f.bearer(author.token))
            .field('title', 'On reading').field('content', 'Long text').field('penName', 'N. Writer')
            .attach('coverImage', f.PNG, { filename: 'c.png', contentType: 'image/png' });
        expect(created.status).toBe(201);
        expect(created.body.coverImage).toMatch(/^https:\/\//);
        expect(created.body.penName).toBe('N. Writer');

        const list = await request(app).get('/api/blogs');
        expect(list.body).toHaveLength(1);
        expect((await request(app).post(`/api/blogs/${created.body._id}/like`).set(f.bearer(reader.token))).body.liked).toBe(true);
        const comment = await request(app).post(`/api/blogs/${created.body._id}/comments`).set(f.bearer(reader.token)).send({ text: 'Lovely' });
        expect(comment.body.userName).toBe('Test User');
        expect((await request(app).get(`/api/blogs/${created.body._id}/comments`)).body).toHaveLength(1);
        expect((await request(app).put(`/api/blogs/${created.body._id}`).set(f.bearer(author.token)).field('title', 'On reading, again')).status).toBe(200);
        expect((await request(app).delete(`/api/blogs/${created.body._id}`).set(f.bearer(author.token))).status).toBe(200);
    });

    test('shop owner can update a shop with a new image, and the customer account can be deleted afterwards', async () => {
        const o = await f.owner(app);
        const shop = await f.createShop(app, o.token);
        const res = await request(app).put(`/api/shops/${shop._id}`).set(f.bearer(o.token))
            .field('name', 'Renamed Shop').field('description', 'New').field('contactNumber', '0719998887')
            .attach('image', f.PNG, { filename: 's.png', contentType: 'image/png' });
        expect(res.status).toBe(200);
        expect(res.body.imageUrl).toMatch(/^https:\/\/uploads\.test\.invalid/);

        const reader = await f.customer(app);
        expect((await request(app).delete('/api/users/profile').set(f.bearer(reader.token))).status).toBe(200);
    });
});

describe('existing demo-account flow keeps working with the new auth rules', () => {
    const prev = process.env.DEMO_ENABLED;
    beforeAll(() => { process.env.DEMO_ENABLED = 'true'; });
    afterAll(() => { process.env.DEMO_ENABLED = prev; });

    test('a demo reader authenticates on protected endpoints', async () => {
        const res = await request(app).post('/api/users/demo').send({ userType: 'Customer' });
        expect(res.status).toBe(201);
        expect(res.body.isDemo).toBe(true);
        const orders = await request(app).get(`/api/orders/reader/${res.body._id}`).set(f.bearer(res.body.token));
        expect(orders.status).toBe(200);
    });

    test('a demo owner gets a shop with sample books, and cannot touch another owner’s shop', async () => {
        const res = await request(app).post('/api/users/demo').send({ userType: 'Shop Owner' });
        expect(res.status).toBe(201);
        const shops = await request(app).get('/api/shops/owner/me').set(f.bearer(res.body.token));
        expect(shops.body).toHaveLength(1);
        const books = await request(app).get('/api/books/owner/me').set(f.bearer(res.body.token));
        expect(books.body.length).toBeGreaterThan(0);

        const real = await f.scenario(app);
        const foreign = await request(app).post('/api/books').set(f.bearer(res.body.token))
            .field('title', 'x').field('author', 'a').field('description', 'd').field('price', '1')
            .field('category', 'c').field('stockCount', '1').field('shop', real.shop._id);
        expect(foreign.status).toBe(403);
    });

    test('invalid demo requests are rejected and the kill switch works', async () => {
        expect((await request(app).post('/api/users/demo').send({ userType: 'Admin' })).status).toBe(400);
        process.env.DEMO_ENABLED = 'false';
        expect((await request(app).post('/api/users/demo').send({ userType: 'Customer' })).status).toBe(404);
        process.env.DEMO_ENABLED = 'true';
        expect(await User.countDocuments({ isDemo: true })).toBe(0); // neither rejected request created an account
    });
});
