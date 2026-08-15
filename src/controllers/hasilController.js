const prisma = require('../lib/prisma');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// GET semua hasil ujian (HR Dashboard)
exports.getAllHasil = async (req, res) => {
  try {
    const { bidangId } = req.query;

    const where = {
      status: 'selesai'
    };
    if (bidangId) {
      where.bidang_id = bidangId;
    }

    const hasil = await prisma.ujian.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true
          }
        },
        bidang: {
          select: {
            id: true,
            nama: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Format response
    const formatted = hasil.map(h => ({
      id: h.id,
      nama: h.user.full_name,
      email: h.user.email,
      bidang: h.bidang.nama,
      bidang_id: h.bidang_id,
      skor: h.skor,
      percobaan_ke: h.percobaan_ke,
      tanggal: h.waktu_selesai || h.created_at,
      status: h.status
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      total: formatted.length
    });

  } catch (error) {
    console.error('Get hasil error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data hasil'
    });
  }
};

// GET hasil per user
exports.getHasilByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const hasil = await prisma.ujian.findMany({
      where: {
        user_id: userId,
        status: 'selesai'
      },
      include: {
        bidang: {
          select: {
            nama: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      data: hasil
    });

  } catch (error) {
    console.error('Get hasil by user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data hasil'
    });
  }
};

// GET daftar bidang untuk filter
exports.getBidangList = async (req, res) => {
  try {
    const bidang = await prisma.bidang.findMany({
      select: {
        id: true,
        nama: true
      },
      orderBy: {
        nama: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      data: bidang
    });

  } catch (error) {
    console.error('Get bidang list error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data bidang'
    });
  }
};

// EXPORT ke Excel
exports.exportHasil = async (req, res) => {
  try {
    const { bidangId } = req.query;

    const where = {
      status: 'selesai'
    };
    if (bidangId) {
      where.bidang_id = bidangId;
    }

    const hasil = await prisma.ujian.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            full_name: true
          }
        },
        bidang: {
          select: {
            nama: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (hasil.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada data hasil ujian untuk diexport'
      });
    }

    // Format untuk Excel
    const data = hasil.map((h, index) => ({
      'No': index + 1,
      'Nama': h.user.full_name,
      'Email': h.user.email,
      'Bidang': h.bidang.nama,
      'Skor': h.skor,
      'Percobaan Ke': h.percobaan_ke,
      'Tanggal': h.waktu_selesai ? new Date(h.waktu_selesai).toLocaleDateString('id-ID') : '-',
      'Status': h.status
    }));

    // Buat workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column width
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 20 },  // Nama
      { wch: 25 },  // Email
      { wch: 25 },  // Bidang
      { wch: 10 },  // Skor
      { wch: 15 },  // Percobaan Ke
      { wch: 15 },  // Tanggal
      { wch: 15 }   // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Hasil Ujian');

    // Generate file
    const filename = `hasil-ujian-${Date.now()}.xlsx`;
    const filepath = path.join(__dirname, '../../uploads', filename);
    XLSX.writeFile(wb, filepath);

    // Download file
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          message: 'Gagal mendownload file'
        });
      }
      // Hapus file setelah download
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 5000);
    });

  } catch (error) {
    console.error('Export hasil error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat export data'
    });
  }
};

// GET semua user (untuk dashboard HR)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'user'
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        created_at: true,
        _count: {
          select: {
            ujian: {
              where: {
                status: 'selesai'
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data user'
    });
  }
};