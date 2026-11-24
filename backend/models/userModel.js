const mongoose = require('mongoose');

const USER_TYPES = ['Customer', 'Shop Owner'];

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'Please add a name']
    },
    lastName: {
        type: String,
        required: false
    },
    userType: {
        type: String,
        required: [true, 'User type is mandatory'],
        enum: { values: USER_TYPES, message: 'Invalid user type' }
    },
    nearestCity: {
        type: String,
        required: [true, 'Enter your nearest city']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        minlength: [10, 'Phone number should only contain 10 characters'],
        maxlength: [10, 'Phone number should only contain 10 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is mandatory'],
        unique: [true, 'Email is already registered'],
        match: [/@/, 'Email must contain @ sign']
    },
    // Always a bcrypt hash. Password strength rules are enforced on the plaintext in validators/userSchemas.js
    // (a length rule on the hash would be meaningless).
    password: {
        type: String,
        required: [true, 'Add a password']
    },
    // Tokens issued before this moment are rejected (set on password change).
    passwordChangedAt: {
        type: Date,
        default: null
    },
    // Set when an account is deleted. The document is kept as an anonymised tombstone so orders keep a
    // valid reader reference; a tombstone can never authenticate.
    deletedAt: {
        type: Date,
        default: null
    },
    // Temporary demo accounts are removed by services/demoService.js once demoExpiresAt passes
    isDemo: {
        type: Boolean,
        default: false
    },
    demoExpiresAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

userSchema.index({ isDemo: 1, demoExpiresAt: 1 });

const User = mongoose.model('User', userSchema);
User.USER_TYPES = USER_TYPES;

module.exports = User;
