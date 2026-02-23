const express = require('express');
const router = express.Router();

// All routes here will start with the path /api/project

router.post('/create', async (req, res) => {
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

router.get('/'), async (req, res) => {
    try {

        const postings = await req.Project.find({ post: postID })

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = router;
