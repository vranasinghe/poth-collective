// Test environment. This file never loads dotenv, so backend/.env (and any real MONGO_URI) is unreachable.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-0123456789abcdef0123456789abcdef';
process.env.UPLOAD_DRIVER = 'stub'; // no network calls to Cloudinary
process.env.DEMO_ENABLED = 'false';
process.env.CORS_ORIGINS = 'https://trusted.example';

// Deliberately discard any database URI inherited from the shell or CI. Tests create their own
// in-memory server (tests/helpers/db.js) and set the URI themselves.
delete process.env.MONGO_URI;
delete process.env.CLOUDINARY_API_SECRET;
delete process.env.CLOUDINARY_API_KEY;
delete process.env.CLOUDINARY_CLOUD_NAME;
