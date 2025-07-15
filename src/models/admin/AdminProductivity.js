import mongoose from "mongoose";

const productivitySchema = new mongoose.Schema(
  {
    user: {
      clerkUserId: { type: String, required: true, index: true },
      name: { type: String, required: true },
      email: { type: String, required: true, index: true },
    },
    department: { type: String, required: true, index: true },
    todayWork: { type: String, required: true },
    tomorrowGoal: { type: String, required: true },
    efficiencyRating: { type: Number, required: true, min: 1, max: 5 },
    reasonLowRating: { type: String, default: null },
    willAchieveGoal: { type: Boolean, required: true },
    reasonNotAchieving: { type: String, default: null },
    // Design department specific field
    followedCreativeCalendar: { type: Boolean, default: null },
    creativeCalendarDeviation: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Productivity || mongoose.model("Productivity", productivitySchema);
