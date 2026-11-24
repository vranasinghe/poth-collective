const Order = require('../models/orderModel');
const Book = require('../models/bookModel');
const { runInTransaction } = require('./transaction');
const { conflict } = require('../utils/AppError');

// Legal order lifecycle. Delivered and Cancelled are terminal.
//   Pending   -> Confirmed | Cancelled
//   Confirmed -> Shipped   | Cancelled
//   Shipped   -> Delivered
const TRANSITIONS = {
    Pending: ['Confirmed', 'Cancelled'],
    Confirmed: ['Shipped', 'Cancelled'],
    Shipped: ['Delivered'],
    Delivered: [],
    Cancelled: []
};

// Orders whose goods are still committed (stock reserved or in transit)
const OPEN_STATUSES = ['Pending', 'Confirmed', 'Shipped'];

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

const money = (n) => Math.round(n * 100) / 100;

// Reserves stock and creates the order as one unit.
//   Reservation is a conditional atomic update (stockCount >= quantity), so concurrent buyers can never
//   push stock below zero. The price is read from the same document that was just reserved, so it always
//   comes from the server, never from the client.
//   With a replica set both writes are in one transaction. On a standalone server (no transactions) a
//   failed order insert is compensated by returning the reserved stock.
const reserveAndCreateOrder = ({ readerId, bookId, quantity, delivery, slipUrl, quotedUnitPrice }) =>
    runInTransaction(async (session) => {
        const opts = session ? { session } : {};

        const book = await Book.findOneAndUpdate(
            { _id: bookId, archivedAt: null, stockCount: { $gte: quantity }, ...(quotedUnitPrice !== undefined ? { price: quotedUnitPrice } : {}) },
            { $inc: { stockCount: -quantity } },
            { new: true, ...opts }
        );
        if (!book) throw conflict('Price or stock changed. Refresh your checkout and try again.');

        try {
            const [order] = await Order.create(
                [{
                    reader: readerId,
                    shop: book.shop,
                    book: book._id,
                    quantity,
                    totalPrice: money(book.price * quantity),
                    deliveryDetails: delivery,
                    paymentSlipUrl: slipUrl
                }],
                opts
            );
            return order;
        } catch (err) {
            if (!session) {
                await Book.updateOne({ _id: bookId }, { $inc: { stockCount: quantity } });
            }
            throw err;
        }
    });

// Moves an order to a new status. Compare-and-swap on the current status means that when several
// requests race (double tap, retry, two browsers), exactly one wins and the others get 409. Stock is
// returned only by the winner of a transition to Cancelled, so it can never be restored twice.
const transitionOrder = (order, to) =>
    runInTransaction(async (session) => {
        const opts = session ? { session } : {};

        const updated = await Order.findOneAndUpdate(
            { _id: order._id, status: order.status },
            { $set: { status: to } },
            { new: true, ...opts }
        );
        if (!updated) throw conflict('This order was just updated, please refresh and try again');

        if (to === 'Cancelled') {
            await Book.updateOne({ _id: updated.book }, { $inc: { stockCount: updated.quantity } }, opts);
        }
        return updated;
    });

module.exports = {
    TRANSITIONS,
    OPEN_STATUSES,
    canTransition,
    reserveAndCreateOrder,
    transitionOrder
};
