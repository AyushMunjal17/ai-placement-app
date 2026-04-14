const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    transcript: [{
        role: {
            type: String,
            enum: ['assistant', 'user'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        feedback: String,
        score: Number
    }],
    overallScore: {
        type: Number,
        default: 0
    },
    feedbackSummary: String,
    strengths: [String],
    weaknesses: [String],
    improvementTips: [String],
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('Interview', interviewSchema);
