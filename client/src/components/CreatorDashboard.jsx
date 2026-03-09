import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function fetchJSON(route, options) {
  const res = await fetch(route, {
    method: options?.method || "GET",
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

export default function CreatorDashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [message, setMessage] = useState(null);
  const [creatorID, setCreatorID] = useState("");

  const [reviewProjectId, setReviewProjectId] = useState(null);
  const [reviewEditorID, setReviewEditorID] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  async function loadProjects() {
    if (!creatorID.trim()) {
      setProjects([]);
      return setMessage("Enter your Creator ID to manage your own project listings.");
    }

    // status=all lets creators see jobs even after they're closed from public board
    // const { ok, data } = await fetchJSON(`${API}/api/project?status=all`);
    const { ok, data } = await fetchJSON(`${API}/api/project?status=all&creatorID=${encodeURIComponent(creatorID.trim())}`);
    if (!ok) return setMessage(data?.error || "Failed to load projects.");
    // setProjects(data || []);
    setProjects(Array.isArray(data) ? data : []);
    setMessage(null);
  }

  async function loadProposals(projectId) {
    const { ok, data } = await fetchJSON(`${API}/api/project/${projectId}/proposals`);
    if (!ok) return setMessage(data?.error || "Failed to load proposals.");
    setProposals(data || []);
  }

  useEffect(() => {
    if (!creatorID.trim()) return;
    loadProjects();
  }, [creatorID]);

  async function manageProject(projectId) {
    setSelectedProjectId(projectId);
    setMessage(null);
    await loadProposals(projectId);
  }

  async function acceptProposal(projectId, proposalId) {
    setMessage(null);
    const { ok, data } = await fetchJSON(
      `${API}/api/project/${projectId}/proposals/${proposalId}/accept`,
      {
        method: "PATCH",
        // body: { allowMultiple: false }, // set true if you want to accept multiple without rejecting others
        body: { allowMultiple: false, creatorID: creatorID.trim() },
      }
    );

    if (!ok) return setMessage(data?.error || "Failed to accept proposal.");

    setMessage("Accepted editor. Job is now closed from the public posting board.");
    // refresh
    await loadProjects();
    await loadProposals(projectId);
  }

  async function submitReview(projectId) {
    setMessage(null);

    if (!creatorID.trim()) {
      return setMessage("Enter your Creator ID before submitting a review.");
    }

    if (!reviewEditorID.trim()) {
      return setMessage("No assigned editor found for this project.");
    }

    const { ok, data } = await fetchJSON(`${API}/api/review`, {
      method: "POST",
      body: {
        projectId,
        reviewerID: creatorID.trim(),
        revieweeID: reviewEditorID.trim(),
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      },
    });

    if (!ok) return setMessage(data?.error || "Failed to submit review.");

    setMessage("Review submitted successfully.");
    setReviewProjectId(null);
    setReviewEditorID("");
    setReviewRating(5);
    setReviewComment("");
  }

  const selectedProject = projects.find((p) => p._id === selectedProjectId);

  function formatAssignedEditors(project) {
    if (!project) return "-";

    if (Array.isArray(project.assignedEditorIDs)) {
      const joined = project.assignedEditorIDs.filter(Boolean).join(", ");
      if (joined) return joined;
    }

    if (typeof project.assignedEditorIDs === "string" && project.assignedEditorIDs.trim()) {
      return project.assignedEditorIDs.trim();
    }

    if (typeof project.assignedEditorID === "string" && project.assignedEditorID.trim()) {
      return project.assignedEditorID.trim();
    }

    return "-";
  }

  return (
    <div style={{ padding: 16, border: "1px solid #ddd", margin: "16px 0" }}>
      <h2>Creator Dashboard (Manage Applications)</h2>

      {message && <div style={{ marginBottom: 12 }}>{message}</div>}

      {/* <button onClick={loadProjects}>Refresh Projects</button> */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="creator-dashboard-id">Your Creator ID: </label>
        <input
          id="creator-dashboard-id"
          value={creatorID}
          onChange={(e) => setCreatorID(e.target.value)}
          placeholder="Enter Creator ID"
          style={{ marginRight: 8 }}
        />
        <button onClick={loadProjects}>Load My Projects</button>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <h3>Your Projects</h3>

          <table border="1" cellPadding="6" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Accepted Editor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p._id}>
                  <td>{p.title}</td>
                  <td>{p.status}</td>
                  <td>{formatAssignedEditors(p)}</td>
                  <td>
                    {/* <button onClick={() => manageProject(p._id)}>
                      Manage Applications
                    </button> */}
                    <button onClick={() => manageProject(p._id)}>Manage Applications</button>
                    {formatAssignedEditors(p) !== "-" && (
                      <button
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                          setReviewProjectId(p._id);
                          setReviewEditorID(formatAssignedEditors(p));
                          setReviewRating(5);
                          setReviewComment("");
                          setMessage(null);
                        }}
                      >
                        Leave Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan="4">No projects yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Applications</h3>

          {!selectedProjectId && <div>Select a project to view proposals.</div>}

          {selectedProjectId && (
            <>
              <div style={{ marginBottom: 8 }}>
                <strong>{selectedProject?.title}</strong>
                <div>Status: {selectedProject?.status}</div>
              </div>

              {proposals.length === 0 && <div>No proposals yet.</div>}

              {proposals.map((pr) => (
                <div
                  key={pr._id}
                  style={{
                    border: "1px solid #ccc",
                    padding: 10,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    {/* <strong>{pr.editorID}</strong>{" "}
                    <span style={{ opacity: 0.7 }}>({pr.status})</span> */}
                    <strong>{pr.editorID}</strong> <span style={{ opacity: 0.7 }}>({pr.status})</span>
                  </div>
                  <div style={{ marginTop: 6 }}>{pr.coverLetter}</div>

                  <div style={{ marginTop: 8 }}>
                    <button
                      // disabled={pr.status === "accepted" || selectedProject?.status === "completed"}
                      disabled={
                        pr.status === "accepted" ||
                        selectedProject?.status === "completed" ||
                        selectedProject?.status === "in-progress" ||
                        selectedProject?.status === "closed"
                      }
                      onClick={() => acceptProposal(selectedProjectId, pr._id)}
                    >
                      Choose This Editor & Close Listing
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {reviewProjectId && (
            <div
              style={{
                marginTop: 16,
                border: "1px solid #ccc",
                padding: 12,
              }}
            >
              <h3>Leave Review</h3>
              <div style={{ marginBottom: 8 }}>
                <strong>Project ID:</strong> {reviewProjectId}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Editor:</strong> {reviewEditorID}
              </div>
              <div style={{ marginBottom: 8 }}>
                <label htmlFor="review-rating">Rating: </label>
                <select
                  id="review-rating"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  style={{ marginLeft: 8 }}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>
              <div style={{ marginBottom: 8 }}>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Write a short review"
                  rows={4}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <button onClick={() => submitReview(reviewProjectId)}>Submit Review</button>
                <button
                  onClick={() => {
                    setReviewProjectId(null);
                    setReviewEditorID("");
                    setReviewRating(5);
                    setReviewComment("");
                    setMessage(null);
                  }}
                  style={{ marginLeft: 8 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}