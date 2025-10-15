const mongoose = require('mongoose');

const syllabusSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  branch: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

syllabusSchema.index({ courseCode: 1, semester: 1 });
syllabusSchema.index({ title: 'text', subject: 'text', description: 'text' });

module.exports = mongoose.model('Syllabus', syllabusSchema);