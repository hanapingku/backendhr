const express = require('express');
const router = express.Router();
const {
  getStatusUjian,
  mulaiUjian,
  submitUjian,
  pauseUjian,
  resumeUjian,
  getUjianDiPause  // 🔥 Tambahkan ini
} = require('../controllers/ujianController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Semua route ujian harus login
router.use(authMiddleware);

// Status & Mulai Ujian
router.get('/:bidangId/status', getStatusUjian);
router.post('/:bidangId/mulai', mulaiUjian);

// Submit Ujian
router.post('/:ujianId/submit', submitUjian);

// Pause (dari user)
router.put('/:ujianId/pause', pauseUjian);

// Resume (dari admin)
router.put('/:ujianId/resume', adminMiddleware, resumeUjian);

// 🔥 GET semua ujian yang di-pause (untuk admin)
router.get('/di-pause', adminMiddleware, getUjianDiPause);

module.exports = router;