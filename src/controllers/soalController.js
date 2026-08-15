const prisma = require('../lib/prisma');
const { parseExcelSoal } = require('../utils/excelParser');
const fs = require('fs');
const path = require('path');

// UPLOAD Soal dari Excel
exports.uploadSoal = async (req, res) => {
  try {
    const { bidangId } = req.params;

    // Validasi file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File Excel wajib diupload'
      });
    }

    // Cek apakah bidang ada
    const bidang = await prisma.bidang.findUnique({
      where: { id: bidangId },
      include: {
        soal: true,
        ujian: true
      }
    });

    if (!bidang) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Bidang tidak ditemukan'
      });
    }

    // Cek apakah sudah ada ujian yang dikerjakan
    const hasUjian = bidang.ujian.some(u => u.status !== 'belum_mulai');
    if (hasUjian) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat mengupload soal karena sudah ada ujian yang dikerjakan'
      });
    }

    // Parse Excel
    const result = parseExcelSoal(req.file.path);

    // Hapus file Excel setelah parse
    fs.unlinkSync(req.file.path);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Gagal memproses file Excel',
        errors: result.errors
      });
    }

    // Cek apakah sudah ada soal sebelumnya
    const existingSoal = await prisma.soal.findMany({
      where: { bidang_id: bidangId }
    });

    // Jika sudah ada soal, hapus dulu (replace)
    if (existingSoal.length > 0) {
      await prisma.soal.deleteMany({
        where: { bidang_id: bidangId }
      });
    }

    // Simpan soal ke database
    const createdSoal = await prisma.soal.createMany({
      data: result.data.map(soal => ({
        ...soal,
        bidang_id: bidangId
      }))
    });

    res.status(201).json({
      success: true,
      message: `Berhasil upload ${result.total} soal`,
      data: {
        total: result.total,
        soal: result.data
      }
    });

  } catch (error) {
    console.error('Upload soal error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat upload soal'
    });
  }
};

// GET semua soal by bidang
exports.getSoalByBidang = async (req, res) => {
  try {
    const { bidangId } = req.params;

    const soal = await prisma.soal.findMany({
      where: { bidang_id: bidangId },
      orderBy: {
        created_at: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      data: soal
    });
  } catch (error) {
    console.error('Get soal error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data soal'
    });
  }
};

// EDIT soal (Admin only)
exports.editSoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { soal_text, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, jawaban_benar } = req.body;

    // Cek soal ada
    const existingSoal = await prisma.soal.findUnique({
      where: { id },
      include: {
        bidang: {
          include: {
            ujian: true
          }
        }
      }
    });

    if (!existingSoal) {
      return res.status(404).json({
        success: false,
        message: 'Soal tidak ditemukan'
      });
    }

    // Cek apakah sudah ada ujian yang dikerjakan
    const hasUjian = existingSoal.bidang.ujian.some(u => u.status !== 'belum_mulai');
    if (hasUjian) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat mengedit soal karena sudah ada ujian yang dikerjakan'
      });
    }

    // Update soal
    const updatedSoal = await prisma.soal.update({
      where: { id },
      data: {
        soal_text,
        pilihan_a,
        pilihan_b,
        pilihan_c,
        pilihan_d,
        pilihan_e,
        jawaban_benar: jawaban_benar?.toUpperCase()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Soal berhasil diupdate',
      data: updatedSoal
    });

  } catch (error) {
    console.error('Edit soal error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengedit soal'
    });
  }
};

// DELETE soal (Admin only)
exports.deleteSoal = async (req, res) => {
  try {
    const { id } = req.params;

    const existingSoal = await prisma.soal.findUnique({
      where: { id },
      include: {
        bidang: {
          include: {
            ujian: true
          }
        }
      }
    });

    if (!existingSoal) {
      return res.status(404).json({
        success: false,
        message: 'Soal tidak ditemukan'
      });
    }

    // Cek apakah sudah ada ujian
    const hasUjian = existingSoal.bidang.ujian.some(u => u.status !== 'belum_mulai');
    if (hasUjian) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus soal karena sudah ada ujian yang dikerjakan'
      });
    }

    await prisma.soal.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Soal berhasil dihapus'
    });

  } catch (error) {
    console.error('Delete soal error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus soal'
    });
  }
};