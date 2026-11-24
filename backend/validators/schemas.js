const { z } = require('zod');

// Every schema is an allow-list: unknown keys (owner ids, ratings, timestamps, _id, ...) are stripped
// before a controller sees the body, which is the protection against mass assignment.

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

const trimmed = (label, min, max) =>
    z.string({ error: `${label} is required` })
        .trim()
        .min(min, `${label} is required`)
        .max(max, `${label} must be at most ${max} characters`);

const optionalTrimmed = (label, max) =>
    z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();

const objectId = (label = 'id') =>
    z.string({ error: `${label} is required` }).regex(/^[a-f\d]{24}$/i, `Invalid ${label}`);

const phone = (label = 'Phone number') =>
    z.string({ error: `${label} is required` }).trim().regex(/^\d{10}$/, `${label} must be exactly 10 digits`);

// Multipart forms deliver every field as a string; JSON bodies may send real numbers.
const numberFrom = (label, inner) =>
    z.preprocess((v) => {
        if (typeof v === 'string') return v.trim() === '' ? undefined : Number(v);
        return v;
    }, inner(z.number({ error: `${label} must be a number` }).finite(`${label} must be a number`)));

const PASSWORD_RULE = 'Password must be 9-128 characters and include at least one letter and one number';
const password = z
    .string({ error: 'Password is required' })
    .min(9, PASSWORD_RULE)
    .max(128, PASSWORD_RULE)
    .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), PASSWORD_RULE);

const email = z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .max(254, 'Email is too long')
    .pipe(z.email('Please enter a valid email address'));

// ----------------------------------------------------------------- params
const idParam = z.object({ id: objectId() });
const shopIdParam = z.object({ shopId: objectId('shop id') });
const readerIdParam = z.object({ readerId: objectId('reader id') });
const targetIdParam = z.object({ targetId: objectId('target id') });

// ----------------------------------------------------------------- users
const registerBody = z.object({
    firstName: trimmed('First name', 1, 50),
    lastName: optionalTrimmed('Last name', 50),
    userType: z.enum(['Customer', 'Shop Owner'], { error: 'Invalid user type' }),
    nearestCity: trimmed('Nearest city', 1, 80),
    phoneNumber: phone('Phone number'),
    email,
    password
});

const loginBody = z.object({
    email: z.string({ error: 'Email and password are required' }).trim().min(1, 'Email and password are required').max(254),
    password: z.string({ error: 'Email and password are required' }).min(1, 'Email and password are required').max(128)
});

const updateProfileBody = z
    .object({
        firstName: trimmed('First name', 1, 50).optional(),
        lastName: optionalTrimmed('Last name', 50),
        email: email.optional(),
        password: password.optional(),
        currentPassword: z.string().max(128).optional()
    })
    .refine((b) => !b.password || b.currentPassword, {
        message: 'Current password is required to set a new password',
        path: ['currentPassword']
    });

const demoBody = z.object({ userType: z.enum(['Customer', 'Shop Owner'], { error: 'Invalid user type' }) });

// ----------------------------------------------------------------- shops
const createShopBody = z.object({
    name: trimmed('Shop name', 2, 100),
    description: trimmed('Description', 1, 1000),
    location: trimmed('Location', 1, 100),
    contactNumber: phone('Contact number')
});

// location is immutable after creation (existing product rule)
const updateShopBody = z.object({
    name: trimmed('Shop name', 2, 100).optional(),
    description: trimmed('Description', 1, 1000).optional(),
    contactNumber: phone('Contact number').optional()
});

// ----------------------------------------------------------------- books
const bookFields = {
    title: trimmed('Title', 1, 200),
    author: trimmed('Author', 1, 120),
    description: trimmed('Description', 1, 2000),
    category: trimmed('Category', 1, 60),
    price: numberFrom('Price', (n) => n.min(0, 'Price cannot be negative').max(10_000_000, 'Price is too large')),
    stockCount: numberFrom('Stock count', (n) =>
        n.int('Stock count must be a whole number').min(0, 'Stock count cannot be negative').max(1_000_000, 'Stock count is too large'))
};

const createBookBody = z.object({ ...bookFields, shop: objectId('shop') });

// shop, ratings, review counts and image URL are never client-writable (image only via file upload)
const updateBookBody = z.object({
    expectedStockCount: numberFrom('Original stock count', (n) => n.int().min(0)).optional(),
    title: bookFields.title.optional(),
    author: bookFields.author.optional(),
    description: bookFields.description.optional(),
    category: bookFields.category.optional(),
    price: bookFields.price.optional(),
    stockCount: bookFields.stockCount.optional()
});

// ----------------------------------------------------------------- orders
const deliveryDetails = z.preprocess((v) => {
    if (typeof v === 'string') {
        try {
            return JSON.parse(v);
        } catch {
            return undefined;
        }
    }
    return v;
}, z.object(
    {
        address: trimmed('Delivery address', 1, 200),
        city: trimmed('Delivery city', 1, 80),
        phone: phone('Delivery phone number')
    },
    { error: 'Delivery details are required' }
));

// reader, totalPrice, status and every other field are ignored: the server derives them.
const createOrderBody = z.object({
    quotedUnitPrice: numberFrom('Quoted price', (n) => n.min(0)).optional(),
    book: objectId('book'),
    shop: objectId('shop').optional(),
    quantity: numberFrom('Quantity', (n) =>
        n.int('Quantity must be a whole number').min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100')),
    deliveryDetails
});

const orderStatusBody = z.object({
    status: z.enum(ORDER_STATUSES, { error: 'Invalid status' })
});

const orderDeliveryBody = z.object({ deliveryDetails });

// ----------------------------------------------------------------- reviews
const createReviewBody = z.object({
    targetId: objectId('target'),
    targetModel: z.enum(['Shop', 'Book'], { error: 'Invalid review target' }),
    rating: numberFrom('Rating', (n) => n.int('Rating must be a whole number from 1 to 5').min(1, 'Rating must be from 1 to 5').max(5, 'Rating must be from 1 to 5')),
    comment: trimmed('Comment', 1, 1000)
});

const updateReviewBody = z.object({
    rating: createReviewBody.shape.rating.optional(),
    comment: trimmed('Comment', 1, 1000).optional()
});

// ----------------------------------------------------------------- blogs
const createBlogBody = z.object({
    title: trimmed('Title', 1, 200),
    content: trimmed('Content', 1, 20000),
    penName: optionalTrimmed('Pen name', 80)
});

const updateBlogBody = z.object({
    removeCoverImage: z.enum(['true', 'false']).optional(),
    title: trimmed('Title', 1, 200).optional(),
    content: trimmed('Content', 1, 20000).optional(),
    penName: optionalTrimmed('Pen name', 80)
});

const commentBody = z.object({ text: trimmed('Comment text', 1, 1000) });

// ----------------------------------------------------------------- reports
const createReportBody = z.object({
    title: trimmed('Report title', 1, 150),
    notes: optionalTrimmed('Notes', 2000)
});

module.exports = {
    ORDER_STATUSES,
    idParam, shopIdParam, readerIdParam, targetIdParam,
    registerBody, loginBody, updateProfileBody, demoBody,
    createShopBody, updateShopBody,
    createBookBody, updateBookBody,
    createOrderBody, orderStatusBody, orderDeliveryBody,
    createReviewBody, updateReviewBody,
    createBlogBody, updateBlogBody, commentBody,
    createReportBody
};
