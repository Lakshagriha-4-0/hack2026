const express = require('express');
const router = express.Router();
const { registerUser, authUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/me', protect, getMe);

module.exports = router;
