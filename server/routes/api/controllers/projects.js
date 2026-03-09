const express = require("express");
const router = express.Router();

const Proposal = require("../../../models/Proposal");
const Review = require("../../../models/Review");
const chatRoutes = require("./chat");

// All routes here will start with the path /api/project

router.use("/:projectId/chatroom", chatRoutes);

router.post("/", async (req, res) => {
  try {
    const { title, description, deadline, budget, creatorID } = req.body;

    if (!title || !description || !deadline || budget == null) {
      return res.status(400).json({
        error: "Title, description, deadline, and budget are required.",
      });
    }

    // coerce creatorID to string when saving so it matches the schema
    const projectData = { title, description, deadline, budget };
    if (typeof creatorID !== "undefined" && creatorID !== null) {
      projectData.creatorID = String(creatorID);
    }

    const project = new req.project_model(projectData);
    const saved = await project.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  console.log("Project posting Requested");
  try {
    const { status, title, budgetMin, budgetMax, isOpen, creatorID } = req.query;

    const filter = {};

    if (typeof isOpen !== "undefined") {
      if (isOpen === "true") {
        filter.status = "open";
      } else if (isOpen === "false") {
        filter.status = { $ne: "open" };
      }
    } else {
      // Default behavior: only show open postings (so accepted jobs disappear)
      if (!status || status === "open") filter.status = "open";
      else if (status !== "all") filter.status = status;
    }

    if (title && String(title).trim()) {
      filter.title = { $regex: String(title).trim(), $options: "i" };
    }

    if (typeof creatorID !== "undefined" && creatorID !== "") {
      filter.creatorID = String(creatorID);
    }

    if (budgetMin || budgetMax) {
      filter.budget = {};
      if (budgetMin) {
        const min = Number(budgetMin);
        if (!Number.isNaN(min)) filter.budget.$gte = min;
      }
      if (budgetMax) {
        const max = Number(budgetMax);
        if (!Number.isNaN(max)) filter.budget.$lte = max;
      }
      if (Object.keys(filter.budget).length === 0) delete filter.budget;
    }

    const postings = await req.project_model
      .find(filter)
      .sort({ createdAt: -1 });

    // Attach creator rating to each project (based on reviews where revieweeID = creatorID)
    const creatorIds = Array.from(
      new Set(
        postings
          .map((p) => (p.creatorID == null ? null : String(p.creatorID).trim()))
          .filter((id) => id)
      )
    );

    let ratingsByCreator = {};
    if (creatorIds.length > 0) {
      const agg = await Review.aggregate([
        { $match: { revieweeID: { $in: creatorIds } } },
        {
          $group: {
            _id: "$revieweeID",
            avg: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ]);

      for (const row of agg) {
        ratingsByCreator[String(row._id)] = {
          averageRating: Math.round((row.avg || 0) * 10) / 10,
          reviewCount: row.count || 0,
        };
      }
    }

    const postingsWithRatings = postings.map((p) => {
      const cid = p.creatorID == null ? "" : String(p.creatorID).trim();
      const r = ratingsByCreator[cid] || { averageRating: 0, reviewCount: 0 };

      return {
        ...p.toObject(),
        averageRating: r.averageRating,
        reviewCount: r.reviewCount,
      };
    });

    res.send(postingsWithRatings);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * P0 MVP: Editor applies to a project (creates a proposal)
 * POST /api/project/:projectId/proposals
 * Body: { editorID, coverLetter, proposedRate? }
 */
router.post("/:projectId/proposals", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { editorID, coverLetter, proposedRate } = req.body;

    if (!editorID || !coverLetter) {
      return res
        .status(400)
        .json({ error: "editorID and coverLetter are required." });
    }

    const project = await req.project_model.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    const proposal = new Proposal({
      projectId,
      editorID,
      coverLetter,
      proposedRate: proposedRate ?? null,
    });

    const saved = await proposal.save();
    res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "You already applied to this project." });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * MVP proof route: View proposals for a project
 * GET /api/project/:projectId/proposals
 */
router.get("/:projectId/proposals", async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await req.project_model.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    const proposals = await Proposal.find({ projectId }).sort({ createdAt: -1 });
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Creator accepts an editor (proposal) -> closes job from public board
 * PATCH /api/project/:projectId/proposals/:proposalId/accept
 */
router.patch("/:projectId/proposals/:proposalId/accept", async (req, res) => {
  try {
    const { projectId, proposalId } = req.params;
    const allowMultiple = !!req.body?.allowMultiple;
    const creatorID = req.body?.creatorID == null ? "" : String(req.body.creatorID).trim();

    const project = await req.project_model.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found." });

    if (!creatorID) {
      return res.status(400).json({ error: "creatorID is required to accept a proposal." });
    }

    if (String(project.creatorID || "").trim() !== creatorID) {
      return res.status(403).json({ error: "Only the project creator can accept a proposal." });
    }

    if (project.status === "completed") {
      return res
        .status(400)
        .json({ error: "Project is completed; cannot accept proposals." });
    }

    const proposal = await Proposal.findOne({ _id: proposalId, projectId });
    if (!proposal)
      return res.status(404).json({ error: "Proposal not found for this project." });

    if (proposal.status === "accepted") {
      // if (project.status === "open") project.status = "in-progress";
      if (project.status === "open") project.status = "closed";
      if (!project.assignedEditorIDs.includes(proposal.editorID)) {
        project.assignedEditorIDs.push(proposal.editorID);
      }
      project.assignedEditorID = project.assignedEditorID || proposal.editorID;
      await project.save();
      return res.json({ project, acceptedProposal: proposal });
    }

    proposal.status = "accepted";
    await proposal.save();

    project.status = "closed";

    if (!project.assignedEditorIDs.includes(proposal.editorID)) {
      project.assignedEditorIDs.push(proposal.editorID);
    }
    project.assignedEditorID = project.assignedEditorID || proposal.editorID;

    await project.save();

    if (!allowMultiple) {
      await Proposal.updateMany(
        { projectId, _id: { $ne: proposal._id }, status: { $ne: "accepted" } },
        { $set: { status: "rejected" } }
      );
    }

    const proposals = await Proposal.find({ projectId }).sort({ createdAt: -1 });

    res.json({
      project,
      acceptedProposal: proposal,
      proposals,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;