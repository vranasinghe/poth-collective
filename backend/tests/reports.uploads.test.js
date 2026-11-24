const request = require('supertest');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const f = require('./helpers/factory');
const Report = require('../models/reportModel');
const Book = require('../models/bookModel');
const storage = require('../utils/imageStorage');

let app;
beforeAll(async () => { app = await startDb(); });
afterAll(stopDb);
beforeEach(clearDb);
afterEach(() => jest.restoreAllMocks());

describe('stock report authorization', () => {
    test('anonymous callers cannot read, preview or create reports', async () => {
        const { shop } = await f.scenario(app);
        expect((await request(app).get('/api/reports')).status).toBe(401);
        expect((await request(app).get(`/api/reports/preview/${shop._id}`)).status).toBe(401);
        expect((await request(app).post(`/api/reports/${shop._id}`).field('title', 'x')).status).toBe(401);
    });

    test("another owner cannot preview or create reports for a shop that isn't theirs", async () => {
        const a = await f.scenario(app);
        const b = await f.owner(app);
        expect((await request(app).get(`/api/reports/preview/${a.shop._id}`).set(f.bearer(b.token))).status).toBe(403);
        const create = await request(app).post(`/api/reports/${a.shop._id}`).set(f.bearer(b.token)).field('title', 'forged');
        expect(create.status).toBe(403);
        expect(await Report.countDocuments()).toBe(0);
    });

    test('a customer cannot create or preview reports', async () => {
        const { shop } = await f.scenario(app);
        const c = await f.customer(app);
        expect((await request(app).get(`/api/reports/preview/${shop._id}`).set(f.bearer(c.token))).status).toBe(403);
        expect((await request(app).post(`/api/reports/${shop._id}`).set(f.bearer(c.token)).field('title', 'x')).status).toBe(403);
    });

    test('the owner can preview and create; only active books are counted', async () => {
        const a = await f.scenario(app, { stockCount: 4 });
        const preview = await request(app).get(`/api/reports/preview/${a.shop._id}`).set(f.bearer(a.shopOwner.token));
        expect(preview.status).toBe(200);
        expect(preview.body.breakdown).toEqual([{ bookName: a.book.title, stockAmount: 4 }]);

        const created = await request(app).post(`/api/reports/${a.shop._id}`).set(f.bearer(a.shopOwner.token)).field('title', 'Weekly').field('notes', 'n');
        expect(created.status).toBe(201);
        expect(created.body.breakdown).toHaveLength(1);
        expect((await request(app).post(`/api/reports/${a.shop._id}`).set(f.bearer(a.shopOwner.token)).field('title', '')).status).toBe(400);
    });

    test('report listings never include other people’s reports', async () => {
        const a = await f.scenario(app);
        const b = await f.scenario(app);
        await request(app).post(`/api/reports/${a.shop._id}`).set(f.bearer(a.shopOwner.token)).field('title', 'A report');
        await request(app).post(`/api/reports/${b.shop._id}`).set(f.bearer(b.shopOwner.token)).field('title', 'B report');

        const asA = await request(app).get('/api/reports').set(f.bearer(a.shopOwner.token));
        expect(asA.body.map((r) => r.title)).toEqual(['A report']);
        const asB = await request(app).get('/api/reports').set(f.bearer(b.shopOwner.token));
        expect(asB.body.map((r) => r.title)).toEqual(['B report']);

        const stranger = await f.customer(app);
        expect((await request(app).get('/api/reports').set(f.bearer(stranger.token))).body).toEqual([]);

        const fan = await f.customer(app);
        await request(app).post(`/api/shops/${a.shop._id}/follow`).set(f.bearer(fan.token));
        const asFan = await request(app).get('/api/reports').set(f.bearer(fan.token));
        expect(asFan.body.map((r) => r.title)).toEqual(['A report']); // followed shop only
    });
});

