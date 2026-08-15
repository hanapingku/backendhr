const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  resetPassword 
} = require('../controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.put('/reset-password/:userId', authMiddleware, adminMiddleware, resetPassword);

module.exports = router;