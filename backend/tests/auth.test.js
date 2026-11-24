const request = require('supertest');
const jwt = require('jsonwebtoken');
const { startDb, clearDb, stopDb } = require('./helpers/db');
const f = require('./helpers/factory');
const User = require('../models/userModel');
const { createApp } = require('../app');

let app;
beforeAll(async () => { app = await startDb(); });
afterAll(stopDb);
beforeEach(clearDb);
afterEach(() => jest.restoreAllMocks());

const SECRET = () => process.env.JWT_SECRET;
const body = (over = {}) => ({
    firstName: 'Nimal', lastName: 'Perera', userType: 'Customer', nearestCity: 'Kandy',
    phoneNumber: '0771234567', email: `nimal-${Math.random().toString(36).slice(2)}@example.test`, password: 'Sup3rSecret99', ...over
});

describe('registration', () => {
    test('a valid sign-up returns 201 and a token that works', async () => {
        const res = await request(app).post('/api/users/register').send(body());
        expect(res.status).toBe(201);
        expect(res.body.token).toBeTruthy();
        expect(res.body.password).toBeUndefined();
        const me = await request(app).get(`/api/orders/reader/${res.body._id}`).set(f.bearer(res.body.token));
        expect(me.status).toBe(200);
    });

    test.each([
        ['too short', 'Ab1'],
        ['exactly 8 characters', 'Abcdefg1'],
        ['no digit', 'abcdefghijk'],
        ['no letter', '123456789012'],
        ['over 128 characters', 'a1'.repeat(70)]
    ])('weak password (%s) is rejected', async (_n, password) => {
        const res = await request(app).post('/api/users/register').send(body({ password }));
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Password must be 9-128 characters/);
        expect(await User.countDocuments()).toBe(0);
    });

    test('email is normalised and duplicates (any casing) are refused with 409', async () => {
        const email = 'Mixed.Case@Example.TEST';
        const first = await request(app).post('/api/users/register').send(body({ email }));
        expect(first.status).toBe(201);
        expect(first.body.email).toBe('mixed.case@example.test');
        const dup = await request(app).post('/api/users/register').send(body({ email: 'MIXED.CASE@example.test' }));
        expect(dup.status).toBe(409);
        const login = await request(app).post('/api/users/login').send({ email: 'MIXED.case@EXAMPLE.test', password: 'Sup3rSecret99' });
        expect(login.status).toBe(200);
    });

    test.each([
        ['unknown role', { userType: 'Admin' }],
        ['bad email', { email: 'not-an-email' }],
        ['bad phone', { phoneNumber: '12345' }],
        ['empty first name', { firstName: '   ' }],
        ['object instead of string (operator injection)', { email: { $gt: '' } }],
        ['array instead of string', { firstName: ['a', 'b'] }]
    ])('invalid input is rejected: %s', async (_n, over) => {
        const res = await request(app).post('/api/users/register').send(body(over));
        expect(res.status).toBe(400);
    });

    test('internal fields in the body are ignored (no self-promotion to demo, no pre-deleted account)', async () => {
        const res = await request(app).post('/api/users/register').send(body({ isDemo: true, demoExpiresAt: '2099-01-01', deletedAt: '2020-01-01', passwordChangedAt: '2099-01-01', _id: '000000000000000000000001' }));
        expect(res.status).toBe(201);
        const user = await User.findById(res.body._id);
        expect(user.isDemo).toBe(false);
        expect(user.deletedAt).toBeNull();
        expect(user.passwordChangedAt).toBeNull();
        expect(String(user._id)).not.toBe('000000000000000000000001');
    });

    test('the password is stored as a bcrypt hash', async () => {
        const res = await request(app).post('/api/users/register').send(body());
        const user = await User.findById(res.body._id);
        expect(user.password).not.toContain('Sup3rSecret99');
        expect(user.password).toMatch(/^\$2[aby]\$/);
    });
});

