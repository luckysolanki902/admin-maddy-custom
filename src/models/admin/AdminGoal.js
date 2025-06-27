const mongoose = require("mongoose");

const GoalHistorySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["status", "edit", "created"],
      required: true,
    },

    status: {
      type: Boolean,
      required: function () {
        return this.type === "status";
      },
    },

    oldValue: {
      type: Object,
      required: function () {
        return this.type === "edit";
      },
    },

    newValue: {
      type: Object,
      required: function () {
        return this.type === "edit";
      },
    },

    modifiedAt: {
      type: Date,
      default: Date.now,
    },

    performedBy: {
      clerkUserId: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
  },
  { _id: false }
);

const AdminGoalSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: null,
    },

    isCompleted: {
      type: Boolean,
      default: false,
    },

    history: {
      type: [GoalHistorySchema],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AdminGoal || mongoose.model("AdminGoal", AdminGoalSchema);
