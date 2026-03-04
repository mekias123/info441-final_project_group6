import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function PostingBoard() {
  const [postsJson, setPostsJson] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [editorID, setEditorID] = useState("");
  const [proposalsByProjectId, setProposalsByProjectId] = useState({});
  const [ratingByCreatorId, setRatingByCreatorId] = useState({}); // { creatorID: { averageRating, count } }

  async function fetchPosts() {
    try {
      const titleVal = document.getElementById("title")?.value || "";
      const creatorIdVal = document.getElementById("creator-id")?.value || "";
      const budgetMinVal = document.getElementById("budget-min")?.value || "";
      const budgetMaxVal = document.getElementById("budget-max")?.value || "";
      const isOpenChecked = document.getElementById("is-open")?.checked;

      const params = new URLSearchParams();
      if (titleVal.trim()) params.append("title", titleVal.trim());
      if (creatorIdVal) params.append("creatorID", creatorIdVal);
      if (budgetMinVal) params.append("budgetMin", budgetMinVal);
      if (budgetMaxVal) params.append("budgetMax", budgetMaxVal);

      if (typeof isOpenChecked === "boolean") {
        params.append("isOpen", isOpenChecked ? "true" : "false");
      }

      const url =
        `${API}/api/project` + (params.toString() ? `?${params.toString()}` : "");
      const data = await fetchJSON(url);
      const projects = data || [];
      setPostsJson(projects);

      // fetch ratings for any creatorIDs present
      const creatorIds = Array.from(
        new Set(projects.map((p) => p.creatorID).filter((id) => id !== null && typeof id !== "undefined" && String(id).trim() !== "")),
      );

      const ratingMap = {};
      await Promise.all(
        creatorIds.map(async (creatorId) => {
          try {
            const r = await fetchJSON(`${API}/api/review/${creatorId}`);
            ratingMap[String(creatorId)] = {
              averageRating: r?.averageRating ?? 0,
              count: r?.count ?? 0,
            };
          } catch {
            ratingMap[String(creatorId)] = { averageRating: 0, count: 0 };
          }
        }),
      );

      setRatingByCreatorId(ratingMap);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  async function applyToProject(projectId) {
    if (!editorID.trim() || !coverLetter.trim()) {
      alert("Editor ID and cover letter required");
      return;
    }

    try {
      const response = await fetchJSON(`${API}/api/project/${projectId}/proposals`, {
        method: "POST",
        body: {
          editorID: editorID.trim(),
          coverLetter: coverLetter.trim(),
          proposedRate: null,
        },
      });

      if (response?.error) {
        alert(response.error);
        return;
      }

      setCoverLetter("");
      setEditorID("");
      setActiveProjectId(null);

      await viewProposals(projectId);
    } catch (err) {
      console.error(err);
    }
  }

  async function viewProposals(projectId) {
    try {
      const data = await fetchJSON(`${API}/api/project/${projectId}/proposals`);
      setProposalsByProjectId((prev) => ({
        ...prev,
        [projectId]: data || [],
      }));
    } catch (err) {
      console.error(err);
    }
  }

  function renderCreatorRating(creatorID) {
    if (creatorID === null || typeof creatorID === "undefined" || String(creatorID).trim() === "") {
      return "No creator";
    }

    const info = ratingByCreatorId[String(creatorID)];
    if (!info || !info.count) return "No reviews";
    return `${info.averageRating} (${info.count})`;
  }

  return (
    <div id="posting-board">
      <h1>Posting Board:</h1>

      <button onClick={fetchPosts}>Refresh/Search</button>

      <label htmlFor="title">Title:</label>
      <input type="text" id="title" name="title" />

      <label htmlFor="creator-id">Creator ID:</label>
      <input type="text" id="creator-id" name="creatorID" />

      <label htmlFor="budget-min">Budget Min:</label>
      <input type="number" id="budget-min" name="budgetMin" />

      <label htmlFor="budget-max">Budget Max:</label>
      <input type="number" id="budget-max" name="budgetMax" />

      <label htmlFor="is-open">Is Open?:</label>
      <input type="checkbox" id="is-open" name="isOpen" defaultChecked />

      <table border="1">
        <thead>
          <tr>
            <th>Posting Title</th>
            <th>Creator</th>
            <th>Description</th>
            <th>Deadline</th>
            <th>Budget</th>
            <th>Status</th>
            <th>Rating</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {postsJson.map((project) => (
            <>
              <tr key={project._id}>
                <td>{project.title}</td>
                <td>{project.creatorID}</td>
                <td>{project.description}</td>
                <td>{new Date(project.deadline).toLocaleDateString()}</td>
                <td>{project.budget}</td>
                <td>{project.status}</td>
                <td>{renderCreatorRating(project.creatorID)}</td>
                <td>
                  <button onClick={() => setActiveProjectId(project._id)}>Apply</button>
                  <button onClick={() => viewProposals(project._id)}>View Proposals</button>
                </td>
              </tr>

              {activeProjectId === project._id && (
                <tr>
                  <td colSpan="8">
                    <input
                      placeholder="Editor ID"
                      value={editorID}
                      onChange={(e) => setEditorID(e.target.value)}
                    />
                    <br />
                    <textarea
                      placeholder="Cover letter..."
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                    />
                    <br />
                    <button onClick={() => applyToProject(project._id)}>Submit Application</button>
                  </td>
                </tr>
              )}

              {proposalsByProjectId[project._id] && (
                <tr>
                  <td colSpan="8">
                    <strong>Proposals:</strong>
                    {proposalsByProjectId[project._id].length === 0 && (
                      <div>No proposals yet.</div>
                    )}
                    {proposalsByProjectId[project._id].map((p) => (
                      <div key={p._id}>
                        <strong>{p.editorID}</strong> ({p.status}): {p.coverLetter}
                      </div>
                    ))}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function fetchJSON(route, options) {
  const response = await fetch(route, {
    method: options?.method || "GET",
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
  });

  let responseJson;
  try {
    responseJson = await response.json();
  } catch {
    responseJson = null;
  }
  return responseJson;
}