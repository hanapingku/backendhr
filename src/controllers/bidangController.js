const prisma = require('../lib/prisma');

// GET semua bidang
exports.getAllBidang = async (req, res) => {
  try {
    const bidang = await prisma.bidang.findMany({
      include: {
        creator: {
          select: {
            full_name: true,
            email: true
          }
        },
        _count: {
          select: {
            materi: true,
            soal: true,
            ujian: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      data: bidang
    });
  } catch (error) {
    console.error('Get all bidang error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data bidang'
    });
  }
};

// GET bidang by ID
exports.getBidangById = async (req, res) => {
  try {
    const { id } = req.params;

    const bidang = await prisma.bidang.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            full_name: true,
            email: true
          }
        },
        materi: true,
        soal: true
      }
    });

    if (!bidang) {
      return res.status(404).json({
        success: false,
        message: 'Bidang tidak ditemukan'
      });
    }

    res.status(200).json({
      success: true,
      data: bidang
    });
  } catch (error) {
    console.error('Get bidang by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data bidang'
    });
  }
};

// CREATE bidang (Admin only)
exports.createBidang = async (req, res) => {
  try {
    const { nama, deskripsi, durasi_ujian } = req.body;

    // Validasi
    if (!nama || !durasi_ujian) {
      return res.status(400).json({
        success: false,
        message: 'Nama bidang dan durasi ujian wajib diisi'
      });
    }

    const bidang = await prisma.bidang.create({
      data: {
        nama,
        deskripsi,
        durasi_ujian: parseInt(durasi_ujian),
        created_by: req.user.id // dari auth middleware
      }
    });

    res.status(201).json({
      success: true,
      message: 'Bidang berhasil dibuat',
      data: bidang
    });
  } catch (error) {
    console.error('Create bidang error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat bidang'
    });
  }
};

// UPDATE bidang (Admin only)
exports.updateBidang = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, deskripsi, durasi_ujian } = req.body;

    // Cek apakah bidang ada
    const existingBidang = await prisma.bidang.findUnique({
      where: { id },
      include: {
        ujian: true // cek apakah sudah ada ujian
      }
    });

    if (!existingBidang) {
      return res.status(404).json({
        success: false,
        message: 'Bidang tidak ditemukan'
      });
    }

    // Cek apakah sudah ada ujian yang dikerjakan
    const hasUjian = existingBidang.ujian.some(u => u.status !== 'belum_mulai');
    if (hasUjian) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat mengubah bidang karena sudah ada ujian yang dikerjakan'
      });
    }

    const updatedBidang = await prisma.bidang.update({
      where: { id },
      data: {
        nama: nama || existingBidang.nama,
        deskripsi: deskripsi !== undefined ? deskripsi : existingBidang.deskripsi,
        durasi_ujian: durasi_ujian ? parseInt(durasi_ujian) : existingBidang.durasi_ujian
      }
    });

    res.status(200).json({
      success: true,
      message: 'Bidang berhasil diupdate',
      data: updatedBidang
    });
  } catch (error) {
    console.error('Update bidang error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengupdate bidang'
    });
  }
};

// DELETE bidang (Admin only)
exports.deleteBidang = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah bidang ada
    const existingBidang = await prisma.bidang.findUnique({
      where: { id },
      include: {
        ujian: true
      }
    });

    if (!existingBidang) {
      return res.status(404).json({
        success: false,
        message: 'Bidang tidak ditemukan'
      });
    }

    // Cek apakah sudah ada ujian
    if (existingBidang.ujian.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus bidang karena sudah ada ujian yang terkait'
      });
    }

    await prisma.bidang.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Bidang berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete bidang error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus bidang'
    });
  }
};