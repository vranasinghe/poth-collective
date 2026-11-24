// An error whose message is safe to show to API clients.
class AppError extends Error {
    constructor(status, message, details) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        if (details) this.details = details;
    }
}

const badRequest = (message, details) => new AppError(400, message, details);
const unauthorized = (message = 'Not authorized') => new AppError(401, message);
const forbidden = (message = 'Not authorized to perform this action') => new AppError(403, message);
const notFound = (message = 'Not found') => new AppError(404, message);
const conflict = (message) => new AppError(409, message);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict };
