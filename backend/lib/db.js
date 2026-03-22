const mongoose = require('mongoose');
const { config } = require('./config');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('backend.db');
let connectPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectPromise) {
    connectPromise = mongoose.connect(config.mongoUri).then((connection) => {
      logger.info('MongoDB connected');
      return connection;
    }).catch((error) => {
      connectPromise = null;
      logger.error('MongoDB connection failed', { error });
      throw error;
    });
  }

  return connectPromise;
}

async function disconnectDB() {
  try {
    connectPromise = null;
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected');
    }
  } catch (error) {
    logger.error('MongoDB disconnect failed', { error });
  }
}

module.exports = { connectDB, disconnectDB };
