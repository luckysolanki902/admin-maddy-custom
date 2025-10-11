import mongoose from "mongoose";

const SiteUpdateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    effectiveAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
  }
);

const SiteUpdate = mongoose.models.SiteUpdate || mongoose.model("SiteUpdate", SiteUpdateSchema);

export default SiteUpdate;
