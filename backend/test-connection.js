const mongoose = require('mongoose');
require('dotenv').config();

console.log('Testing MongoDB connection...');
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('MONGO_URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 0);

// Test connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  });
