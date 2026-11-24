const Book = require('../models/bookModel');
const Shop = require('../models/shopModel');
const Order = require('../models/orderModel');
const { catalogueQuery } = require('../utils/catalogueQuery');
const { badRequest, forbidden, notFound } = require('../utils/AppError');
const { TRANSITIONS } = require('../services/orderService');
const LOW_STOCK = 5;
const idPattern = /^[a-f\d]{24}$/i;

// Resolve every scope from authenticated ownership, never from client-supplied owner IDs.
async function ownerScope(req, includeArchived = false) {
 const shops = await Shop.find({ shopOwner: req.user._id, ...(includeArchived ? {} : { archivedAt: null }) }).select('name location imageUrl description contactNumber archivedAt');
 const chosen = req.query.shop;
 if (chosen !== undefined && (typeof chosen !== 'string' || (chosen !== '' && !idPattern.test(chosen)))) throw badRequest('Invalid shop');
 if (chosen && !shops.some(s => String(s._id) === chosen)) throw forbidden('This shop is not in your account');
 return { shops, ids: shops.filter(s => !chosen || String(s._id) === chosen).map(s => s._id) };
}
const withActions = order => ({ ...(order.toObject ? order.toObject() : order), allowedStatuses: TRANSITIONS[order.status] || [] });

async function summary(req, res) {
 const { shops, ids } = await ownerScope(req, true);
 const activeIds = shops.filter(s => !s.archivedAt).filter(s => !req.query.shop || String(s._id) === req.query.shop).map(s => s._id);
 const inventoryFilter = { shop: { $in: activeIds }, archivedAt: null };
 const [inventory, statusRows, categories, attention, recent] = await Promise.all([
  Book.aggregate([{ $match: inventoryFilter }, { $group: { _id: null, activeBooks: { $sum: 1 }, units: { $sum: '$stockCount' }, outOfStock: { $sum: { $cond: [{ $eq: ['$stockCount', 0] }, 1, 0] } }, lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stockCount', 0] }, { $lte: ['$stockCount', LOW_STOCK] }] }, 1, 0] } } } }]),
  Order.aggregate([{ $match: { shop: { $in: ids } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  Book.aggregate([{ $match: inventoryFilter }, { $group: { _id: '$category', books: { $sum: 1 }, units: { $sum: '$stockCount' } } }, { $sort: { books: -1, _id: 1 } }]),
  Book.find({ ...inventoryFilter, stockCount: { $lte: LOW_STOCK } }).sort({ stockCount: 1, title: 1 }).limit(6).populate('shop','name'),
  Order.find({ shop: { $in: ids }, shopArchived: { $ne: true } }).sort({ updatedAt: -1, _id: -1 }).limit(5).populate('book','title author imageUrl').populate('reader','firstName lastName').populate('shop','name')
 ]);
 const statusCounts = Object.fromEntries(Object.keys(TRANSITIONS).map(s => [s, 0]));
 for (const row of statusRows) statusCounts[row._id] = row.count;
 res.json({ shops: shops.filter(s => !s.archivedAt), archivedShopCount: shops.filter(s => s.archivedAt).length, inventory: inventory[0] || { activeBooks: 0, units: 0, outOfStock: 0, lowStock: 0 }, statusCounts, categories: categories.map(c => ({ category: c._id, books: c.books, units: c.units })), attention, recentOrders: recent.map(withActions), lowStockThreshold: LOW_STOCK, generatedAt: new Date().toISOString() });
}
async function inventory(req, res) {
 const { ids } = await ownerScope(req);
 const { filter, sort, page, limit } = catalogueQuery({ ...req.query, page: req.query.page || '1', sort: req.query.sort === 'stock' ? 'title' : req.query.sort });
 filter.shop = { $in: ids };
 const stock = req.query.stock || 'all';
 if (!['all','low','out','in','attention'].includes(stock)) throw badRequest('Invalid stock filter');
 if (stock === 'low') filter.stockCount = { $gt: 0, $lte: LOW_STOCK };
 if (stock === 'out') filter.stockCount = 0;
 if (stock === 'in') filter.stockCount = { $gt: 0 };
 if (stock === 'attention') filter.stockCount = { $lte: LOW_STOCK };
 const [items, total, categories] = await Promise.all([
  Book.find(filter).sort(req.query.sort === 'stock' ? { stockCount: 1, title: 1, _id: 1 } : sort).skip((page-1)*limit).limit(limit).populate('shop','name'),
  Book.countDocuments(filter), Book.distinct('category', { shop: { $in: ids }, archivedAt: null })
 ]);
 res.json({ items, total, page, pages: Math.ceil(total/limit), categories: categories.sort(), lowStockThreshold: LOW_STOCK });
}
async function inventoryItem(req, res) {
 if (!idPattern.test(req.params.id)) throw badRequest('Invalid book');
 const { ids } = await ownerScope(req);
 const book = await Book.findOne({ _id: req.params.id, shop: { $in: ids }, archivedAt: null }).populate('shop','name');
 if (!book) throw notFound('Book not found in your inventory');
 res.json(book);
}
async function orders(req, res) {
 const { ids } = await ownerScope(req, true);
 const { page, limit } = catalogueQuery({ page: req.query.page || '1', limit: req.query.limit });
 const filter = { shop: { $in: ids }, shopArchived: { $ne: true } };
 if (req.query.status && req.query.status !== 'All') {
  if (typeof req.query.status !== 'string' || !Object.keys(TRANSITIONS).includes(req.query.status)) throw badRequest('Invalid order status');
  filter.status = req.query.status;
 }
 const [items,total] = await Promise.all([
  Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page-1)*limit).limit(limit).populate('book','title author imageUrl').populate('reader','firstName lastName email phoneNumber').populate('shop','name location'),
  Order.countDocuments(filter)
 ]);
 res.json({ items: items.map(withActions), total, page, pages: Math.ceil(total/limit) });
}
async function orderDetail(req,res) {
 if (!idPattern.test(req.params.id)) throw badRequest('Invalid order');
 const { ids } = await ownerScope(req, true);
 const order = await Order.findOne({ _id: req.params.id, shop: { $in: ids } }).populate('book','title author imageUrl').populate('reader','firstName lastName email phoneNumber').populate('shop','name location');
 if (!order) throw notFound('Order not found in your shops');
 res.json(withActions(order));
}
module.exports = { summary, inventory, inventoryItem, orders, orderDetail };
