const request = require('supertest');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const f = require('./helpers/factory');
const Book = require('../models/bookModel');
let app;
beforeAll(async () => { app = await startDb(); });
afterAll(stopDb);
beforeEach(clearDb);

test('legacy catalogues remain arrays; paginated catalogues return counts and deterministic pages', async () => {
 const s = await f.scenario(app);
 await f.createBook(app, s.shopOwner.token, s.shop._id, { title: 'Another', price: 200 });
 expect(Array.isArray((await request(app).get('/api/books')).body)).toBe(true);
 const first = await request(app).get('/api/books?page=1&limit=1&sort=price-asc');
 const second = await request(app).get('/api/books?page=2&limit=1&sort=price-asc');
 expect(first.body).toMatchObject({ total: 2, page: 1, pages: 2, categories: ['Fiction'] });
 expect(first.body.items[0].price).toBe(200);
 expect(second.body.items[0]._id).not.toBe(first.body.items[0]._id);
});
test('search is literal, by author or title, and composes with stock, genre, price and shop', async () => {
 const s = await f.scenario(app);
 await Book.findByIdAndUpdate(s.book._id, { title: 'A [book]', author: 'Nimal', category: 'History', price: 750 });
 const find = q => request(app).get(`/api/books?page=1&${q}`);
 expect((await find('q=Nimal&category=History&inStock=true&minPrice=700&maxPrice=800')).body.total).toBe(1);
 expect((await find('q=%5Bbook%5D')).body.total).toBe(1);
 expect((await find('q=.*')).body.total).toBe(0);
 expect((await find('category=Fiction')).body.total).toBe(0);
 await Book.findByIdAndUpdate(s.book._id, { stockCount: 0 });
 expect((await find('inStock=true')).body.total).toBe(0);
 expect((await find(`shop=${s.shop._id}`)).body.total).toBe(1);
});
test.each(['page=0','page=1.5','page=1&limit=61','page=1&sort=bad','page=1&minPrice=900&maxPrice=1','page=1&inStock=maybe','page=1&q[$ne]=x','page=1&shop=nope'])('rejects invalid catalogue input: %s', async query => {
 expect((await request(app).get(`/api/books?${query}`)).status).toBe(400);
});
test('archived books are excluded from results and genre facets', async () => {
 const s = await f.scenario(app); await Book.findByIdAndUpdate(s.book._id, { archivedAt: new Date() });
 expect((await request(app).get('/api/books?page=1')).body).toMatchObject({ total: 0, categories: [] });
});
test('followed-shop filters are authenticated, scoped and searchable', async () => {
 const s = await f.scenario(app); const a = await f.customer(app); const b = await f.customer(app);
 await request(app).post(`/api/shops/${s.shop._id}/follow`).set(f.bearer(a.token));
 expect((await request(app).get('/api/shops?page=1&following=true')).status).toBe(401);
 const followed = await request(app).get('/api/shops?page=1&following=true&location=Colombo').set(f.bearer(a.token));
 expect(followed.body.total).toBe(1); expect(followed.body.items[0].followers).toEqual([a.id]);
 expect((await request(app).get('/api/shops?page=1&following=true').set(f.bearer(b.token))).body.total).toBe(0);
});
test('restored profile validates a session without exposing a password', async () => {
 const c = await f.customer(app); const result = await request(app).get('/api/users/profile').set(f.bearer(c.token));
 expect(result.status).toBe(200); expect(result.body._id).toBe(c.id); expect(result.body.password).toBeUndefined();
 expect((await request(app).get('/api/users/profile').set(f.bearer('expired'))).status).toBe(401);
});
test('quotes use authoritative prices and do not reserve stock or verify payment', async () => {
 const s = await f.scenario(app, { price: 751.25 }); const c = await f.customer(app);
 const quote = await request(app).post('/api/orders/quote').set(f.bearer(c.token)).send({ book: s.book._id, quantity: 2, totalPrice: 1 });
 expect(quote.status).toBe(200); expect(quote.body).toMatchObject({ totalPrice: 1502.5, currency: 'LKR', paymentStatus: 'Awaiting shop verification' });
 expect((await Book.findById(s.book._id)).stockCount).toBe(10);
 expect((await request(app).post('/api/orders/quote').set(f.bearer(c.token)).send({ book: s.book._id, quantity: 11 })).status).toBe(409);
 expect((await request(app).post('/api/orders/quote').set(f.bearer(s.shopOwner.token)).send({ book: s.book._id, quantity: 1 })).status).toBe(403);
});
test('a price changed after the quote cannot silently place an order', async () => {
 const s = await f.scenario(app); const c = await f.customer(app);
 const result = await f.placeOrder(app, c.token, { book: s.book._id, extra: { quotedUnitPrice: 1 } });
 expect(result.status).toBe(409); expect((await Book.findById(s.book._id)).stockCount).toBe(10);
});
test('authors can remove an existing cover without affecting content', async () => {
 const c = await f.customer(app);
 const created = await request(app).post('/api/blogs').set(f.bearer(c.token)).field('title','A story').field('content','Readable').attach('coverImage', f.PNG, { filename: 'cover.png', contentType: 'image/png' });
 const changed = await request(app).put(`/api/blogs/${created.body._id}`).set(f.bearer(c.token)).field('removeCoverImage','true');
 expect(changed.status).toBe(200); expect(changed.body.coverImage).toBeNull(); expect(changed.body.content).toBe('Readable');
});
