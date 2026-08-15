const express = require('express');
const router = express.Router();
const {
  getAllBidang,
  getBidangById,
  createBidang,
  updateBidang,
  deleteBidang
} = require('../controllers/bidangController');
const {
  uploadMateri,
  getMateriByBidang,
  deleteMateri
} = require('../controllers/materiController');
const {
  uploadSoal,
  getSoalByBidang,
  editSoal,
  deleteSoal
} = require('../controllers/soalController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Semua route bidang harus login
router.use(authMiddleware);

// CRUD Bidang (Admin only)
router.post('/', adminMiddleware, createBidang);
router.put('/:id', adminMiddleware, updateBidang);
router.delete('/:id', adminMiddleware, deleteBidang);

// Semua user bisa lihat bidang
router.get('/', getAllBidang);
router.get('/:id', getBidangById);

// Upload Materi (Admin only)
router.post(
  '/:bidangId/materi',
  adminMiddleware,
  upload.single('materi'),
  uploadMateri
);

// Get Materi by Bidang (Semua user)
router.get('/:bidangId/materi', getMateriByBidang);

// Delete Materi (Admin only)
router.delete('/materi/:id', adminMiddleware, deleteMateri);

// Upload Soal (Admin only)
router.post(
  '/:bidangId/soal',
  adminMiddleware,
  upload.single('soal'),
  uploadSoal
);

// Get Soal by Bidang (Semua user - untuk ujian)
router.get('/:bidangId/soal', getSoalByBidang);

// Edit Soal (Admin only)
router.put('/soal/:id', adminMiddleware, editSoal);

// Delete Soal (Admin only)
router.delete('/soal/:id', adminMiddleware, deleteSoal);

module.exports = router;