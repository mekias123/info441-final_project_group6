const express = require("express");
const router = express.Router();

// All routes here will start with the path /api.

const projectRoutes = require("./api/controllers/projects");
router.use("/project", projectRoutes);

const reviewRoutes = require("./api/controllers/reviews");
router.use("/review", reviewRoutes);

const annotationRoutes = require("./api/controllers/annotations");
router.use("/annotation", annotationRoutes);

module.exports = router;