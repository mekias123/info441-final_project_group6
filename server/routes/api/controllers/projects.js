const express = require('express');
const router = express.Router();

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

module.exports = router;
