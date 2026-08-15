const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, '../../uploads');
const materiDir = path.join(uploadDir, 'materi');
const soalDir = path.join(uploadDir, 'soal');

[materiDir, soalDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadDir;
    if (file.fieldname === 'materi') {
      uploadPath = materiDir;
    } else if (file.fieldname === 'soal') {
      uploadPath = soalDir;
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter - sesuaikan dengan fieldname
const fileFilter = (req, file, cb) => {
  // Jika upload materi → hanya PDF
  if (file.fieldname === 'materi') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file PDF yang diperbolehkan untuk materi!'), false);
    }
  }
  // Jika upload soal → hanya Excel
  else if (file.fieldname === 'soal') {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file Excel (.xlsx atau .xls) yang diperbolehkan untuk soal!'), false);
    }
  }
  else {
    cb(new Error('Field tidak dikenal'), false);
  }
};

// Upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

module.exports = upload;