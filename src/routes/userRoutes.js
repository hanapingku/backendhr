const express = require('express');
const router = express.Router();
const {
  getDashboardUser,
  getDetailBidang,
  getRiwayatUjian,
  downloadMateri
} = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

// Semua route harus login
router.use(authMiddleware);

// Dashboard & Bidang
router.get('/dashboard', getDashboardUser);
router.get('/bidang/:bidangId', getDetailBidang);

// Riwayat
router.get('/riwayat', getRiwayatUjian);

// Download Materi
router.get('/materi/:materiId/download', downloadMateri);

module.exports = router;