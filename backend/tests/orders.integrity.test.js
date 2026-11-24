const request = require('supertest');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const f = require('./helpers/factory');
const tx = require('../services/transaction');
const Book = require('../models/bookModel');
const Order = require('../models/orderModel');

let app;
beforeAll(async () => { app = await startDb(); });
afterAll(stopDb);
beforeEach(async () => { await clearDb(); tx.__resetDetection(); });
afterEach(() => jest.restoreAllMocks());

const stockOf = async (id) => (await Book.findById(id)).stockCount;

// Every integrity guarantee must hold with transactions (Atlas / replica set) and without them (standalone).
describe.each([
    ['replica set (transactions)', true],
    ['standalone (no transactions)', false]
])('order integrity on %s', (_label, transactional) => {
    beforeEach(() => { if (!transactional) tx.__setSupportForTests(false); });

    describe('pricing and validation', () => {
        test('client price manipulation has no effect: the server price is stored', async () => {
            const { book } = await f.scenario(app, { price: 1250 });
            const buyer = await f.customer(app);
            const res = await f.placeOrder(app, buyer.token, {
                book: book._id,
                quantity: 3,
                extra: { totalPrice: 1, price: 1, reader: '000000000000000000000001', status: 'Delivered' }
            });
            expect(res.status).toBe(201);
            expect(res.body.totalPrice).toBe(3750);
            expect(res.body.status).toBe('Pending');
            expect(String(res.body.reader)).toBe(buyer.id);
        });

        test('a different reader id in the body cannot place an order for someone else', async () => {
            const { book } = await f.scenario(app);
            const attacker = await f.customer(app);
            const victim = await f.customer(app);
            const res = await f.placeOrder(app, attacker.token, { book: book._id, extra: { reader: victim.id } });
            expect(res.status).toBe(201);
            expect(String(res.body.reader)).toBe(attacker.id);
            const victimOrders = await request(app).get(`/api/orders/reader/${victim.id}`).set(f.bearer(victim.token));
            expect(victimOrders.body).toHaveLength(0);
        });

        test.each([
            ['zero', 0], ['negative', -2], ['fractional', 1.5], ['too large', 101], ['text', 'abc']
        ])('quantity %s is rejected and stock is untouched', async (_n, quantity) => {
            const { book } = await f.scenario(app, { stockCount: 10 });
            const buyer = await f.customer(app);
            const res = await f.placeOrder(app, buyer.token, { book: book._id, quantity });
            expect(res.status).toBe(400);
            expect(await stockOf(book._id)).toBe(10);
            expect(await Order.countDocuments()).toBe(0);
        });

        test('the selected book must belong to the selected shop', async () => {
            const a = await f.scenario(app);
            const b = await f.scenario(app);
            const buyer = await f.customer(app);
            const res = await f.placeOrder(app, buyer.token, { book: a.book._id, shop: b.shop._id });
            expect(res.status).toBe(400);
            expect(await stockOf(a.book._id)).toBe(10);
        });

        test('payment slip is mandatory', async () => {
            const { book } = await f.scenario(app);
            const buyer = await f.customer(app);
            const res = await f.placeOrder(app, buyer.token, { book: book._id, slip: null });
            expect(res.status).toBe(400);
        });

        test('invalid delivery details are rejected', async () => {
            const { book } = await f.scenario(app);
            const buyer = await f.customer(app);
            const res = await f.placeOrder(app, buyer.token, { book: book._id, delivery: { address: '', city: 'x', phone: '123' } });
            expect(res.status).toBe(400);
            expect(await stockOf(book._id)).toBe(10);
        });

        test('unknown and malformed book ids', async () => {
            const buyer = await f.customer(app);
            expect((await f.placeOrder(app, buyer.token, { book: '000000000000000000000001' })).status).toBe(404);
            expect((await f.placeOrder(app, buyer.token, { book: 'nope' })).status).toBe(400);
        });
    });

    describe('stock reservation', () => {
        test('ordering the last copies succeeds, ordering more is refused and stock never goes negative', async () => {
            const { book } = await f.scenario(app, { stockCount: 3 });
            const buyer = await f.customer(app);
            expect((await f.placeOrder(app, buyer.token, { book: book._id, quantity: 3 })).status).toBe(201);
            expect(await stockOf(book._id)).toBe(0);
            const more = await f.placeOrder(app, buyer.token, { book: book._id, quantity: 1 });
            expect(more.status).toBe(409);
            expect(await stockOf(book._id)).toBe(0);
        });

        test('concurrent orders cannot oversell stock', async () => {
            const stock = 5;
            const { book } = await f.scenario(app, { stockCount: stock });
            const buyers = await Promise.all(Array.from({ length: 12 }, () => f.customer(app)));

            const results = await Promise.all(buyers.map((b) => f.placeOrder(app, b.token, { book: book._id, quantity: 1 })));
            const created = results.filter((r) => r.status === 201);
            const refused = results.filter((r) => r.status === 409);

            expect(created).toHaveLength(stock);
            expect(refused).toHaveLength(buyers.length - stock);
            expect(await Order.countDocuments()).toBe(stock);
            expect(await stockOf(book._id)).toBe(0);
        });

        test('concurrent multi-quantity orders never exceed stock', async () => {
            const { book } = await f.scenario(app, { stockCount: 10 });
            const buyers = await Promise.all(Array.from({ length: 8 }, () => f.customer(app)));
            const results = await Promise.all(buyers.map((b) => f.placeOrder(app, b.token, { book: book._id, quantity: 3 })));
            const reserved = results.filter((r) => r.status === 201).length * 3;
            expect(reserved).toBeLessThanOrEqual(10);
            expect(await stockOf(book._id)).toBe(10 - reserved);
            expect(await stockOf(book._id)).toBeGreaterThanOrEqual(0);
        });

        test('a failed order insert returns the reserved stock', async () => {
            const { book } = await f.scenario(app, { stockCount: 10 });
            const buyer = await f.customer(app);
            jest.spyOn(console, 'error').mockImplementation(() => {});
            jest.spyOn(Order, 'create').mockRejectedValueOnce(new Error('simulated write failure'));
            const res = await f.placeOrder(app, buyer.token, { book: book._id, quantity: 4 });
            expect(res.status).toBe(500);
            expect(res.body.message).toBe('Internal server error');
            expect(await stockOf(book._id)).toBe(10);
            expect(await Order.countDocuments()).toBe(0);
        });
    });

    describe('status transitions', () => {
        const place = async (opts) => {
            const s = await f.scenario(app, opts);
            const buyer = await f.customer(app);
            const placed = await f.placeOrder(app, buyer.token, { book: s.book._id, quantity: 2 });
            return { ...s, buyer, order: placed.body };
        };

        test('the full legal path Pending, Confirmed, Shipped, Delivered works', async () => {
            const s = await place();
            for (const status of ['Confirmed', 'Shipped', 'Delivered']) {
                const res = await f.setStatus(app, s.shopOwner.token, s.order._id, status);
                expect(res.status).toBe(200);
                expect(res.body.status).toBe(status);
            }
            expect(await stockOf(s.book._id)).toBe(8); // delivered orders keep their stock consumed
        });

        test.each([
            ['Pending', 'Shipped'], ['Pending', 'Delivered'], ['Pending', 'Pending'],
            ['Confirmed', 'Pending'], ['Confirmed', 'Delivered'], ['Shipped', 'Confirmed'], ['Shipped', 'Cancelled']
        ])('illegal transition %s to %s is rejected', async (from, to) => {
            const s = await place();
            const path = { Pending: [], Confirmed: ['Confirmed'], Shipped: ['Confirmed', 'Shipped'] }[from];
            for (const step of path) expect((await f.setStatus(app, s.shopOwner.token, s.order._id, step)).status).toBe(200);
            const stockBefore = await stockOf(s.book._id);

            const res = await f.setStatus(app, s.shopOwner.token, s.order._id, to);
            expect(res.status).toBe(409);
            expect((await Order.findById(s.order._id)).status).toBe(from);
            expect(await stockOf(s.book._id)).toBe(stockBefore);
        });

        test.each(['Delivered', 'Cancelled'])('terminal %s order can never change again', async (terminal) => {
            const s = await place();
            if (terminal === 'Delivered') {
                for (const st of ['Confirmed', 'Shipped', 'Delivered']) await f.setStatus(app, s.shopOwner.token, s.order._id, st);
            } else {
                await f.setStatus(app, s.shopOwner.token, s.order._id, 'Cancelled');
            }
            for (const to of ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']) {
                expect((await f.setStatus(app, s.shopOwner.token, s.order._id, to)).status).toBe(409);
            }
        });

        test('an unknown status value is a validation error', async () => {
            const s = await place();
            const res = await f.setStatus(app, s.shopOwner.token, s.order._id, 'Teleported');
            expect(res.status).toBe(400);
        });
    });

    describe('cancellation and stock restoration', () => {
        const place = async (quantity = 4, stockCount = 10) => {
            const s = await f.scenario(app, { stockCount });
            const buyer = await f.customer(app);
            const placed = await f.placeOrder(app, buyer.token, { book: s.book._id, quantity });
            return { ...s, buyer, order: placed.body };
        };

        test('cancelling restores stock exactly once, even when repeated', async () => {
            const s = await place(4, 10);
            expect(await stockOf(s.book._id)).toBe(6);

            const first = await f.setStatus(app, s.shopOwner.token, s.order._id, 'Cancelled');
            expect(first.status).toBe(200);
            expect(await stockOf(s.book._id)).toBe(10);

            const again = await f.setStatus(app, s.shopOwner.token, s.order._id, 'Cancelled');
            expect(again.status).toBe(409);
            const viaDelete = await request(app).delete(`/api/orders/${s.order._id}`).set(f.bearer(s.buyer.token));
            expect(viaDelete.status).toBe(200); // now only hides it from the reader's list
            await request(app).delete(`/api/orders/${s.order._id}`).set(f.bearer(s.buyer.token));

            expect(await stockOf(s.book._id)).toBe(10); // still 10, never 14 or 18
        });

        test('simultaneous cancellations restore stock only once', async () => {
            const s = await place(4, 10);
            const results = await Promise.all([
                f.setStatus(app, s.shopOwner.token, s.order._id, 'Cancelled'),
                f.setStatus(app, s.shopOwner.token, s.order._id, 'Cancelled'),
                request(app).delete(`/api/orders/${s.order._id}`).set(f.bearer(s.buyer.token)),
                request(app).delete(`/api/orders/${s.order._id}`).set(f.bearer(s.shopOwner.token)),
                f.setStatus(app, s.shopOwner.token, s.order._id, 'Cancelled')
            ]);
            expect(results.some((r) => r.status === 200)).toBe(true);
            expect((await Order.findById(s.order._id)).status).toBe('Cancelled');
            expect(await stockOf(s.book._id)).toBe(10);
        });

        test('the customer can cancel a Pending order through DELETE; the record is kept as Cancelled', async () => {
            const s = await place(2, 10);
            const res = await request(app).delete(`/api/orders/${s.order._id}`).set(f.bearer(s.buyer.token));
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('Cancelled');
            expect(await Order.countDocuments()).toBe(1); // never hard-deleted
            expect(await stockOf(s.book._id)).toBe(10);
            const list = await request(app).get(`/api/orders/reader/${s.buyer.id}`).set(f.bearer(s.buyer.token));
            expect(list.body[0].status).toBe('Cancelled');
        });

        test('the customer cannot cancel after the shop confirmed; the shop can', async () => {
            const s = await place(2, 10);
            await f.setStatus(app, s.shopOwner.token, s.order._id, 'Confirmed');
            const byCustomer = await request(app).delete(`/api/orders/${s.order._id}`).set(f.bearer(s.buyer.token));
            expect(byCustomer.status).toBe(409);
            expect(await stockOf(s.book._id)).toBe(8);
            const byShop = await request(app).delete(`/api/orders/${s.order._id}`).set(f.bearer(s.shopOwner.token));
            expect(byShop.status).toBe(200);
            expect(await stockOf(s.book._id)).toBe(10);
        });

        test('orders in transit cannot be cancelled or removed', async () => {
            const s = await place(2, 10);
            await f.setStatus(app, s.shopOwner.token, s.order._id, 'Confirmed');
            await f.setStatus(app, s.shopOwner.token, s.order._id, 'Shipped');
            for (const token of [s.buyer.token, s.shopOwner.token]) {
                expect((await request(app).delete(`/api/orders/${s.order._id}`).set(f.bearer(token))).status).toBe(409);
            }
            expect(await stockOf(s.book._id)).toBe(8);
        });

        test('removing a Delivered or Cancelled order only hides it for the caller', async () => {
            const s = await place(2, 10);
            for (const st of ['Confirmed', 'Shipped', 'Delivered']) await f.setStatus(app, s.shopOwner.token, s.order._id, st);

            const hide = await request(app).delete(`/api/orders/${s.order._id}`).set(f.bearer(s.buyer.token));
            expect(hide.status).toBe(200);
            const readerList = await request(app).get(`/api/orders/reader/${s.buyer.id}`).set(f.bearer(s.buyer.token));
            expect(readerList.body).toHaveLength(0);
            const shopList = await request(app).get(`/api/orders/shop/${s.shop._id}`).set(f.bearer(s.shopOwner.token));
            expect(shopList.body).toHaveLength(1);
            expect(await Order.countDocuments()).toBe(1);
            expect(await stockOf(s.book._id)).toBe(8); // unchanged
        });
    });

    describe('delivery details', () => {
        test('editable while Pending, locked once confirmed', async () => {
            const { shopOwner, book } = await f.scenario(app);
            const buyer = await f.customer(app);
            const order = (await f.placeOrder(app, buyer.token, { book: book._id })).body;
            const newDetails = { address: '99 New Street', city: 'Kandy', phone: '0719998887' };

            const ok = await request(app).put(`/api/orders/${order._id}/delivery`).set(f.bearer(buyer.token)).send({ deliveryDetails: newDetails });
            expect(ok.status).toBe(200);
            expect(ok.body.deliveryDetails.city).toBe('Kandy');

            const bad = await request(app).put(`/api/orders/${order._id}/delivery`).set(f.bearer(buyer.token)).send({ deliveryDetails: { address: 'a', city: 'b', phone: 'xx' } });
            expect(bad.status).toBe(400);

            await f.setStatus(app, shopOwner.token, order._id, 'Confirmed');
            const locked = await request(app).put(`/api/orders/${order._id}/delivery`).set(f.bearer(buyer.token)).send({ deliveryDetails: newDetails });
            expect(locked.status).toBe(409);

            const ownerEdit = await request(app).put(`/api/orders/${order._id}/delivery`).set(f.bearer(shopOwner.token)).send({ deliveryDetails: newDetails });
            expect(ownerEdit.status).toBe(403);
        });
    });
});
