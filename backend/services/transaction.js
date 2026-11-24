const mongoose = require('mongoose');

// Multi-document transactions need a replica set (MongoDB Atlas, including the free tier, is one).
// A standalone mongod rejects them. This helper detects the deployment once per connection:
//   - replica set / sharded cluster: fn runs inside session.withTransaction (retried on transient errors)
//   - standalone:                    fn runs with session = null
// Callers must therefore be written to stay correct WITHOUT a transaction as well (conditional atomic
// updates plus compensation); the transaction closes the remaining crash windows when available.

let supported = null;

const detect = async () => {
    try {
        const hello = await mongoose.connection.db.admin().command({ hello: 1 });
        supported = Boolean(hello.setName || hello.msg === 'isdbgrid');
    } catch {
        supported = false;
    }
    return supported;
};

const transactionsSupported = async () => (supported === null ? detect() : supported);

const runInTransaction = async (fn) => {
    if (!(await transactionsSupported())) return fn(null);

    const session = await mongoose.startSession();
    try {
        let result;
        // fn may run more than once if MongoDB reports a transient transaction error; it must only
        // touch the database through the session it is given.
        await session.withTransaction(async () => {
            result = await fn(session);
        });
        return result;
    } finally {
        await session.endSession();
    }
};

// Test hooks
const __setSupportForTests = (value) => {
    supported = value;
};
const __resetDetection = () => {
    supported = null;
};

module.exports = { runInTransaction, transactionsSupported, __setSupportForTests, __resetDetection };
