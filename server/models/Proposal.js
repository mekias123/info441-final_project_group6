const mongoose = require("mongoose");

const proposalSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    editorID: {
      type: String,
      required: true,
    },
    coverLetter: {
      type: String,
      required: true,
    },
    proposedRate: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Prevent duplicate applications per editor per project
proposalSchema.index({ projectId: 1, editorID: 1 }, { unique: true });

module.exports = mongoose.model("Proposal", proposalSchema);