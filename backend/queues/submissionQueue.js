const { Queue } = require('bullmq');


const connection = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
};

const submissionQueue = new Queue('submissions', {
    connection,
    defaultJobOptions: {
        attempts: 3,           // retry up to 3 times on failure
        backoff: {
            type: 'exponential',
            delay: 2000,         // 2s, 4s, 8s
        },
        removeOnComplete: { count: 500 }, // keep last 500 completed jobs
        removeOnFail: { count: 100 },
    },
});

submissionQueue.on('error', (err) => {
    console.error('[queue] BullMQ queue error:', err.message);
});

module.exports = submissionQueue;
