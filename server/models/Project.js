const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    deadline: { type: Date, required: true },
    budget: { type: Number, required: true },
    creatorID: { type: String, default: null },
    assignedEditorID: { type: String, default: null },
    status: {
        type: String,
        enum: ['open', 'in-progress', 'completed'],
        default: 'open',
    },
    rawFootageLinks: { type: [String], default: [] },
    potentialEditors: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
