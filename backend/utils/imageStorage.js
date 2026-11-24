const crypto = require('crypto');
const { AppError } = require('./AppError');
const { isProduction } = require('../config');

// Persists a validated upload and returns its public URL.
// Controllers call this only AFTER request validation and authorization have passed, so rejected
// requests never create files in image storage.
//
// Drivers (UPLOAD_DRIVER):
//   cloudinary (default)  upload to Cloudinary folder "poth_uploads"
//   stub                  TEST ONLY: deterministic fake URL, no network. Refused in production.
const storeImage = async (file) => {
    if (!file) return null;

    const driver = process.env.UPLOAD_DRIVER || 'cloudinary';

    if (driver === 'stub') {
        if (isProduction()) throw new Error('UPLOAD_DRIVER=stub is not allowed in production');
        const hash = crypto.createHash('sha1').update(file.buffer).digest('hex').slice(0, 16);
        return `https://uploads.test.invalid/poth_uploads/${hash}.${file.detectedExt}`;
    }

    const { configure } = require('./cloudinaryConfig');
    const cloudinary = configure();
    try {
        return await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'poth_uploads', resource_type: 'image', allowed_formats: ['jpg', 'jpeg', 'png'] },
                (err, result) => (err ? reject(err) : resolve(result.secure_url))
            );
            stream.end(file.buffer);
        });
    } catch (err) {
        console.error('Image storage failed:', err.message);
        throw new AppError(502, 'Image storage is temporarily unavailable');
    }
};

module.exports = { storeImage };
