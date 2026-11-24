const dns = require('dns');
// Set DNS servers to resolve MongoDB SRV records (fixes querySrv ECONNREFUSED)
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();

const mongoose = require('mongoose');
const { createApp } = require('./app');
const { startDemoCleanup } = require('./services/demoService');
const { isProduction } = require('./config');

// Fail fast if required configuration is missing
['MONGO_URI', 'JWT_SECRET'].forEach((key) => {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
});

// Warn (never exit, so an existing deployment keeps booting) about weak signing secrets
if (process.env.JWT_SECRET.length < 32) {
    console.warn('JWT_SECRET is shorter than 32 characters. Use a long random value (changing it logs everyone out).');
}
if (process.env.UPLOAD_DRIVER === 'stub' && isProduction()) {
    console.error('UPLOAD_DRIVER=stub is for tests only and is not allowed in production');
    process.exit(1);
}

const app = createApp();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Bind to all interfaces so LAN clients can connect

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('mongoDB Connected Successfully');
        // Demo accounts (and everything they created) are deleted 24 hours after creation
        if (process.env.DEMO_ENABLED !== 'false') startDemoCleanup();
    })
    .catch((err) => {
        if (err.name === 'MongoNetworkTimeoutError') {
            console.error('MongoDB connection timed out. Check Atlas IP whitelist at cloud.mongodb.com -> Security -> Network Access');
        } else {
            console.error('MongoDB connection Error:', err.message);
        }
        process.exit(1);
    });

const server = app.listen(PORT, HOST, () => {
    console.log(`Server is listening on port ${PORT}`);
});

// Graceful shutdown so in-flight requests finish when the platform restarts the container
const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
        mongoose.connection.close(false).finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason && reason.message ? reason.message : reason));
