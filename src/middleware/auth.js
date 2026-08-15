const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, full_name: true, role: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid atau expired'
    });
  }
};

// Middleware untuk admin only
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Hanya untuk admin.'
    });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };