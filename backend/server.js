const express = require('express');
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

// Import routes
const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const resumeRoutes = require('./routes/resume');

const app = express();
const PORT = process.env.PORT || 5000;

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
console.log('🔑 API Key length:', process.env.JUDGE0_API_KEY ? process.env.JUDGE0_API_KEY.length : 0);
console.log('🔑 API Key first 10 chars:', process.env.JUDGE0_API_KEY ? process.env.JUDGE0_API_KEY.substring(0, 10) + '...' : 'N/A');

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

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();
