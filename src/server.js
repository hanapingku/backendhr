require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Sesuaikan dengan frontend nanti
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files untuk uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const bidangRoutes = require('./routes/bidangRoutes');
const ujianRoutes = require('./routes/ujianRoutes');
const hasilRoutes = require('./routes/hasilRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/bidang', bidangRoutes);
app.use('/api/ujian', ujianRoutes);
app.use('/api/hasil', hasilRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ============ SOCKET.IO ============
// Store untuk tracking user connections
const userSockets = new Map(); // userId -> socketId
const ujianPaused = new Map(); // ujianId -> { userId, bidangId, timestamp }

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Register user
  socket.on('register-user', (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`✅ User ${userId} registered with socket ${socket.id}`);
  });

  // User pindah tab / pause ujian
  socket.on('ujian-pause', async (data) => {
    const { ujianId, userId, bidangId } = data;
    console.log(`⏸️ User ${userId} paused ujian ${ujianId}`);

    // Simpan ke map
    ujianPaused.set(ujianId, {
      userId,
      bidangId,
      timestamp: new Date()
    });

    // Cari semua admin yang online
    const adminSockets = [];
    for (const [uid, sid] of userSockets) {
      // Kita akan kirim ke semua admin (nanti di filter di frontend)
      adminSockets.push(sid);
    }

    // Kirim notifikasi ke semua admin
    io.emit('notifikasi-pause', {
      ujianId,
      userId,
      bidangId,
      message: `User ${userId} mempause ujian (pindah tab)`,
      timestamp: new Date()
    });

    // Kirim ke user yang melakukan pause (konfirmasi)
    socket.emit('ujian-paused', {
      success: true,
      message: 'Ujian dipause karena pindah tab'
    });
  });

  // Admin resume ujian
  socket.on('ujian-resume', async (data) => {
    const { ujianId, userId } = data;
    console.log(`▶️ Admin resume ujian ${ujianId} for user ${userId}`);

    // Hapus dari map
    ujianPaused.delete(ujianId);

    // Kirim ke user yang bersangkutan
    const userSocketId = userSockets.get(userId);
    if (userSocketId) {
      io.to(userSocketId).emit('ujian-resumed', {
        success: true,
        ujianId,
        message: 'Admin mengizinkan Anda melanjutkan ujian'
      });
    }

    // Kirim notifikasi ke admin bahwa sudah di-resume
    socket.emit('notifikasi-resume', {
      ujianId,
      userId,
      message: `Ujian user ${userId} telah dilanjutkan`,
      timestamp: new Date()
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
    // Hapus dari userSockets
    for (const [userId, socketId] of userSockets) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io ready`);
});

// Export io untuk digunakan di controller jika perlu
module.exports = { io, userSockets, ujianPaused };

// Tambahkan setelah routes lainnya
const userRoutes = require('./routes/userRoutes');
app.use('/api/user', userRoutes);