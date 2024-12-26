// /models/Product.js
const mongoose = require('mongoose');

function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 200,
      index: true,
      set: toTitleCase, 
    },
    images: [
      {
        type: String,
      },
    ],
    title: {
      type: String,
      required: true,
      maxlength: 200,
      set: toTitleCase, 
    },
    mainTags: [
      {
        type: String,
      },
    ],
    pageSlug: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      enum: ['Wraps', 'Accessories'],
      required: true,
      index: true,
    },
    subCategory: {
      type: String,
      enum: ['Bike Wraps', 'Car Wraps', 'Safety'],
      required: true,
      index: true,
    },
    specificCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpecificCategory',
      index: true,
    },
    specificCategoryVariant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpecificCategoryVariant',
      index: true,
    },
    deliveryCost: {
      type: Number,
      default: 100,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    sku: {
      type: String,
      unique: true,
      required: true,
    },
    designTemplate:{
      designCode: {
        type: String,
        required: true,
      },
      imageUrl: {
        type: String,
        required: true,
      }
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
      },
    ],
    displayOrder: {
      type: Number,
      index: true,
    },
    ratings: {
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      numberOfRatings: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ProductSchema.index(
  {
    title: 'text',
    searchKeywords: 'text',
    mainTags: 'text',
    description: 'text',
  },
  {
    weights: {
      title: 5,
      mainTags: 3,
      description: 1,
    },
    name: 'TextIndex',
  }
);

// Compound Unique Indexes for (Variant + Name) and (Variant + Title)
ProductSchema.index(
  { specificCategoryVariant: 1, name: 1 },
  { unique: true, name: 'VariantNameUnique', collation: { locale: 'en', strength: 2 } }
);
ProductSchema.index(
  { specificCategoryVariant: 1, title: 1 },
  { unique: true, name: 'VariantTitleUnique', collation: { locale: 'en', strength: 2 } }
);





module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
