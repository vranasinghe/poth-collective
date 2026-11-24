const request = require('supertest');

// Smallest valid files for each accepted format (real signatures, not real pictures)
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64'
);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9]);

const PASSWORD = 'Password123';
let counter = 0;
const unique = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const registerUser = async (app, overrides = {}) => {
    const id = unique();
    const body = {
        firstName: 'Test',
        lastName: 'User',
        userType: 'Customer',
        nearestCity: 'Colombo',
        phoneNumber: '0771234567',
        email: `user-${id}@example.test`,
        password: PASSWORD,
        ...overrides
    };
    const res = await request(app).post('/api/users/register').send(body);
    if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
    return { id: res.body._id, token: res.body.token, email: body.email, password: body.password, body: res.body };
};

const customer = (app, o = {}) => registerUser(app, { userType: 'Customer', ...o });
const owner = (app, o = {}) => registerUser(app, { userType: 'Shop Owner', ...o });

const createShop = async (app, token, overrides = {}) => {
    const res = await request(app)
        .post('/api/shops')
        .set(bearer(token))
        .field('name', overrides.name || `Shop ${unique()}`)
        .field('description', 'A test shop')
        .field('location', 'Colombo')
        .field('contactNumber', '0112223334');
    if (res.status !== 201) throw new Error(`createShop failed: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body;
};

const createBook = async (app, token, shopId, overrides = {}) => {
    const res = await request(app)
        .post('/api/books')
        .set(bearer(token))
        .field('title', overrides.title || `Book ${unique()}`)
        .field('author', 'Some Author')
        .field('description', 'A test book')
        .field('price', String(overrides.price ?? 1000))
        .field('category', 'Fiction')
        .field('stockCount', String(overrides.stockCount ?? 10))
        .field('shop', shopId);
    if (res.status !== 201) throw new Error(`createBook failed: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body;
};

const DELIVERY = { address: '12 Test Road', city: 'Colombo', phone: '0771234567' };

// Places an order the way the app does (multipart with a payment slip). `extra` fields are sent too, so
// tests can attempt price/reader tampering.
const placeOrder = (app, token, { book, quantity = 1, shop, extra = {}, delivery = DELIVERY, slip = PNG } = {}) => {
    let req = request(app).post('/api/orders');
    if (token) req = req.set(bearer(token));
    req = req.field('book', book).field('quantity', String(quantity)).field('deliveryDetails', JSON.stringify(delivery));
    if (shop) req = req.field('shop', shop);
    for (const [k, v] of Object.entries(extra)) req = req.field(k, String(v));
    if (slip) req = req.attach('paymentSlip', slip, { filename: 'slip.png', contentType: 'image/png' });
    return req;
};

const setStatus = (app, token, orderId, status) =>
    request(app).put(`/api/orders/${orderId}/status`).set(bearer(token)).send({ status });

// A marketplace with one owner, one shop and one stocked book
const scenario = async (app, { stockCount = 10, price = 1000 } = {}) => {
    const shopOwner = await owner(app);
    const shop = await createShop(app, shopOwner.token);
    const book = await createBook(app, shopOwner.token, shop._id, { stockCount, price });
    return { shopOwner, shop, book };
};

module.exports = {
    PNG, JPEG, PASSWORD, DELIVERY, bearer, registerUser, customer, owner,
    createShop, createBook, placeOrder, setStatus, scenario
};
