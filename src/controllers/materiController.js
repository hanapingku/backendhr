const prisma = require('../lib/prisma');
const fs = require('fs');
const path = require('path');

// UPLOAD Materi
exports.uploadMateri = async (req, res) => {
  try {
    const { bidangId } = req.params;
    const { judul } = req.body;

    // Validasi file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File PDF wajib diupload'
      });
    }

    if (!judul) {
      return res.status(400).json({
        success: false,
        message: 'Judul materi wajib diisi'
      });
    }

    // Cek apakah bidang ada
    const bidang = await prisma.bidang.findUnique({
      where: { id: bidangId }
    });

    if (!bidang) {
      // Hapus file yang sudah terupload
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Bidang tidak ditemukan'
      });
    }

    // Simpan ke database
    const materi = await prisma.materi.create({
      data: {
        bidang_id: bidangId,
        judul: judul,
        file_path: req.file.path.replace(/^.*?uploads\//, 'uploads/')
      }
    });

    res.status(201).json({
      success: true,
      message: 'Materi berhasil diupload',
      data: materi
    });

  } catch (error) {
    console.error('Upload materi error:', error);
    // Hapus file jika error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat upload materi'
    });
  }
};

// GET semua materi by bidang
exports.getMateriByBidang = async (req, res) => {
  try {
    const { bidangId } = req.params;

    const materi = await prisma.materi.findMany({
      where: { bidang_id: bidangId },
      orderBy: {
        uploaded_at: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      data: materi
    });
  } catch (error) {
    console.error('Get materi error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data materi'
    });
  }
};

// DELETE materi
exports.deleteMateri = async (req, res) => {
  try {
    const { id } = req.params;

    const materi = await prisma.materi.findUnique({
      where: { id }
    });

    if (!materi) {
      return res.status(404).json({
        success: false,
        message: 'Materi tidak ditemukan'
      });
    }

    // Hapus file fisik
    const filePath = path.join(__dirname, '../../', materi.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Hapus dari database
    await prisma.materi.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Materi berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete materi error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus materi'
    });
  }
};