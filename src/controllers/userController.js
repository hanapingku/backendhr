const prisma = require('../lib/prisma');
const path = require('path');

// GET dashboard user - semua bidang dengan status
exports.getDashboardUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get semua bidang
    const bidang = await prisma.bidang.findMany({
      include: {
        materi: {
          select: {
            id: true,
            judul: true,
            file_path: true
          }
        },
        soal: {
          select: {
            id: true
          }
        },
        ujian: {
          where: {
            user_id: userId
          },
          orderBy: {
            created_at: 'desc'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Format response
    const dashboard = bidang.map(b => {
      // Cari ujian terakhir user untuk bidang ini
      const ujianTerakhir = b.ujian[0] || null;
      
      // Hitung total percobaan
      const totalPercobaan = b.ujian.length;
      const sisaPercobaan = Math.max(0, 3 - totalPercobaan);
      
      // Tentukan status
      let status = 'belum_mulai';
      let skor = null;
      
      if (ujianTerakhir) {
        if (ujianTerakhir.status === 'selesai') {
          status = 'selesai';
          skor = ujianTerakhir.skor;
        } else if (ujianTerakhir.status === 'sedang_berlangsung') {
          status = 'sedang_berlangsung';
        } else if (ujianTerakhir.status === 'di_pause') {
          status = 'di_pause';
        }
      }

      return {
        id: b.id,
        nama: b.nama,
        deskripsi: b.deskripsi,
        durasi_ujian: b.durasi_ujian,
        total_soal: b.soal.length,
        total_materi: b.materi.length,
        materi: b.materi,
        status: status,
        skor: skor,
        percobaan_ke: ujianTerakhir?.percobaan_ke || 0,
        total_percobaan: totalPercobaan,
        sisa_percobaan: sisaPercobaan,
        bisa_mulai: sisaPercobaan > 0 && status !== 'sedang_berlangsung' && status !== 'di_pause',
        ujian_id: ujianTerakhir?.id || null,
        waktu_mulai: ujianTerakhir?.waktu_mulai || null
      };
    });

    res.status(200).json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data dashboard'
    });
  }
};

// GET detail bidang (untuk user)
exports.getDetailBidang = async (req, res) => {
  try {
    const { bidangId } = req.params;
    const userId = req.user.id;

    const bidang = await prisma.bidang.findUnique({
      where: { id: bidangId },
      include: {
        materi: {
          select: {
            id: true,
            judul: true,
            file_path: true,
            uploaded_at: true
          }
        },
        soal: {
          select: {
            id: true
          }
        },
        creator: {
          select: {
            full_name: true,
            email: true
          }
        }
      }
    });

    if (!bidang) {
      return res.status(404).json({
        success: false,
        message: 'Bidang tidak ditemukan'
      });
    }

    // Cek ujian user
    const ujian = await prisma.ujian.findMany({
      where: {
        user_id: userId,
        bidang_id: bidangId
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      data: {
        ...bidang,
        total_soal: bidang.soal.length,
        riwayat_ujian: ujian
      }
    });

  } catch (error) {
    console.error('Get detail bidang error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil detail bidang'
    });
  }
};

// GET riwayat ujian user
exports.getRiwayatUjian = async (req, res) => {
  try {
    const userId = req.user.id;

    const riwayat = await prisma.ujian.findMany({
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
      data: riwayat
    });

  } catch (error) {
    console.error('Get riwayat error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil riwayat ujian'
    });
  }
};

// DOWNLOAD materi - dengan token dari query parameter
exports.downloadMateri = async (req, res) => {
  try {
    const { materiId } = req.params;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan'
      });
    }

    // Verifikasi token
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid atau expired'
      });
    }

    // Cek user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Ambil materi
    const materi = await prisma.materi.findUnique({
      where: { id: materiId },
      include: {
        bidang: true
      }
    });

    if (!materi) {
      return res.status(404).json({
        success: false,
        message: 'Materi tidak ditemukan'
      });
    }

    // Path file
    const path = require('path');
    const filePath = path.join(__dirname, '../../', materi.file_path);
    
    // Download file
    res.download(filePath, `${materi.judul}.pdf`, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Gagal mendownload file'
          });
        }
      }
    });

  } catch (error) {
    console.error('Download materi error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mendownload materi'
    });
  }
};