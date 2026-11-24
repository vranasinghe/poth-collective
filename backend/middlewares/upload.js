const multer = require('multer');
const { badRequest } = require('../utils/AppError');
const { MAX_IMAGE_BYTES } = require('../config');

// Upload pipeline: multer buffers the file in memory (hard 5 MB cap, 1 file), the declared MIME type
// is checked, and then the actual bytes are checked against the JPEG / PNG file signatures.
// Nothing is sent to image storage here; controllers call storeImage() after validation.

// The declared type is only a first filter: React Native builds it from the file extension, so JPEGs often arrive
// as "image/jpg". The file signature below is what actually decides.
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png'];

const SIGNATURES = [
    { ext: 'jpg', mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
    { ext: 'png', mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }
];

const detectImageType = (buffer) => {
    if (!buffer || buffer.length < 12) return null;
    return SIGNATURES.find((s) => s.bytes.every((b, i) => buffer[i] === b)) || null;
};

const uploader = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 30, fieldSize: 256 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
        cb(badRequest('Only JPG and PNG images are allowed'));
    }
});

const verifySignature = (req, res, next) => {
    if (req.file) {
        const detected = detectImageType(req.file.buffer);
        if (!detected) {
            throw badRequest('Uploaded file is not a valid JPG or PNG image');
        }
        req.file.mimetype = detected.mime;
        req.file.detectedExt = detected.ext;
    }
    next();
};

// Same call shape as before: upload.single('field') used as route middleware.
const upload = {
    single: (field) => [uploader.single(field), verifySignature]
};

module.exports = { upload, detectImageType, ALLOWED_MIME };
