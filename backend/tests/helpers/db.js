const mongoose = require('mongoose');
const { MongoMemoryReplSet, MongoMemoryServer } = require('mongodb-memory-server');

let replSet = null;

// Hard safety net: tests may only ever talk to a database on this machine.
const assertLocalUri = (uri) => {
    const match = /^mongodb:\/\/([^/?]+)/.exec(uri || '');
    if (!match) throw new Error('Refusing to run tests: unrecognised database URI');
    const hosts = match[1].split(',').map((h) => h.replace(/:\d+$/, ''));
    const local = hosts.every((h) => h === '127.0.0.1' || h === 'localhost' || h === '[::1]');
    if (!local || /mongodb\+srv/.test(uri)) {
        throw new Error('Refusing to run tests against a non-local database');
    }
};

// TEST_DB_MODE=standalone runs against a single mongod WITHOUT a replica set (no transactions), which is how a
// plain local MongoDB behaves. Default is a one-node replica set, which behaves like Atlas.
const STANDALONE = process.env.TEST_DB_MODE === 'standalone';

const startDb = async () => {
    if (STANDALONE) {
        replSet = await MongoMemoryServer.create();
    } else {
        replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    }
    const uri = replSet.getUri('poth_test');
    assertLocalUri(uri);

    // Load every model before connecting so indexes (including unique ones) are built and awaited
    const { createApp } = require('../../app');
    const app = createApp({ rateLimits: false });
    await mongoose.connect(uri);
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

    const tx = require('../../services/transaction');
    tx.__resetDetection();
    return app;
};

const clearDb = async () => {
    await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
};

const stopDb = async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
    replSet = null;
};

module.exports = { startDb, clearDb, stopDb, assertLocalUri };