describe('upload validation', () => {
    const upload = (token, shopId, buffer, opts) => {
        const req = request(app).post('/api/books').set(f.bearer(token))
            .field('title', 'T').field('author', 'A').field('description', 'D')
            .field('price', '10').field('category', 'C').field('stockCount', '1').field('shop', shopId);
        return opts ? req.attach(opts.field || 'image', buffer, { filename: opts.filename, contentType: opts.contentType }) : req;
    };
    const setup = async () => {
        const o = await f.owner(app);
        const shop = await f.createShop(app, o.token);
        return { o, shop };
    };

    test('a non-image MIME type is rejected', async () => {
        const { o, shop } = await setup();
        const res = await upload(o.token, shop._id, Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/JPG and PNG/);
    });

    test('a disallowed image type (GIF, WebP, SVG) is rejected', async () => {
        const { o, shop } = await setup();
        for (const [filename, contentType] of [['a.gif', 'image/gif'], ['a.webp', 'image/webp'], ['a.svg', 'image/svg+xml']]) {
            const res = await upload(o.token, shop._id, Buffer.from('GIF89a......'), { filename, contentType });
            expect(res.status).toBe(400);
        }
    });

    test('a file that claims to be a PNG but has the wrong bytes is rejected (signature check)', async () => {
        const { o, shop } = await setup();
        const disguised = Buffer.from('<?php echo shell_exec($_GET["c"]); ?> pretending to be an image');
        const res = await upload(o.token, shop._id, disguised, { filename: 'shell.png', contentType: 'image/png' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/not a valid/);
    });

    test('a PNG body labelled as JPEG is accepted only when the real signature is an allowed image', async () => {
        const { o, shop } = await setup();
        const res = await upload(o.token, shop._id, f.PNG, { filename: 'a.jpg', contentType: 'image/jpeg' });
        expect(res.status).toBe(201);
        expect(res.body.imageUrl).toMatch(/\.png$/); // stored under the detected type
    });

    test('React Native style MIME aliases (image/jpg) are accepted when the bytes really are a JPEG', async () => {
        const { o, shop } = await setup();
        const ok = await upload(o.token, shop._id, f.JPEG, { filename: 'photo.jpg', contentType: 'image/jpg' });
        expect(ok.status).toBe(201);
        // ...but the alias alone is never enough
        const fake = await upload(o.token, shop._id, Buffer.from('not really a jpeg at all'), { filename: 'photo.jpg', contentType: 'image/jpg' });
        expect(fake.status).toBe(400);
        const octet = await upload(o.token, shop._id, f.JPEG, { filename: 'photo.bin', contentType: 'application/octet-stream' });
        expect(octet.status).toBe(400);
    });

    test('oversize files (> 5 MB) are rejected', async () => {
        const { o, shop } = await setup();
        const big = Buffer.concat([f.PNG, Buffer.alloc(5 * 1024 * 1024 + 10, 1)]);
        const res = await upload(o.token, shop._id, big, { filename: 'big.png', contentType: 'image/png' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/too large/);
    });

    test('an unexpected file field is rejected', async () => {
        const { o, shop } = await setup();
        const res = await upload(o.token, shop._id, f.PNG, { field: 'avatar', filename: 'a.png', contentType: 'image/png' });
        expect(res.status).toBe(400);
    });

    test('valid JPEG and PNG uploads are accepted', async () => {
        const { o, shop } = await setup();
        const png = await upload(o.token, shop._id, f.PNG, { filename: 'a.png', contentType: 'image/png' });
        const jpg = await upload(o.token, shop._id, f.JPEG, { filename: 'a.jpg', contentType: 'image/jpeg' });
        expect(png.status).toBe(201);
        expect(jpg.status).toBe(201);
        expect(png.body.imageUrl).toMatch(/^https:\/\/uploads\.test\.invalid\//);
    });

    test('rejected or unauthorized requests never reach image storage, and invalid orders leave no slip behind', async () => {
        const spy = jest.spyOn(storage, 'storeImage');
        const { o, shop } = await setup();
        const intruder = await f.owner(app);

        await upload(o.token, shop._id, Buffer.from('nope'), { filename: 'a.png', contentType: 'image/png' }); // bad signature
        await request(app).post('/api/books').attach('image', f.PNG, { filename: 'a.png', contentType: 'image/png' }); // anonymous
        await upload(intruder.token, shop._id, f.PNG, { filename: 'a.png', contentType: 'image/png' }); // foreign shop
        const buyer = await f.customer(app);
        const { book } = await f.scenario(app);
        await f.placeOrder(app, buyer.token, { book: book._id, quantity: 0 }); // invalid quantity

        expect(spy).not.toHaveBeenCalled();
        expect(await Book.countDocuments({ title: 'T' })).toBe(0);
    });

    test('a missing or unreadable upload on an unauthenticated order is a 401, never a stored file', async () => {
        const spy = jest.spyOn(storage, 'storeImage');
        const { book } = await f.scenario(app);
        const res = await f.placeOrder(app, null, { book: book._id });
        expect(res.status).toBe(401);
        expect(spy).not.toHaveBeenCalled();
    });
});
