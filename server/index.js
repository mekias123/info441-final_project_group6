require('dotenv').config({ path: './server/.env' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const Project = require('./models/Project');

app.use((req, res, next) => {
    req.project_model = Project;
    next();
});

const Router = require("./routes/router");
app.use('/api', Router);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => console.error('MongoDB connection error:', err));