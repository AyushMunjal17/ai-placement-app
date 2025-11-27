const mongoose = require('mongoose');

// Schema for test cases
const testCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: true
  },
  expectedOutput: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    default: ''
  },
  // For file-based test cases
  inputFile: {
    type: String, // File path or content
    default: ''
  },
  outputFile: {
    type: String, // File path or content
    default: ''
  },
  isFileBased: {
    type: Boolean,
    default: false
  },
  fileSize: {
    type: Number, // Size in bytes
    default: 0
  }
}, { _id: false });

// Schema for hidden test cases (used for final evaluation)
const hiddenTestCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: true
  },
  expectedOutput: {
    type: String,
    required: true
  },
  // For file-based test cases
  inputFile: {
    type: String,
    default: ''
  },
  outputFile: {
    type: String,
    default: ''
  },
  isFileBased: {
    type: Boolean,
    default: false
  },
  fileSize: {
    type: Number,
    default: 0
  }
}, { _id: false });

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Problem title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Problem description is required'],
    maxlength: [10000, 'Description cannot exceed 10000 characters']
  },
  inputFormat: {
    type: String,
    required: [true, 'Input format is required'],
    maxlength: [2000, 'Input format cannot exceed 2000 characters']
  },
  outputFormat: {
    type: String,
    required: [true, 'Output format is required'],
    maxlength: [2000, 'Output format cannot exceed 2000 characters']
  },
  constraints: {
    type: String,
    required: [true, 'Constraints are required'],
    maxlength: [2000, 'Constraints cannot exceed 2000 characters']
  },
  // Difficulty level
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true,
    default: 'Easy'
  },
  // Tags for categorization
  tags: [{
    type: String,
    trim: true
  }],
  // Company tags (companies that commonly ask this question)
  companyTags: [{
    type: String,
    trim: true
  }],
  // Sample test cases (visible to users)
  sampleTestCases: {
    type: [testCaseSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v.length >= 1;
      },
      message: 'At least one sample test case is required'
    }
  },
  // Hidden test cases (for evaluation only)
  hiddenTestCases: {
    type: [hiddenTestCaseSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v.length >= 1;
      },
      message: 'At least one hidden test case is required'
    }
  },
  // Time and memory limits
  timeLimit: {
    type: Number, // in seconds
    required: true,
    default: 2,
    min: [0.1, 'Time limit must be at least 0.1 seconds'],
    max: [10, 'Time limit cannot exceed 10 seconds']
  },
  memoryLimit: {
    type: Number, // in MB
    required: true,
    default: 256,
    min: [64, 'Memory limit must be at least 64 MB'],
    max: [1024, 'Memory limit cannot exceed 1024 MB']
  },
  // Publisher information
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publisherName: {
    type: String,
    required: true
  },
  // Problem statistics
  totalSubmissions: {
    type: Number,
    default: 0
  },
  acceptedSubmissions: {
    type: Number,
    default: 0
  },
  // Problem status
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Editorial/solution (optional)
  editorial: {
    type: String,
    default: ''
  },
  // Supported programming languages
  supportedLanguages: [{
    type: String,
    enum: ['c', 'cpp', 'java', 'python'],
    default: ['c', 'cpp', 'java', 'python']
  }],
  // Optional language-specific code templates (function signature + harness)
  codeTemplates: {
    python: {
      type: String,
      default: ''
    },
    cpp: {
      type: String,
      default: ''
    },
    java: {
      type: String,
      default: ''
    },
    javascript: {
      type: String,
      default: ''
    },
    c: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
problemSchema.index({ slug: 1 });
problemSchema.index({ publishedBy: 1 });
problemSchema.index({ difficulty: 1 });
problemSchema.index({ tags: 1 });
problemSchema.index({ companyTags: 1 });
problemSchema.index({ isPublic: 1, isActive: 1 });
problemSchema.index({ createdAt: -1 });

// Generate slug from title before saving
problemSchema.pre('save', function(next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .trim();
    
    // Add timestamp to ensure uniqueness
    if (this.isNew) {
      this.slug += '-' + Date.now();
    }
  }
  next();
});

// Virtual for acceptance rate
problemSchema.virtual('acceptanceRate').get(function() {
  if (this.totalSubmissions === 0) return 0;
  return ((this.acceptedSubmissions / this.totalSubmissions) * 100).toFixed(2);
});

// Instance method to get public problem data (without hidden test cases)
problemSchema.methods.getPublicData = function() {
  const problem = this.toObject();
  delete problem.hiddenTestCases; // Remove hidden test cases from public data
  return problem;
};

// Static method to find problems by difficulty
problemSchema.statics.findByDifficulty = function(difficulty) {
  return this.find({ 
    difficulty: difficulty,
    isPublic: true,
    isActive: true 
  }).populate('publishedBy', 'username firstName lastName');
};

// Static method to find problems by publisher
problemSchema.statics.findByPublisher = function(publisherId) {
  return this.find({ 
    publishedBy: publisherId,
    isActive: true 
  }).populate('publishedBy', 'username firstName lastName');
};

module.exports = mongoose.model('Problem', problemSchema);
