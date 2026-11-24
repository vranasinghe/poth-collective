const { badRequest } = require('./AppError');
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const text = (value, name) => {
    if (value === undefined) return '';
    if (typeof value !== 'string' || value.length > 160) throw badRequest(`Invalid ${name}`);
    return value.trim();
};
const number = (value, name, fallback, max = Number.MAX_SAFE_INTEGER) => {
    if (value === undefined || value === '') return fallback;
    if (typeof value !== 'string' || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > max) throw badRequest(`Invalid ${name}`);
    return Number(value);
};
function catalogueQuery(query, kind = 'book') {
    const filter = { archivedAt: null };
    const q = text(query.q, 'search');
    if (q) filter.$or = (kind === 'book' ? ['title', 'author'] : ['name', 'location']).map((field) => ({ [field]: { $regex: escapeRegex(q), $options: 'i' } }));
    if (kind === 'book') {
        const category = text(query.category, 'genre');
        if (category) filter.category = category;
        const min = number(query.minPrice, 'minimum price', undefined);
        const max = number(query.maxPrice, 'maximum price', undefined);
        if (min !== undefined && max !== undefined && min > max) throw badRequest('Minimum price must not exceed maximum price');
        if (min !== undefined || max !== undefined) filter.price = { ...(min !== undefined ? { $gte: min } : {}), ...(max !== undefined ? { $lte: max } : {}) };
        if (query.inStock !== undefined && !['true', 'false'].includes(query.inStock)) throw badRequest('Invalid stock filter');
        if (query.inStock === 'true') filter.stockCount = { $gt: 0 };
        const shop = text(query.shop, 'shop');
        if (shop) {
            if (!/^[a-f\d]{24}$/i.test(shop)) throw badRequest('Invalid shop');
            filter.shop = shop;
        }
    } else {
        const location = text(query.location, 'location');
        if (location) filter.location = location;
    }
    const sorts = { title: { title: 1 }, 'price-asc': { price: 1 }, 'price-desc': { price: -1 }, rating: { averageRating: -1, numReviews: -1 }, newest: { createdAt: -1 }, name: { name: 1 } };
    const sort = text(query.sort, 'sort') || (kind === 'book' ? 'title' : 'name');
    if (!(sort in sorts) || !(kind === 'book' ? ['title', 'price-asc', 'price-desc', 'rating', 'newest'] : ['name', 'rating']).includes(sort)) throw badRequest('Invalid sort');
    const page = number(query.page, 'page', 1, 10000);
    const limit = number(query.limit, 'limit', 20, 60);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) throw badRequest('Page and limit must be positive whole numbers');
    return { filter, sort: { ...sorts[sort], _id: 1 }, page, limit };
}
module.exports = { catalogueQuery };
