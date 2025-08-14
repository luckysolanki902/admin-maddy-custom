const mongoose = require("mongoose");

const LinkSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxLength: 200,
    },
    preview: {
      title: String,
      description: String,
      favicon: String,
      image: String,
    },
  },
  { timestamps: true }
);

const MediaItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      default: "",
      maxLength: 500,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileName: {
      type: String,
      default: "",
    },
    mimeType: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
    dimensions: {
      width: Number,
      height: Number,
    },
  },
  { timestamps: true }
);

const SocialMediaContentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxLength: 2000,
    },
    contentType: {
      type: String,
      required: true,
      enum: ["post", "story", "reel", "carousel"],
      default: "post",
    },
    targetPlatforms: [
      {
        type: String,
        enum: ["instagram", "facebook", "twitter", "linkedin", "tiktok"],
        required: true,
      },
    ],
    mood: {
      type: String,
      required: true,
      enum: ["professional", "casual", "humorous", "inspirational", "educational", "promotional"],
      default: "professional",
    },
    timingPreference: {
      type: String,
      enum: ["urgent", "seasonal", "evergreen", "specific-date"],
      default: "evergreen",
    },
    specificDate: {
      type: Date,
    },
    hashtags: [
      {
        type: String,
        trim: true,
        maxLength: 50,
      },
    ],
    submittedBy: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      department: {
        type: String,
        required: true,
        // enum: ['Super-Admin', 'Admin', 'Developer', 'Marketing', 'Designer', 'Finance', 'Production']
      },
      userId: {
        type: String, // Clerk user ID
        required: true,
      },
    },
    mediaItems: [MediaItemSchema],
    links: [LinkSchema],
    status: {
      type: String,
      default: "Submitted",
      enum: ["Submitted", "Under Review", "Approved", "Scheduled", "Published", "Rejected"],
    },
    reviewedBy: {
      name: String,
      email: String,
      department: String,
      userId: String,
      timestamp: Date,
    },
    reviewNotes: {
      type: String,
      maxLength: 1000,
    },
    scheduledDate: {
      type: Date,
    },
    publishedDate: {
      type: Date,
    },
    publishedUrls: [
      {
        platform: {
          type: String,
          enum: ["instagram", "facebook", "twitter", "linkedin", "tiktok"],
        },
        url: String,
        postId: String,
      },
    ],
    analytics: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      lastUpdated: Date,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxLength: 30,
      },
    ],
    priority: {
      type: String,
      default: "Medium",
      enum: ["Low", "Medium", "High", "Urgent"],
    },
    campaign: {
      type: String,
      trim: true,
      maxLength: 100,
    },
    targetAudience: {
      type: String,
      trim: true,
      maxLength: 200,
    },
    callToAction: {
      type: String,
      trim: true,
      maxLength: 100,
    },
  },
  { timestamps: true }
);

// Virtual for formatted creation date
SocialMediaContentSchema.virtual("formattedCreatedAt").get(function () {
  return this.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

// Virtual for days since creation
SocialMediaContentSchema.virtual("daysSinceCreation").get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Virtual for character count (useful for platform limits)
SocialMediaContentSchema.virtual("characterCount").get(function () {
  return this.description.length;
});

// Virtual for total media count
SocialMediaContentSchema.virtual("mediaCount").get(function () {
  return this.mediaItems.length;
});

// Index for efficient queries
SocialMediaContentSchema.index({ status: 1, createdAt: -1 });
SocialMediaContentSchema.index({ "submittedBy.userId": 1, createdAt: -1 });
SocialMediaContentSchema.index({ targetPlatforms: 1, status: 1 });
SocialMediaContentSchema.index({ contentType: 1, mood: 1 });

module.exports = mongoose.models.AdminSocialMediaContent || mongoose.model("AdminSocialMediaContent", SocialMediaContentSchema);
