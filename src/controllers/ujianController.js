const prisma = require('../lib/prisma');

// CEK STATUS UJIAN USER
exports.getStatusUjian = async (req, res) => {
  try {
    const { bidangId } = req.params;
    const userId = req.user.id;

    // Cek ujian terakhir user untuk bidang ini
    const ujian = await prisma.ujian.findFirst({
      where: {
        user_id: userId,
        bidang_id: bidangId
      },
      orderBy: {
        percobaan_ke: 'desc'
      },
      include: {
        bidang: {
          select: {
            nama: true,
            durasi_ujian: true
          }
        }
      }
    });

    // Hitung jumlah percobaan
    const totalPercobaan = await prisma.ujian.count({
      where: {
        user_id: userId,
        bidang_id: bidangId
      }
    });

    res.status(200).json({
      success: true,
      data: {
        ujian: ujian || null,
        total_percobaan: totalPercobaan,
        sisa_percobaan: Math.max(0, 3 - totalPercobaan),
        dapat_mengulang: totalPercobaan < 3
      }
    });

  } catch (error) {
    console.error('Get status ujian error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil status ujian'
    });
  }
};

// MULAI UJIAN
exports.mulaiUjian = async (req, res) => {
  try {
    const { bidangId } = req.params;
    const userId = req.user.id;

    // Cek bidang ada
    const bidang = await prisma.bidang.findUnique({
      where: { id: bidangId },
      include: {
        soal: true
      }
    });

    if (!bidang) {
      return res.status(404).json({
        success: false,
        message: 'Bidang tidak ditemukan'
      });
    }

    // Cek apakah ada soal
    if (bidang.soal.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Belum ada soal untuk bidang ini'
      });
    }

    // Hitung percobaan user
    const totalPercobaan = await prisma.ujian.count({
      where: {
        user_id: userId,
        bidang_id: bidangId
      }
    });

    if (totalPercobaan >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah mencapai batas maksimal percobaan (3x)'
      });
    }

    // Cek apakah ada ujian aktif (belum selesai)
    const ujianAktif = await prisma.ujian.findFirst({
      where: {
        user_id: userId,
        bidang_id: bidangId,
        status: {
          in: ['sedang_berlangsung', 'di_pause']
        }
      }
    });

    if (ujianAktif) {
      return res.status(400).json({
        success: false,
        message: 'Anda memiliki ujian yang belum selesai',
        data: {
          ujian_id: ujianAktif.id,
          status: ujianAktif.status
        }
      });
    }

    // Buat ujian baru
    const ujian = await prisma.ujian.create({
      data: {
        user_id: userId,
        bidang_id: bidangId,
        percobaan_ke: totalPercobaan + 1,
        status: 'sedang_berlangsung',
        waktu_mulai: new Date()
      },
      include: {
        bidang: {
          select: {
            nama: true,
            durasi_ujian: true,
            soal: {
              select: {
                id: true,
                soal_text: true,
                pilihan_a: true,
                pilihan_b: true,
                pilihan_c: true,
                pilihan_d: true,
                pilihan_e: true
              }
            }
          }
        }
      }
    });

    // Simpan jawaban kosong di session/user state (frontend yang handle)
    // Backend hanya menyimpan hasil akhir

    res.status(201).json({
      success: true,
      message: 'Ujian dimulai',
      data: {
        ujian_id: ujian.id,
        bidang: ujian.bidang.nama,
        durasi: ujian.bidang.durasi_ujian,
        total_soal: ujian.bidang.soal.length,
        soal: ujian.bidang.soal, // Kirim semua soal ke frontend
        waktu_mulai: ujian.waktu_mulai,
        percobaan_ke: ujian.percobaan_ke
      }
    });

  } catch (error) {
    console.error('Mulai ujian error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memulai ujian'
    });
  }
};

// SUBMIT UJIAN
exports.submitUjian = async (req, res) => {
  try {
    const { ujianId } = req.params;
    const { jawaban } = req.body; // Format: [{ soal_id: '...', jawaban: 'A' }, ...]
    const userId = req.user.id;

    // Cek ujian
    const ujian = await prisma.ujian.findFirst({
      where: {
        id: ujianId,
        user_id: userId
      },
      include: {
        bidang: {
          include: {
            soal: true
          }
        }
      }
    });

    if (!ujian) {
      return res.status(404).json({
        success: false,
        message: 'Ujian tidak ditemukan'
      });
    }

    if (ujian.status === 'selesai') {
      return res.status(400).json({
        success: false,
        message: 'Ujian sudah selesai'
      });
    }

    // Hitung skor
    let benar = 0;
    const totalSoal = ujian.bidang.soal.length;

    jawaban.forEach(j => {
      const soal = ujian.bidang.soal.find(s => s.id === j.soal_id);
      if (soal && soal.jawaban_benar === j.jawaban) {
        benar++;
      }
    });

    const skor = Math.round((benar / totalSoal) * 100);

    // Update ujian
    const updatedUjian = await prisma.ujian.update({
      where: { id: ujianId },
      data: {
        status: 'selesai',
        skor: skor,
        waktu_selesai: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Ujian selesai',
      data: {
        skor: skor,
        benar: benar,
        total: totalSoal,
        percobaan_ke: ujian.percobaan_ke
      }
    });

  } catch (error) {
    console.error('Submit ujian error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat submit ujian'
    });
  }
};

// PAUSE UJIAN (dari user)
exports.pauseUjian = async (req, res) => {
  try {
    const { ujianId } = req.params;
    const userId = req.user.id;

    const ujian = await prisma.ujian.findFirst({
      where: {
        id: ujianId,
        user_id: userId,
        status: 'sedang_berlangsung'
      }
    });

    if (!ujian) {
      return res.status(404).json({
        success: false,
        message: 'Ujian tidak ditemukan atau tidak dalam status berlangsung'
      });
    }

    // Update status ke di_pause
    await prisma.ujian.update({
      where: { id: ujianId },
      data: {
        status: 'di_pause'
      }
    });

    // Log pindah tab
    await prisma.logPindahTab.create({
      data: {
        ujian_id: ujianId,
        action: 'pause'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Ujian di-pause',
      data: {
        status: 'di_pause'
      }
    });

  } catch (error) {
    console.error('Pause ujian error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat pause ujian'
    });
  }
};

// RESUME UJIAN (dari admin)
exports.resumeUjian = async (req, res) => {
  try {
    const { ujianId } = req.params;

    const ujian = await prisma.ujian.findFirst({
      where: {
        id: ujianId,
        status: 'di_pause'
      }
    });

    if (!ujian) {
      return res.status(404).json({
        success: false,
        message: 'Ujian tidak ditemukan atau tidak dalam status di_pause'
      });
    }

    // Update status ke sedang_berlangsung
    await prisma.ujian.update({
      where: { id: ujianId },
      data: {
        status: 'sedang_berlangsung',
        is_paused_by_admin: false
      }
    });

    // Log resume
    await prisma.logPindahTab.create({
      data: {
        ujian_id: ujianId,
        action: 'resume'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Ujian dilanjutkan',
      data: {
        status: 'sedang_berlangsung'
      }
    });

  } catch (error) {
    console.error('Resume ujian error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat resume ujian'
    });
  }
};

// GET semua ujian yang di-pause (untuk admin)
exports.getUjianDiPause = async (req, res) => {
  try {
    const ujianDiPause = await prisma.ujian.findMany({
      where: {
        status: 'di_pause'
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true
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

    res.status(200).json({
      success: true,
      data: ujianDiPause
    });

  } catch (error) {
    console.error('Get ujian di-pause error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data ujian di-pause'
    });
  }
};