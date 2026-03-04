const express = require("express");
const router = express.Router();
const Review = require("../../../models/Review");

// POST /api/review
// Body: { projectId, reviewerID, revieweeID, rating, comment? }
router.post("/", async (req, res) => {
  try {
    const { projectId, reviewerID, revieweeID, rating, comment } = req.body;

    if (!projectId || !reviewerID || !revieweeID || rating == null) {
      return res.status(400).json({
        error: "projectId, reviewerID, revieweeID, and rating are required.",
      });
    }

    const ratingNum = Number(rating);
    if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: "rating must be a number 1-5." });
    }

    const project = await req.project_model.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    const review = new Review({
      projectId,
      reviewerID: String(reviewerID).trim(),
      revieweeID: String(revieweeID).trim(),
      rating: ratingNum,
      comment: comment ? String(comment).trim() : "",
    });

    const saved = await review.save();
    return res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Review already exists for this project (same reviewer + reviewee).",
      });
    }
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/review/:userId
// Returns: { userId, averageRating, count, reviews: [...] }
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ revieweeID: String(userId) }).sort({
      createdAt: -1,
    });

    const count = reviews.length;
    const avg =
      count === 0
        ? 0
        : reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / count;

    return res.json({
      userId: String(userId),
      averageRating: Math.round(avg * 10) / 10,
      count,
      reviews,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;