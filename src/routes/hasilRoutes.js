const express = require('express');
const router = express.Router();
const {
  getAllHasil,
  getHasilByUser,
  exportHasil,
  getBidangList,
  getAllUsers
} = require('../controllers/hasilController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Semua route harus login dan admin
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard HR
router.get('/', getAllHasil);
router.get('/bidang-list', getBidangList);
router.get('/export', exportHasil);
router.get('/users', getAllUsers);
router.get('/user/:userId', getHasilByUser);

module.exports = router;