describe('login', () => {
    test('wrong password and unknown email give the same answer', async () => {
        const u = await f.customer(app);
        const wrong = await request(app).post('/api/users/login').send({ email: u.email, password: 'WrongPass123' });
        const unknown = await request(app).post('/api/users/login').send({ email: 'nobody@example.test', password: 'WrongPass123' });
        expect(wrong.status).toBe(401);
        expect(unknown.status).toBe(401);
        expect(wrong.body).toEqual(unknown.body);
    });

    test('operator-injection payloads are rejected, not interpreted', async () => {
        await f.customer(app);
        for (const payload of [
            { email: { $gt: '' }, password: 'x' },
            { email: { $ne: null }, password: { $ne: null } },
            { email: 'a@b.c', password: { $gt: '' } }
        ]) {
            const res = await request(app).post('/api/users/login').send(payload);
            expect([400, 401]).toContain(res.status);
            expect(res.body.token).toBeUndefined();
        }
    });

    test('nothing sensitive is written to the logs during sign-up, login or failed login', async () => {
        const out = [];
        for (const m of ['log', 'info', 'warn', 'error', 'debug']) {
            jest.spyOn(console, m).mockImplementation((...args) => out.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')));
        }
        const email = 'logcheck@example.test';
        const password = 'Sup3rSecret99';
        const reg = await request(app).post('/api/users/register').send(body({ email, password }));
        await request(app).post('/api/users/login').send({ email, password });
        await request(app).post('/api/users/login').send({ email, password: 'Wrong123Wrong' });
        await request(app).post('/api/users/login').send({ email: 'ghost@example.test', password: 'Wrong123Wrong' });

        const logged = out.join('\n');
        for (const secret of [password, 'Wrong123Wrong', email, 'ghost@example.test', reg.body.token]) {
            expect(logged).not.toContain(secret);
        }
    });
});

describe('token and account state', () => {
    test('an expired token is rejected', async () => {
        const u = await f.customer(app);
        const token = jwt.sign({ id: u.id }, SECRET(), { expiresIn: -10 });
        const res = await request(app).get(`/api/orders/reader/${u.id}`).set(f.bearer(token));
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/expired/i);
    });

    test('tokens with a wrong secret, tampered payload or alg=none are rejected', async () => {
        const u = await f.customer(app);
        const wrongSecret = jwt.sign({ id: u.id }, 'some-other-secret', { expiresIn: '1h' });
        const [h, p, s] = u.token.split('.');
        const forgedPayload = Buffer.from(JSON.stringify({ id: '000000000000000000000001', iat: 1, exp: 9999999999 })).toString('base64url');
        const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ id: u.id })).toString('base64url')}.`;
        for (const token of [wrongSecret, `${h}.${forgedPayload}.${s}`, none]) {
            const res = await request(app).get(`/api/orders/reader/${u.id}`).set(f.bearer(token));
            expect(res.status).toBe(401);
        }
    });

    test('a valid token for a user that does not exist is a clean 401 (not a 500)', async () => {
        const ghost = jwt.sign({ id: '000000000000000000000001' }, SECRET(), { expiresIn: '1h' });
        const res = await request(app).get('/api/orders/reader/000000000000000000000001').set(f.bearer(ghost));
        expect(res.status).toBe(401);
    });

    test('a token whose subject is not a valid id is a 401', async () => {
        const bad = jwt.sign({ id: { $ne: null } }, SECRET(), { expiresIn: '1h' });
        expect((await request(app).get('/api/orders/reader/000000000000000000000001').set(f.bearer(bad))).status).toBe(401);
        const bad2 = jwt.sign({ id: 'not-an-object-id' }, SECRET(), { expiresIn: '1h' });
        expect((await request(app).get('/api/orders/reader/000000000000000000000001').set(f.bearer(bad2))).status).toBe(401);
    });

    test('changing the password revokes older tokens; the new token and new password work', async () => {
        const u = await f.customer(app);
        await new Promise((r) => setTimeout(r, 1100)); // iat has one-second resolution
        const res = await request(app).put('/api/users/profile').set(f.bearer(u.token))
            .send({ currentPassword: u.password, password: 'BrandNew456pass' });
        expect(res.status).toBe(200);

        const old = await request(app).get(`/api/orders/reader/${u.id}`).set(f.bearer(u.token));
        expect(old.status).toBe(401);
        const fresh = await request(app).get(`/api/orders/reader/${u.id}`).set(f.bearer(res.body.token));
        expect(fresh.status).toBe(200);
        expect((await request(app).post('/api/users/login').send({ email: u.email, password: u.password })).status).toBe(401);
        expect((await request(app).post('/api/users/login').send({ email: u.email, password: 'BrandNew456pass' })).status).toBe(200);
    });

    test('a password change needs the current password and obeys the password policy', async () => {
        const u = await f.customer(app);
        const missing = await request(app).put('/api/users/profile').set(f.bearer(u.token)).send({ password: 'BrandNew456pass' });
        expect(missing.status).toBe(400);
        const wrong = await request(app).put('/api/users/profile').set(f.bearer(u.token)).send({ currentPassword: 'Nope123Nope', password: 'BrandNew456pass' });
        expect(wrong.status).toBe(403);
        const weak = await request(app).put('/api/users/profile').set(f.bearer(u.token)).send({ currentPassword: u.password, password: 'weak' });
        expect(weak.status).toBe(400);
    });

    test('profile updates ignore role changes and reject duplicate emails', async () => {
        const a = await f.customer(app);
        const b = await f.customer(app);
        const res = await request(app).put('/api/users/profile').set(f.bearer(a.token))
            .send({ firstName: 'Renamed', userType: 'Shop Owner', isDemo: true, deletedAt: null });
        expect(res.status).toBe(200);
        const user = await User.findById(a.id);
        expect(user.firstName).toBe('Renamed');
        expect(user.userType).toBe('Customer');
        expect(user.isDemo).toBe(false);

        const dup = await request(app).put('/api/users/profile').set(f.bearer(a.token)).send({ email: b.email });
        expect(dup.status).toBe(409);
    });

    test('an expired demo session is rejected', async () => {
        const u = await f.customer(app);
        await User.updateOne({ _id: u.id }, { isDemo: true, demoExpiresAt: new Date(Date.now() - 1000) });
        const res = await request(app).get(`/api/orders/reader/${u.id}`).set(f.bearer(u.token));
        expect(res.status).toBe(401);
    });
});

describe('CORS', () => {
    test('a configured trusted origin is allowed and echoed', async () => {
        const res = await request(app).get('/health').set('Origin', 'https://trusted.example');
        expect(res.headers['access-control-allow-origin']).toBe('https://trusted.example');
    });

    test('the original project origin is not implicitly trusted by the standalone showcase', async () => {
        const res = await request(app).get('/health').set('Origin', 'https://poth-bookcommunityservice.netlify.app');
        expect(res.status).toBe(403);
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('an unknown origin is refused with 403 and gets no CORS headers', async () => {
        const res = await request(app).get('/health').set('Origin', 'https://evil.example');
        expect(res.status).toBe(403);
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('a preflight from an unknown origin is refused', async () => {
        const res = await request(app).options('/api/orders').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
        expect(res.status).toBe(403);
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('a wildcard in CORS_ORIGINS is never honoured, and localhost is refused in production', async () => {
        const prevOrigins = process.env.CORS_ORIGINS;
        const prevEnv = process.env.NODE_ENV;
        try {
            process.env.CORS_ORIGINS = '*,https://trusted.example';
            const star = await request(app).get('/health').set('Origin', 'https://anything.example');
            expect(star.status).toBe(403);

            process.env.NODE_ENV = 'production';
            const local = await request(app).get('/health').set('Origin', 'http://localhost:8081');
            expect(local.status).toBe(403);
        } finally {
            process.env.CORS_ORIGINS = prevOrigins;
            process.env.NODE_ENV = prevEnv;
        }
    });

    test('requests without an Origin header (native apps, curl) are not blocked by CORS', async () => {
        expect((await request(app).get('/health')).status).toBe(200);
    });
});

describe('authentication rate limits', () => {
    test('repeated failed logins for one account are throttled; other accounts and successes are unaffected', async () => {
        const limited = createApp({ rateLimits: { loginAccount: { limit: 3 }, loginIp: { limit: 50 } } });
        const u = await f.customer(limited);
        const other = await f.customer(limited);

        for (let i = 0; i < 3; i += 1) {
            const r = await request(limited).post('/api/users/login').send({ email: u.email, password: 'Wrong123Wrong' });
            expect(r.status).toBe(401);
        }
        const blocked = await request(limited).post('/api/users/login').send({ email: u.email, password: 'Wrong123Wrong' });
        expect(blocked.status).toBe(429);
        // even the right password is held back for the throttled account
        expect((await request(limited).post('/api/users/login').send({ email: u.email, password: u.password })).status).toBe(429);
        // another account from the same address is fine
        expect((await request(limited).post('/api/users/login').send({ email: other.email, password: other.password })).status).toBe(200);
    });

    test('successful logins do not consume the failure budget', async () => {
        const limited = createApp({ rateLimits: { loginAccount: { limit: 2 }, loginIp: { limit: 50 } } });
        const u = await f.customer(limited);
        for (let i = 0; i < 6; i += 1) {
            expect((await request(limited).post('/api/users/login').send({ email: u.email, password: u.password })).status).toBe(200);
        }
    });

    test('sign-ups are throttled per address', async () => {
        const limited = createApp({ rateLimits: { register: { limit: 2 } } });
        await request(limited).post('/api/users/register').send(body());
        await request(limited).post('/api/users/register').send(body());
        const third = await request(limited).post('/api/users/register').send(body());
        expect(third.status).toBe(429);
        expect(third.body.message).toMatch(/Too many/);
    });
});
