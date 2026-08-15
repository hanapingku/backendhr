const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// REGISTER
exports.register = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // Validasi input
    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Semua field wajib diisi'
      });
    }

    // Cek user existing
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        full_name,
        role: 'user' // default
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        created_at: true
      }
    });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: {
        token,
        user
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat registrasi'
    });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi'
      });
    }

    // Cari user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    // Cek password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    // Generate token
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat login'
    });
  }
};

// GET ME (current user)
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        created_at: true
      }
    });

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan'
    });
  }
};

// RESET PASSWORD (Admin only) - dengan default password
exports.resetPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const defaultPassword = 'password123';

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: hashedPassword }
    });

    res.status(200).json({
      success: true,
      message: `Password berhasil di-reset menjadi: ${defaultPassword}`,
      data: {
        email: user.email,
        default_password: defaultPassword
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat reset password'
    });
  }
};