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

router.get('/', async (req, res) => {
    console.log("Project posting Requested")
    try {
        const postings = await req.project_model.find()
        // console.log(postings)
        res.send(postings)
        // return postings;
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

        // Optional: check project exists (helps avoid junk proposals)
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
        // Duplicate application (if Proposal model has unique index)
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

        // Optional: check project exists
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

module.exports = router;