const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    reviewerID: { type: String, required: true }, // who wrote the review
    revieweeID: { type: String, required: true }, // who got reviewed (creator or editor)
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true },
);

// prevent duplicate reviews for same project + reviewer + reviewee
reviewSchema.index({ projectId: 1, reviewerID: 1, revieweeID: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);