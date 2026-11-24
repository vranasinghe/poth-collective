const request = require('supertest');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const f = require('./helpers/factory');

let app;
beforeAll(async () => { app = await startDb(); });
afterAll(stopDb);
beforeEach(clearDb);

describe('order authentication', () => {
    test('unauthenticated order creation is rejected (and nothing is created)', async () => {
        const { book } = await f.scenario(app);
        const res = await f.placeOrder(app, null, { book: book._id });
        expect(res.status).toBe(401);

        const Order = require('../models/orderModel');
        expect(await Order.countDocuments()).toBe(0);
    });

    test.each([
        ['GET', '/api/orders/reader/000000000000000000000001'],
        ['GET', '/api/orders/shop/000000000000000000000001'],
        ['PUT', '/api/orders/000000000000000000000001/status'],
        ['PUT', '/api/orders/000000000000000000000001/delivery'],
        ['DELETE', '/api/orders/000000000000000000000001']
    ])('%s %s requires a token', async (method, url) => {
        const res = await request(app)[method.toLowerCase()](url).send({});
        expect(res.status).toBe(401);
    });

    test.each([
        ['malformed token', 'Bearer not.a.jwt'],
        ['wrong scheme', 'Basic abcdef'],
        ['empty bearer', 'Bearer ']
    ])('%s is rejected with 401', async (_name, header) => {
        const res = await request(app).get('/api/orders/reader/000000000000000000000001').set('Authorization', header);
        expect(res.status).toBe(401);
    });
});

describe('order ownership', () => {
    test("Customer A cannot read Customer B's orders", async () => {
        const { book } = await f.scenario(app);
        const a = await f.customer(app);
        const b = await f.customer(app);
        expect((await f.placeOrder(app, b.token, { book: book._id })).status).toBe(201);

        const forbidden = await request(app).get(`/api/orders/reader/${b.id}`).set(f.bearer(a.token));
        expect(forbidden.status).toBe(403);

        const own = await request(app).get(`/api/orders/reader/${b.id}`).set(f.bearer(b.token));
        expect(own.status).toBe(200);
        expect(own.body).toHaveLength(1);

        const mine = await request(app).get(`/api/orders/reader/${a.id}`).set(f.bearer(a.token));
        expect(mine.body).toHaveLength(0);
    });

    test("Shop Owner A cannot access Shop Owner B's orders", async () => {
        const a = await f.scenario(app);
        const b = await f.scenario(app);
        const buyer = await f.customer(app);
        const placed = await f.placeOrder(app, buyer.token, { book: b.book._id });
        expect(placed.status).toBe(201);

        // A reads B's shop orders
        const read = await request(app).get(`/api/orders/shop/${b.shop._id}`).set(f.bearer(a.shopOwner.token));
        expect(read.status).toBe(403);

        // A changes the status of an order in B's shop
        const change = await f.setStatus(app, a.shopOwner.token, placed.body._id, 'Confirmed');
        expect(change.status).toBe(403);

        // A removes B's order
        const remove = await request(app).delete(`/api/orders/${placed.body._id}`).set(f.bearer(a.shopOwner.token));
        expect(remove.status).toBe(403);

        // B sees it, and the status is untouched
        const ok = await request(app).get(`/api/orders/shop/${b.shop._id}`).set(f.bearer(b.shopOwner.token));
        expect(ok.status).toBe(200);
        expect(ok.body).toHaveLength(1);
        expect(ok.body[0].status).toBe('Pending');
    });

    test('a customer cannot change fulfilment status, even of their own order', async () => {
        const { book } = await f.scenario(app);
        const buyer = await f.customer(app);
        const placed = await f.placeOrder(app, buyer.token, { book: book._id });
        const res = await f.setStatus(app, buyer.token, placed.body._id, 'Delivered');
        expect(res.status).toBe(403);
    });

    test('a stranger cannot edit delivery details or cancel someone else’s order', async () => {
        const { book } = await f.scenario(app);
        const buyer = await f.customer(app);
        const stranger = await f.customer(app);
        const placed = await f.placeOrder(app, buyer.token, { book: book._id });

        const edit = await request(app)
            .put(`/api/orders/${placed.body._id}/delivery`)
            .set(f.bearer(stranger.token))
            .send({ deliveryDetails: { address: 'x', city: 'y', phone: '0770000000' } });
        expect(edit.status).toBe(403);

        const cancel = await request(app).delete(`/api/orders/${placed.body._id}`).set(f.bearer(stranger.token));
        expect(cancel.status).toBe(403);
    });

    test('unknown order id is 404 and a malformed id is 400', async () => {
        const buyer = await f.customer(app);
        const missing = await request(app).delete('/api/orders/000000000000000000000001').set(f.bearer(buyer.token));
        expect(missing.status).toBe(404);
        const malformed = await request(app).delete('/api/orders/not-an-id').set(f.bearer(buyer.token));
        expect(malformed.status).toBe(400);
    });

    test('a shop owner cannot order from their own shop', async () => {
        const { shopOwner, book } = await f.scenario(app);
        const res = await f.placeOrder(app, shopOwner.token, { book: book._id });
        expect(res.status).toBe(403);
    });
});
