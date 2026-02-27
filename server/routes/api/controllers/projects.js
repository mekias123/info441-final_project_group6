const express = require('express');
const router = express.Router();

const Proposal = require("../../../models/Proposal");

// All routes here will start with the path /api/project
// Note to the person who implemented job submission: 
//     Don't create a new route for creation (ex:router.post('/create'))
//     , the request type (POST, GET, etc.) is meant to clarify that for you

router.post('/', async (req, res) => {
    try {
        const { title, description, deadline, budget } = req.body;

        if (!title || !description || !deadline || budget == null) {
            return res.status(400).json({ error: 'Title, description, deadline, and budget are required.' });
        }

        const project = new req.project_model({ title, description, deadline, budget });
        const saved = await project.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// router.get('/', async (req, res) => {
//     console.log("Project posting Requested")
//     try {
//         const postings = await req.project_model.find()
//         res.send(postings)
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

router.get('/', async (req, res) => {
    console.log("Project posting Requested")
    try {
      const { status } = req.query;
  
      const filter = {};
      // Default behavior: only show open postings (so accepted jobs disappear)
      if (!status || status === "open") filter.status = "open";
      else if (status !== "all") filter.status = status;
  
      const postings = await req.project_model.find(filter).sort({ createdAt: -1 });
      res.send(postings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});

/**
 * P0 MVP: Editor applies to a project (creates a proposal)
 * POST /api/project/:projectId/proposals
 * Body: { editorID, coverLetter, proposedRate? }
 */
router.post('/:projectId/proposals', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { editorID, coverLetter, proposedRate } = req.body;

        if (!editorID || !coverLetter) {
            return res.status(400).json({ error: "editorID and coverLetter are required." });
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
            return res.status(409).json({ error: "You already applied to this project." });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * MVP proof route: View proposals for a project
 * GET /api/project/:projectId/proposals
 */
router.get('/:projectId/proposals', async (req, res) => {
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
 *
 * Optional body:
 *   { allowMultiple?: boolean }  // default false
 *
 * - Marks selected proposal accepted
 * - Rejects other proposals unless allowMultiple=true
 * - Sets project status to "in-progress" (so it won't show on public board)
 * - Adds editorID to assignedEditorIDs and sets assignedEditorID for compatibility
 */
router.patch('/:projectId/proposals/:proposalId/accept', async (req, res) => {
    try {
      const { projectId, proposalId } = req.params;
      const allowMultiple = !!req.body?.allowMultiple;
  
      const project = await req.project_model.findById(projectId);
      if (!project) return res.status(404).json({ error: "Project not found." });
  
      if (project.status === "completed") {
        return res.status(400).json({ error: "Project is completed; cannot accept proposals." });
      }
  
      const proposal = await Proposal.findOne({ _id: proposalId, projectId });
      if (!proposal) return res.status(404).json({ error: "Proposal not found for this project." });
  
      if (proposal.status === "accepted") {
        // Already accepted; still ensure project is closed from public board
        if (project.status === "open") project.status = "in-progress";
        if (!project.assignedEditorIDs.includes(proposal.editorID)) {
          project.assignedEditorIDs.push(proposal.editorID);
        }
        project.assignedEditorID = project.assignedEditorID || proposal.editorID;
        await project.save();
        return res.json({ project, acceptedProposal: proposal });
      }
  
      // Accept this proposal
      proposal.status = "accepted";
      await proposal.save();
  
      // Close the job listing from the public board
      project.status = "in-progress";
  
      // Save accepted editor(s)
      if (!project.assignedEditorIDs.includes(proposal.editorID)) {
        project.assignedEditorIDs.push(proposal.editorID);
      }
      // compatibility for older UI/code
      project.assignedEditorID = project.assignedEditorID || proposal.editorID;
  
      await project.save();
  
      // Reject all other proposals by default (this is what "closing the job" means)
      if (!allowMultiple) {
        await Proposal.updateMany(
          { projectId, _id: { $ne: proposal._id }, status: { $ne: "accepted" } },
          { $set: { status: "rejected" } }
        );
      }
  
      // Return fresh data
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