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

    deadline: {
      type: Date,
      default: null,
    },

    priority: {
      type: String,
      enum: ["medium", "urgent"],
      default: "medium",
      index: true,
    },

    priorityOrder: {
      type: String,
      required: true,
      index: true,
      default:'zzzzz', // Default to a high value for new goals
    },

    history: {
      type: [GoalHistorySchema],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AdminGoal || mongoose.model("AdminGoal", AdminGoalSchema);
