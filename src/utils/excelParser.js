const XLSX = require('xlsx');

/**
 * Parse file Excel soal pilihan ganda
 * Format: Soal | Pilihan A | Pilihan B | Pilihan C | Pilihan D | Pilihan E | Jawaban
 */
exports.parseExcelSoal = (filePath) => {
  try {
    // Baca file Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert ke JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length < 2) {
      throw new Error('File Excel minimal harus memiliki 2 baris (header + 1 soal)');
    }

    // Ambil header (baris pertama)
    const header = data[0];
    const expectedHeader = ['Soal', 'Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D', 'Pilihan E', 'Jawaban'];
    
    // Validasi header
    if (header.length < 7) {
      throw new Error('Format Excel tidak sesuai. Harus ada 7 kolom: Soal, A, B, C, D, E, Jawaban');
    }

    // Cek apakah header sesuai (case insensitive)
    const headerMatch = expectedHeader.every((col, index) => {
      return header[index] && header[index].toString().toLowerCase().includes(col.toLowerCase());
    });

    if (!headerMatch) {
      throw new Error(`Header tidak sesuai. Format yang diharapkan: ${expectedHeader.join(' | ')}`);
    }

    // Parse soal (mulai dari baris ke-2)
    const soalList = [];
    const errors = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip row kosong
      if (!row || row.length === 0 || !row[0]) continue;

      // Validasi minimal 7 kolom
      if (row.length < 7) {
        errors.push(`Baris ${i + 1}: Jumlah kolom kurang (harus 7 kolom)`);
        continue;
      }

      const soal = row[0]?.toString().trim();
      const pilihanA = row[1]?.toString().trim();
      const pilihanB = row[2]?.toString().trim();
      const pilihanC = row[3]?.toString().trim();
      const pilihanD = row[4]?.toString().trim();
      const pilihanE = row[5]?.toString().trim();
      const jawaban = row[6]?.toString().toUpperCase().trim();

      // Validasi soal tidak boleh kosong
      if (!soal) {
        errors.push(`Baris ${i + 1}: Soal tidak boleh kosong`);
        continue;
      }

      // Validasi pilihan tidak boleh kosong
      if (!pilihanA || !pilihanB || !pilihanC || !pilihanD || !pilihanE) {
        errors.push(`Baris ${i + 1}: Semua pilihan (A-E) harus diisi`);
        continue;
      }

      // Validasi jawaban A-E
      if (!['A', 'B', 'C', 'D', 'E'].includes(jawaban)) {
        errors.push(`Baris ${i + 1}: Jawaban harus A, B, C, D, atau E (ditemukan: ${jawaban})`);
        continue;
      }

      soalList.push({
        soal_text: soal,
        pilihan_a: pilihanA,
        pilihan_b: pilihanB,
        pilihan_c: pilihanC,
        pilihan_d: pilihanD,
        pilihan_e: pilihanE,
        jawaban_benar: jawaban
      });
    }

    // Validasi minimal 10 soal
    if (soalList.length < 10) {
      errors.push(`Minimal 10 soal (saat ini: ${soalList.length} soal)`);
    }

    // Maksimal 50 soal
    if (soalList.length > 50) {
      errors.push(`Maksimal 50 soal (saat ini: ${soalList.length} soal)`);
    }

    return {
      success: errors.length === 0,
      data: soalList,
      errors: errors,
      total: soalList.length
    };

  } catch (error) {
    console.error('Parse Excel error:', error);
    return {
      success: false,
      data: [],
      errors: [error.message],
      total: 0
    };
  }
};