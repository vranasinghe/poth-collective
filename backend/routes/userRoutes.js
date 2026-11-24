const express = require('express');
const router = express.Router();
const { registerUser, loginUser, createDemoUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { registerBody, loginBody, demoBody, updateProfileBody } = require('../validators/schemas');

router.post('/register', validate(registerBody), registerUser);
router.post('/login', validate(loginBody), loginUser);
router.post('/demo', validate(demoBody), createDemoUser);
// Validate a restored session against the server (including deleted users and password changes).
router.get('/profile', protect, (req, res) => {
    const { _id, firstName, lastName, email, userType, nearestCity, phoneNumber } = req.user;
    res.json({ _id, firstName, lastName, email, userType, nearestCity, phoneNumber });
});

router.put('/profile', protect, validate(updateProfileBody), updateUser);
router.delete('/profile', protect, deleteUser);

module.exports = router;
