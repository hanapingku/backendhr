const express = require('express');
const router = express.Router();
const {
  getDashboardUser,
  getDetailBidang,
  getRiwayatUjian,
  downloadMateri
} = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

// Dashboard & Bidang
router.get('/dashboard', authMiddleware, getDashboardUser);
router.get('/bidang/:bidangId', authMiddleware, getDetailBidang);

// Riwayat
router.get('/riwayat', authMiddleware, getRiwayatUjian);

// Download Materi - tanpa authMiddleware (pakai token dari query)
router.get('/materi/:materiId/download', downloadMateri);

module.exports = router;