const cloudinary = require('cloudinary').v2;

// Credentials come from the environment only (CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET).
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Re-read credentials lazily: dotenv may load after this module is first required.
const configure = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    return cloudinary;
};

module.exports = { cloudinary, configure };
