const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: './.env' });

// Detect serverless environment (Vercel, AWS Lambda, etc.)
const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

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
}
console.log('🚀 Using Code Executor:', process.env.CODE_EXECUTOR_URL || 'https://code-executor-u3jg.onrender.com');

// Import routes
const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const resumeRoutes = require('./routes/resume');
const interviewRoutes = require('./routes/interview');

const app = express();

// ─── Socket.IO Setup (only in persistent/non-serverless environments) ──────────
let io = null;
let httpServer = null;

if (!IS_SERVERLESS) {
  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');

  httpServer = http.createServer(app);

  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT-authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      socket.userId = null;
      return next();
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId || decoded.id || decoded._id;
      next();
    } catch (err) {
      socket.userId = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] Client connected: ${socket.id} userId=${socket.userId || 'anon'}`);
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }
    socket.on('subscribe:job', (jobId) => {
      socket.join(`job:${jobId}`);
    });
    socket.on('disconnect', () => {
      console.log(`[socket] Client disconnected: ${socket.id}`);
    });
  });

  // Initialize BullMQ submission worker on persistent server startup
  require('./workers/submissionWorker');
  console.log('🔌 Socket.IO ready for real-time result push');
} else {
  console.log('☁️  Running on serverless — Socket.IO and BullMQ worker disabled. Using polling-only mode.');
}

// ─── MongoDB connection ────────────────────────────────────────────────────────
let _mongoConnected = false;
const connectDB = async () => {
  if (_mongoConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    _mongoConnected = true;
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// In serverless mode, ensure DB is connected before every request
if (IS_SERVERLESS) {
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      res.status(500).json({ message: 'Database connection failed', error: err.message });
    }
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);

// Debug Judge0 configuration
console.log('🔑 Judge0 API URL:', process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com');
console.log('🔑 Judge0 API Key:', process.env.JUDGE0_API_KEY ? 'Loaded ✅' : 'Missing ❌');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    message: 'AI Placement Readiness System Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    serverless: IS_SERVERLESS,
    socketIO: !IS_SERVERLESS,
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

// ─── Startup (persistent-server mode only) ────────────────────────────────────
if (!IS_SERVERLESS) {
  const PORT = process.env.PORT || 5000;
  const listenServer = httpServer || app;

  connectDB().then(() => {
    listenServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    });
  }).catch((err) => {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────
// IMPORTANT: Vercel requires `module.exports` to be the Express app (a function).
// We also hang `io` off it so the worker can import it via require('../server').io
module.exports = app;
module.exports.io = io;
