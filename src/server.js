require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// ============ CORS (Panggil SEKALI di awal) ============
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============ ROUTES ============
const authRoutes = require('./routes/authRoutes');
const bidangRoutes = require('./routes/bidangRoutes');
const ujianRoutes = require('./routes/ujianRoutes');
const hasilRoutes = require('./routes/hasilRoutes');
const userRoutes = require('./routes/userRoutes'); // 🔥 Pindahkan ke sini!

app.use('/api/auth', authRoutes);
app.use('/api/bidang', bidangRoutes);
app.use('/api/ujian', ujianRoutes);
app.use('/api/hasil', hasilRoutes);
app.use('/api/user', userRoutes); // 🔥 Tambahkan ini!

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server running' });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ============ SOCKET.IO ============
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const userSockets = new Map();
const ujianPaused = new Map();

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('register-user', (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`✅ User ${userId} registered with socket ${socket.id}`);
  });

  socket.on('ujian-pause', async (data) => {
    const { ujianId, userId, bidangId } = data;
    console.log(`⏸️ User ${userId} paused ujian ${ujianId}`);
    ujianPaused.set(ujianId, { userId, bidangId, timestamp: new Date() });
    io.emit('notifikasi-pause', { ujianId, userId, bidangId, message: `User ${userId} mempause ujian`, timestamp: new Date() });
    socket.emit('ujian-paused', { success: true, message: 'Ujian dipause karena pindah tab' });
  });

  socket.on('ujian-resume', async (data) => {
    const { ujianId, userId } = data;
    console.log(`▶️ Admin resume ujian ${ujianId} for user ${userId}`);
    ujianPaused.delete(ujianId);
    const userSocketId = userSockets.get(userId);
    if (userSocketId) {
      io.to(userSocketId).emit('ujian-resumed', { success: true, ujianId, message: 'Admin mengizinkan Anda melanjutkan ujian' });
    }
    socket.emit('notifikasi-resume', { ujianId, userId, message: `Ujian user ${userId} telah dilanjutkan`, timestamp: new Date() });
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔌 Socket.io ready`);
});

module.exports = { io, userSockets, ujianPaused };