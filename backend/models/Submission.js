const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  // User who made the submission
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  // Problem being solved
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  problemTitle: {
    type: String,
    required: true
  },
  // Code submission details
  code: {
    type: String,
    required: [true, 'Code is required'],
    maxlength: [50000, 'Code cannot exceed 50000 characters']
  },
  language: {
    type: String,
    required: true,
    enum: ['c', 'cpp', 'java', 'python']
  },
  // Judge0 submission details
  judge0Token: {
    type: String,
    required: false // Will be set after submission to Judge0
  },
  // Execution results
  status: {
    type: String,
    enum: [
      'Pending',
      'In Queue', 
      'Processing',
      'Accepted',
      'Wrong Answer',
      'Time Limit Exceeded',
      'Memory Limit Exceeded',
      'Runtime Error',
      'Compilation Error',
      'Internal Error'
    ],
    default: 'Pending'
  },
  // Detailed execution information
  executionTime: {
    type: Number, // in milliseconds
    default: null
  },
  memoryUsed: {
    type: Number, // in KB
    default: null
  },
  // Test case results
  testCaseResults: [{
    testCaseIndex: Number,
    status: String,
    executionTime: Number,
    memoryUsed: Number,
    input: String,
    expectedOutput: String,
    actualOutput: String,
    errorMessage: String
  }],
  // Overall results
  totalTestCases: {
    type: Number,
    default: 0
  },
  passedTestCases: {
    type: Number,
    default: 0
  },
  // Compilation/Runtime error details
  compileOutput: {
    type: String,
    default: ''
  },
  stderr: {
    type: String,
    default: ''
  },
  // Score (percentage of test cases passed)
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Submission metadata
  submissionTime: {
    type: Date,
    default: Date.now
  },
  // IP address for tracking (optional)
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ problemId: 1, createdAt: -1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ judge0Token: 1 });

// Virtual for success rate
submissionSchema.virtual('successRate').get(function() {
  if (this.totalTestCases === 0) return 0;
  return ((this.passedTestCases / this.totalTestCases) * 100).toFixed(2);
});

// Instance method to check if submission is accepted
submissionSchema.methods.isAccepted = function() {
  return this.status === 'Accepted';
};

// Instance method to check if submission is still processing
submissionSchema.methods.isProcessing = function() {
  return ['Pending', 'In Queue', 'Processing'].includes(this.status);
};

// Instance method to get public submission data (hide sensitive info)
submissionSchema.methods.getPublicData = function() {
  return {
    id: this._id,
    problemId: this.problemId,
    problemTitle: this.problemTitle,
    language: this.language,
    status: this.status,
    executionTime: this.executionTime,
    memoryUsed: this.memoryUsed,
    score: this.score,
    passedTestCases: this.passedTestCases,
    totalTestCases: this.totalTestCases,
    submissionTime: this.submissionTime,
    createdAt: this.createdAt
  };
};

// Static method to find submissions by user
submissionSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .populate('problemId', 'title difficulty')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find submissions by problem
submissionSchema.statics.findByProblem = function(problemId, limit = 100) {
  return this.find({ problemId })
    .populate('userId', 'username firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get user statistics
submissionSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        acceptedSubmissions: { 
          $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
        },
        averageScore: { $avg: '$score' },
        problemsSolved: {
          $addToSet: {
            $cond: [{ $eq: ['$status', 'Accepted'] }, '$problemId', null]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalSubmissions: 1,
        acceptedSubmissions: 1,
        averageScore: { $round: ['$averageScore', 2] },
        problemsSolved: {
          $size: {
            $filter: {
              input: '$problemsSolved',
              cond: { $ne: ['$$this', null] }
            }
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalSubmissions: 0,
    acceptedSubmissions: 0,
    averageScore: 0,
    problemsSolved: 0
  };
};

module.exports = mongoose.model('Submission', submissionSchema);
