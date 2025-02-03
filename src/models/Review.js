const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  // Basic fields
  comment: {
    type: String,
    required: true,
    maxlength: 2000, // feel free to adjust
    trim: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  images: [
    {
      type: String,
    },
  ],
  name: {
    type: String,
    required: true,
    maxlength: 200, // feel free to adjust
    trim: true,
  },

  /**
   * Who created the review?
   */
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Not strictly required, because admin may create the review without a user.
  },

  /**
   * Differentiate between user- and admin-generated reviews:
   */
  isAdminReview: {
    type: Boolean,
    default: false,
  },

  // References to “scope”
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    index: true,
  },
  specificCategoryVariant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpecificCategoryVariant',
    index: true,
  },
  specificCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpecificCategory',
    index: true,
  },

  /**
   * For user-submitted reviews, you can store a reference to the Order 
   */
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },

  /**
   * Whether the review is live or not.
   */
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },

  // Custom date fields (instead of timestamps: true)
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt automatically on every save.
ReviewSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Example validations (unchanged)
ReviewSchema.pre('validate', function (next) {
  if (!this.isAdminReview) {
    // User review => Must have a product reference
    if (!this.product) {
      return next(new Error('User-generated reviews must include a product reference.'));
    }
  } else {
    // Admin review => Must have at least one reference
    if (!this.product && !this.specificCategoryVariant && !this.specificCategory) {
      return next(
        new Error(
          'Admin-generated review must have at least one reference: product, specificCategoryVariant, or specificCategory.'
        )
      );
    }
  }
  next();
});

module.exports = mongoose.models.Review || mongoose.model('Review', ReviewSchema);