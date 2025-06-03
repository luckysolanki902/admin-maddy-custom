// models/Offer.js

const mongoose = require("mongoose");

// A minimal condition schema
const ConditionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["cart_value", "item_count", "first_order", "order_count_by_user"],
    },
    operator: { type: String, required: true, enum: [">=", "<=", "==", "!=", ">", "<"] },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

// Action schema now only has percent/fixed **or** a multi-component bundle
const ActionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["discount_percent", "discount_fixed", "bundle"], // (bundle like: buy 3 tank wraps at 999 or buy 2 pillar wraps and 1 tank wrap at 1699)
    },

    // for percent/fixed
    discountValue: { type: Number, default: 0 },

    // for bundle
    bundlePrice: { type: Number, default: 0 },

    // *list* of components required by the bundle
    bundleComponents: {
      type: [
        {
          // how to match this component (a category, product ID, or variant ID)
          scope: {
            type: String,
            required: true,
            enum: ["category"], // category here refers to specificCategory
          },
          // one or more IDs in that scope
          scopeValue: {
            type: [mongoose.Schema.Types.ObjectId],
            required: true,
          },
          // how many of this component are needed in *one* bundle
          quantity: {
            type: Number,
            required: true,
            min: 1,
          },
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

const OfferSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200, unique: true },
    description: { type: String, maxlength: 1000 },

    // URL slug for bundle/combo offers
    slug: { type: String, trim: true, lowercase: true, index: true, default: null },

    isActive: { type: Boolean, default: true, index: true },
    validFrom: { type: Date, required: true, default: Date.now },
    validUntil: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return value > this.validFrom;
        },
        message: "validUntil must be after validFrom",
      },
    },

    conditionMessage: { type: String, default: "" },

    autoApply: { type: Boolean, default: false },
    allowStacking: { type: Boolean, default: false },

    conditions: { type: [ConditionSchema], default: [] },
    actions: { type: [ActionSchema], default: [] },

    couponCodes: [{ type: String, uppercase: true, trim: true, maxlength: 20 }],
    discountCap: { type: Number, default: Infinity },
  },
  { timestamps: true }
);

OfferSchema.index({ name: "text", description: "text" });

OfferSchema.pre("save", function (next) {
  // Convert string dates to Date objects if necessary
  if (this.validFrom && typeof this.validFrom === 'string') {
    this.validFrom = new Date(this.validFrom);
  }
  
  if (this.validUntil && typeof this.validUntil === 'string') {
    this.validUntil = new Date(this.validUntil);
  }

  // Validate dates are valid
  if (this.validFrom && isNaN(this.validFrom.getTime())) {
    return next(new Error('Invalid validFrom date'));
  }
  
  if (this.validUntil && isNaN(this.validUntil.getTime())) {
    return next(new Error('Invalid validUntil date'));
  }

  const nameArr = this.name
    .split(" ")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  this.name = nameArr.join(" ");

  this.slug = this.actions[0].type === "bundle" ? nameArr.map(word => word.toLowerCase()).join("-") : null;
  next();
});

OfferSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  // Handle date conversion for updates
  if (update.validFrom && typeof update.validFrom === 'string') {
    update.validFrom = new Date(update.validFrom);
  }
  
  if (update.validUntil && typeof update.validUntil === 'string') {
    update.validUntil = new Date(update.validUntil);
  }

  if (update.$set) {
    if (update.$set.validFrom && typeof update.$set.validFrom === 'string') {
      update.$set.validFrom = new Date(update.$set.validFrom);
    }
    
    if (update.$set.validUntil && typeof update.$set.validUntil === 'string') {
      update.$set.validUntil = new Date(update.$set.validUntil);
    }
  }

  // Validate converted dates
  const validFromDate = update.validFrom || update.$set?.validFrom;
  const validUntilDate = update.validUntil || update.$set?.validUntil;

  if (validFromDate && isNaN(validFromDate.getTime())) {
    return next(new Error('Invalid validFrom date'));
  }
  
  if (validUntilDate && isNaN(validUntilDate.getTime())) {
    return next(new Error('Invalid validUntil date'));
  }

  const name = update.name || update.$set?.name;
  const actions = update.actions || update.$set?.actions;

  if (name && actions[0].type !== "bundle") {
    const formattedName = name
      .split(" ")
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    if (update.name) {
      update.name = formattedName;
    } else if (update.$set && update.$set.name) {
      update.$set.name = formattedName;
    }
  }

  next();
});

module.exports = mongoose.models.Offer || mongoose.model("Offer", OfferSchema);
