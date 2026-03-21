const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: './.env' });

// Debug environment loading
console.log('🔍 Environment file loading test:');
console.log('📁 Current directory:', process.cwd());
console.log('🔑 MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('🔑 JUDGE0_API_KEY exists:', !!process.env.JUDGE0_API_KEY);
console.log('🔑 JUDGE0_API_KEY value:', process.env.JUDGE0_API_KEY ? 'LOADED' : 'MISSING');
console.log('📧 EMAIL_USER exists:', !!process.env.EMAIL_USER);
console.log('📧 EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.warn('⚠️  WARNING: Email service is not configured! OTP emails will not be sent.');
  console.warn('   Please set EMAIL_USER, EMAIL_PASSWORD, and EMAIL_FROM in your .env file.');
}

// Import routes
const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const resumeRoutes = require('./routes/resume');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ─── Socket.IO Setup ───────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Authenticate socket connections using JWT (same token as REST API)
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    console.warn('[socket] No token provided — anonymous socket allowed for polling fallback');
    socket.userId = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId || decoded.id || decoded._id;
    next();
  } catch (err) {
    console.warn('[socket] Invalid token:', err.message);
    socket.userId = null;
    next(); // allow connection but no userId-based rooms
  }
});

io.on('connection', (socket) => {
  console.log(`[socket] Client connected: ${socket.id} userId=${socket.userId || 'anon'}`);

  // Join a personal room so the worker can push results directly to this user
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
    console.log(`[socket] User ${socket.userId} joined room user:${socket.userId}`);
  }

  // Allow frontend to join a job-specific room for targeted result delivery
  socket.on('subscribe:job', (jobId) => {
    socket.join(`job:${jobId}`);
    console.log(`[socket] Socket ${socket.id} subscribed to job:${jobId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[socket] Client disconnected: ${socket.id}`);
  });
});

// Export io so the worker can call io.to(room).emit(...)
module.exports.io = io;

// Initialize BullMQ submission worker (starts consuming the Redis queue)
// Must be required AFTER io is exported so the worker can import it
require('./workers/submissionWorker');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for code submissions
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/resume', resumeRoutes);

// Debug Judge0 configuration
console.log('🔑 Judge0 API URL:', process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com');
console.log('🔑 Judge0 API Key:', process.env.JUDGE0_API_KEY ? 'Loaded ✅' : 'Missing ❌');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    message: 'AI Placement Readiness System Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Start server (use httpServer instead of app.listen so Socket.IO works)
const startServer = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔌 Socket.IO ready for real-time result push`);
  });
};

startServer();
