const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const Annotation = require("../../../models/Annotation");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

// --- Security: Input sanitization ---
function sanitizeString(str) {
  if (typeof str !== "string") return "";
  return str.trim().replace(/[<>]/g, "").slice(0, 2000);
}

function isValidVideoRef(str) {
  // Accept http/https URLs or file names (for local drag-and-drop videos)
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    // Not a URL — accept as a file name if it looks like a video filename
    return /^[\w\s\-.()]+\.\w{2,5}$/.test(trimmed);
  }
}

// --- Security: Rate limiter for write operations ---
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Please try again later." },
});

// POST /api/annotation — create a new annotation
router.post("/", writeLimiter, async (req, res) => {
  try {
    const { projectId, videoUrl, timestamp, text, authorID } = req.body;

    if (!projectId || !videoUrl || timestamp == null || !text || !authorID) {
      return res
        .status(400)
        .json({ error: "projectId, videoUrl, timestamp, text, and authorID are required." });
    }

    const sanitizedText = sanitizeString(text);
    if (!sanitizedText) {
      return res.status(400).json({ error: "Annotation text cannot be empty." });
    }

    const sanitizedUrl = String(videoUrl).trim();
    if (!isValidVideoRef(sanitizedUrl)) {
      return res.status(400).json({ error: "Invalid video URL or file name." });
    }

    const ts = Number(timestamp);
    if (Number.isNaN(ts) || ts < 0) {
      return res.status(400).json({ error: "Timestamp must be a non-negative number." });
    }

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ error: "Invalid project ID format." });
    }

    const project = await req.project_model.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    const annotation = new Annotation({
      projectId,
      videoUrl: sanitizedUrl,
      timestamp: ts,
      text: sanitizedText,
      authorID: sanitizeString(authorID),
    });

    const saved = await annotation.save();
    return res.status(201).json(saved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/annotation/:projectId — list annotations for a project
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { videoUrl } = req.query;

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ error: "Invalid project ID format." });
    }

    const filter = { projectId };
    if (videoUrl) {
      filter.videoUrl = String(videoUrl).trim();
    }

    const annotations = await Annotation.find(filter).sort({ timestamp: 1 });
    return res.json(annotations);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/annotation/:annotationId — delete own annotation only
router.delete("/:annotationId", writeLimiter, async (req, res) => {
  try {
    const { annotationId } = req.params;
    const { authorID } = req.body;

    if (!isValidObjectId(annotationId)) {
      return res.status(400).json({ error: "Invalid annotation ID format." });
    }

    if (!authorID) {
      return res.status(400).json({ error: "authorID is required." });
    }

    const annotation = await Annotation.findById(annotationId);
    if (!annotation) {
      return res.status(404).json({ error: "Annotation not found." });
    }

    if (annotation.authorID !== String(authorID).trim()) {
      return res.status(403).json({ error: "You can only delete your own annotations." });
    }

    await Annotation.findByIdAndDelete(annotationId);
    return res.json({ message: "Annotation deleted." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
