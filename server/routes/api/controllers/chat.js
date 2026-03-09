const express = require("express");
const router = express.Router({ mergeParams: true });

const ChatRoom = require("../../../models/ChatRoom");
const ChatMessage = require("../../../models/ChatMessage");

function normalizeUserId(value) {
  if (value === null || typeof value === "undefined") return "";
  return String(value).trim();
}

function getParticipantsFromProject(project) {
  const participantSet = new Set();

  const creatorId = normalizeUserId(project.creatorID);
  if (creatorId) participantSet.add(creatorId);

  const singleEditorId = normalizeUserId(project.assignedEditorID);
  if (singleEditorId) participantSet.add(singleEditorId);

  (project.assignedEditorIDs || []).forEach((editorId) => {
    const normalized = normalizeUserId(editorId);
    if (normalized) participantSet.add(normalized);
  });

  return Array.from(participantSet);
}

async function getProjectOr404(projectModel, projectId, res) {
  const project = await projectModel.findById(projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return null;
  }
  return project;
}

async function getOrCreateRoom(project) {
  const participantIDs = getParticipantsFromProject(project);

  const room = await ChatRoom.findOneAndUpdate(
    { projectId: project._id },
    {
      $setOnInsert: { projectId: project._id },
      $set: { participantIDs },
    },
    { new: true, upsert: true }
  );

  return room;
}

router.get("/", async (req, res) => {
  try {
    const { projectId } = req.params;
    const userID = normalizeUserId(req.query.userID);

    const project = await getProjectOr404(req.project_model, projectId, res);
    if (!project) return;

    const room = await getOrCreateRoom(project);

    if (userID && !room.participantIDs.includes(userID)) {
      return res.status(403).json({ error: "User is not part of this chatroom." });
    }

    return res.json(room);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/messages", async (req, res) => {
  try {
    const { projectId } = req.params;
    const userID = normalizeUserId(req.query.userID);

    if (!userID) {
      return res.status(400).json({ error: "userID query parameter is required." });
    }

    const project = await getProjectOr404(req.project_model, projectId, res);
    if (!project) return;

    const room = await getOrCreateRoom(project);

    if (!room.participantIDs.includes(userID)) {
      return res.status(403).json({ error: "User is not part of this chatroom." });
    }

    const messages = await ChatMessage.find({ roomId: room._id }).sort({ createdAt: 1 });

    return res.json({ room, messages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/messages", async (req, res) => {
  try {
    const { projectId } = req.params;
    const senderID = normalizeUserId(req.body.senderID);
    const text = normalizeUserId(req.body.text);

    if (!senderID || !text) {
      return res.status(400).json({ error: "senderID and text are required." });
    }

    const project = await getProjectOr404(req.project_model, projectId, res);
    if (!project) return;

    const room = await getOrCreateRoom(project);

    if (!room.participantIDs.includes(senderID)) {
      return res.status(403).json({ error: "Sender is not part of this chatroom." });
    }

    const message = new ChatMessage({
      roomId: room._id,
      projectId: project._id,
      senderID,
      text,
    });

    const saved = await message.save();
    return res.status(201).json(saved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
