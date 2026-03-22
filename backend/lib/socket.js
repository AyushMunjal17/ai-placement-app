const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { config } = require('./config');
const { createLogger } = require('../../shared/logger');
const { createRedisSubscriber, getRedisClient } = require('./redis');

const logger = createLogger('backend.socket');
let io = null;
let subscriber = null;

function parseSocketToken(socket) {
  return socket.handshake.auth?.token || socket.handshake.query?.token;
}

async function canAccessJob(jobId, userId) {
  if (!jobId || !userId) {
    return false;
  }

  const { getStoredJobResult } = require('../services/resultStore');
  const stored = await getStoredJobResult(jobId);
  if (stored) {
    return String(stored.userId) === String(userId);
  }

  const { compileQueue } = require('../queues/compileQueue');
  const job = await compileQueue.getJob(jobId);
  return Boolean(job && String(job.data?.userId) === String(userId));
}

function emitSubmissionResult(event) {
  if (!io) {
    return;
  }

  if (event.userId) {
    io.to(`user:${event.userId}`).emit('submission_result', event.payload);
  }
  if (event.jobId) {
    io.to(`job:${event.jobId}`).emit('submission_result', event.payload);
  }
}

async function initializeSocketServer(httpServer) {
  if (io || config.isServerless) {
    return io;
  }

  const socketCors = config.frontendUrl === '*' ? { origin: true, methods: ['GET', 'POST'], credentials: false } : { origin: config.frontendUrl, methods: ['GET', 'POST'], credentials: true };

io = new Server(httpServer, {
    cors: socketCors,
  });

  io.use((socket, next) => {
    const token = parseSocketToken(socket);
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId || decoded.id || decoded._id;
      return next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('subscribe:job', async (jobId, ack) => {
      try {
        const allowed = await canAccessJob(jobId, socket.userId);
        if (!allowed) {
          if (typeof ack === 'function') {
            ack({ ok: false, error: 'FORBIDDEN' });
          }
          return;
        }

        socket.join(`job:${jobId}`);
        if (typeof ack === 'function') {
          ack({ ok: true, jobId });
        }
      } catch (error) {
        logger.error('Job subscription failed', { error, jobId, userId: socket.userId });
        if (typeof ack === 'function') {
          ack({ ok: false, error: 'INTERNAL_ERROR' });
        }
      }
    });
  });

  subscriber = createRedisSubscriber();
  await subscriber.subscribe(config.socketChannel);
  subscriber.on('message', (channel, rawMessage) => {
    if (channel !== config.socketChannel) {
      return;
    }

    try {
      emitSubmissionResult(JSON.parse(rawMessage));
    } catch (error) {
      logger.error('Failed to parse socket event', { error });
    }
  });

  logger.info('Socket.IO initialized');
  return io;
}

async function publishSubmissionResult(event) {
  const client = getRedisClient();
  if (client.status !== 'ready') {
    throw new Error('Redis not ready');
  }
  await client.publish(config.socketChannel, JSON.stringify(event));
}

module.exports = {
  initializeSocketServer,
  publishSubmissionResult,
};
