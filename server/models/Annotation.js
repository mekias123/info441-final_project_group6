const mongoose = require("mongoose");

const annotationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Number,
      required: true,
      min: 0,
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    authorID: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

annotationSchema.index({ projectId: 1, videoUrl: 1, timestamp: 1 });

module.exports = mongoose.model("Annotation", annotationSchema);
