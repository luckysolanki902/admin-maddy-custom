const mongoose = require('mongoose');

const MediaItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'audio'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  fileName: {
    type: String,
    default: ''
  },
  mimeType: {
    type: String,
    default: ''
  }
}, { timestamps: true });

const FeatureRequestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  requestedBy: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    department: {
      type: String,
      required: true,
      enum: ['Admin', 'Developer', 'Marketing', 'Designer', 'Finance', 'Production']
    }
  },
  targetDepartment: {
    type: String,
    required: true,
    enum: ['Admin', 'Developer', 'Marketing', 'Designer', 'Finance', 'Production']
  },
  priority: {
    type: String,
    default: 'Medium',
    enum: ['Low', 'Medium', 'High', 'Critical']
  },
  status: {
    type: String,
    default: 'New',
    enum: ['New', 'In Review', 'Approved', 'In Progress', 'Completed', 'Rejected']
  },
  reviewedBy: {
    name: {
      type: String
    },
    email: {
      type: String
    },
    department: {
      type: String
    },
    timestamp: {
      type: Date
    }
  },
  reviewNotes: {
    type: String
  },
  targetDate: {
    type: Date
  },
  mediaItems: [MediaItemSchema],
  comments: [{
    content: {
      type: String,
      required: true
    },
    author: {
      name: {
        type: String,
        required: true
      },
      department: {
        type: String,
        required: true
      },
      email: {
        type: String
      }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  assignedTo: {
    name: {
      type: String
    },
    email: {
      type: String
    }
  },
  // Add voting functionality - store user IDs who voted
  upvotes: {
    type: [String], // Store Clerk user IDs
    default: []
  },
  downvotes: {
    type: [String], // Store Clerk user IDs
    default: []
  },
  tags: [{
    type: String,
    trim: true
  }]
}, { timestamps: true });

// Virtual for formatted creation date
FeatureRequestSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for days since creation
FeatureRequestSchema.virtual('daysSinceCreation').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.models.FeatureRequest || mongoose.model('FeatureRequest', FeatureRequestSchema);
