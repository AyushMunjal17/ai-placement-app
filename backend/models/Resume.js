const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Personal Information
  personalInfo: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    location: String,
    linkedin: String,
    github: String,
    portfolio: String,
    summary: String
  },
  // Education
  education: [{
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    field: String,
    startDate: String,
    endDate: String,
    grade: String,
    description: String
  }],
  // Experience
  experience: [{
    company: { type: String, required: true },
    position: { type: String, required: true },
    location: String,
    startDate: String,
    endDate: String,
    current: { type: Boolean, default: false },
    description: String,
    achievements: [String]
  }],
  // Projects
  projects: [{
    name: { type: String, required: true },
    description: String,
    technologies: [String],
    link: String,
    github: String,
    highlights: [String]
  }],
  // Skills
  skills: {
    technical: [String],
    soft: [String],
    languages: [String],
    tools: [String]
  },
  // Certifications
  certifications: [{
    name: String,
    issuer: String,
    date: String,
    link: String
  }],
  // Achievements
  achievements: [String],
  // Template
  template: {
    type: String,
    enum: ['professional', 'creative', 'technical', 'minimal'],
    default: 'professional'
  },
  // AI Enhanced
  aiEnhanced: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
resumeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Resume', resumeSchema);
