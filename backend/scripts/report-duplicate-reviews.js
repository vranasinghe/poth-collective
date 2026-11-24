// READ-ONLY report of duplicate reviews (same user, same target). Run this BEFORE deploying the unique
// review index (reviewModel.js) to a database that already holds data: MongoDB cannot build a unique index
// while duplicates exist, so the index would silently fail to appear (the API still rejects new duplicates).
//
//   node scripts/report-duplicate-reviews.js
//
// It connects with MONGO_URI from backend/.env, prints the database host and name (never credentials),
// performs one aggregation, and writes nothing. Resolve duplicates manually (keep the newest) before relying
// on the index.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

(async () => {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    const { host, name } = mongoose.connection;
    console.log(`Connected (read-only) to ${host}/${name}`);

    const dupes = await mongoose.connection.db.collection('reviews').aggregate([
        { $group: { _id: { user: '$user', targetModel: '$targetModel', targetId: '$targetId' }, count: { $sum: 1 }, ids: { $push: '$_id' }, newest: { $max: '$createdAt' } } },
        { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (!dupes.length) {
        console.log('No duplicate reviews found. The unique index can be built safely.');
    } else {
        console.log(`${dupes.length} duplicated (user, target) pair(s):`);
        for (const d of dupes) {
            console.log(` user=${d._id.user} ${d._id.targetModel}=${d._id.targetId} count=${d.count} newest=${d.newest && d.newest.toISOString()} ids=${d.ids.join(',')}`);
        }
        console.log('No changes were made.');
    }
    await mongoose.disconnect();
})().catch((err) => {
    console.error('Report failed:', err.message);
    process.exit(1);
});
