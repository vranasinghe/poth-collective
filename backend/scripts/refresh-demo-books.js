// Preview by default. --apply upgrades only unchanged, unreferenced legacy demo fixtures.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Shop = require('../models/shopModel');
const Book = require('../models/bookModel');
const Order = require('../models/orderModel');
const Review = require('../models/reviewModel');
const samples = require('../data/sampleBooks');

const legacy = [
    { title: 'The Island of Lost Pages', author: 'A. Perera', category: 'Fiction', description: 'A sample novel for exploring the demo shop.' },
    { title: 'Spice Route Cooking', author: 'N. Silva', category: 'Cooking', description: 'A sample cookbook for exploring the demo shop.' },
    { title: 'Learning Sinhala Quickly', author: 'K. Fernando', category: 'Education', description: 'A sample language guide for exploring the demo shop.' },
    { title: 'Monsoon Poems', author: 'S. Jayawardena', category: 'Poetry', description: 'A sample poetry collection for exploring the demo shop.' }
];

async function run() {
    const apply = process.argv.includes('--apply');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    try {
        const owners = await User.find({ isDemo: true, userType: 'Shop Owner' }).select('_id');
        const shops = await Shop.find({ shopOwner: { $in: owners.map((u) => u._id) } }).select('_id');
        let eligible = 0;
        let updated = 0;
        for (const [index, old] of legacy.entries()) {
            const sample = samples[index];
            const filter = {
                ...old,
                shop: { $in: shops.map((shop) => shop._id) },
                price: sample.price,
                stockCount: sample.stockCount,
                numReviews: 0,
                averageRating: 0,
                $or: [{ imageUrl: 'https://via.placeholder.com/150' }, { imageUrl: '' }, { imageUrl: null }]
            };
            const books = await Book.find(filter).select('_id updatedAt');
            for (const book of books) {
                const [order, review] = await Promise.all([
                    Order.exists({ book: book._id }),
                    Review.exists({ targetId: book._id, targetModel: 'Book' })
                ]);
                if (order || review) continue;
                eligible++;
                if (apply) {
                    // Recheck the original fields and timestamp to avoid overwriting an intervening edit.
                    const result = await Book.updateOne(
                        { ...filter, _id: book._id, updatedAt: book.updatedAt },
                        { $set: sample },
                        { runValidators: true }
                    );
                    updated += result.modifiedCount;
                }
                console.log(`${apply ? 'Upgrade' : 'Preview'}: ${old.title} -> ${sample.title}`);
            }
        }
        console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', eligible, updated }));
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((error) => {
    // Do not print database connection strings or credentials on connection failures.
    console.error(`Demo refresh failed (${error.name}). Check database connectivity and configuration.`);
    process.exitCode = 1;
});
