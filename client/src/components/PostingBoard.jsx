import { useEffect, useState } from "react";

export default function PostingBoard() {
  const [postsJson, setPostsJson] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [editorID, setEditorID] = useState("");
  const [proposalsByProjectId, setProposalsByProjectId] = useState({});

  // Fetch all projects
  async function fetchPosts() {
    try {
      const data = await fetchJSON("http://localhost:3001/api/project");
      setPostsJson(data || []);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  }

  // Load projects on first render
  useEffect(() => {
    fetchPosts();
  }, []);

  // Submit proposal
  async function applyToProject(projectId) {
    if (!editorID.trim() || !coverLetter.trim()) {
      alert("Editor ID and cover letter required");
      return;
    }

    try {
      const response = await fetchJSON(
        `http://localhost:3001/api/project/${projectId}/proposals`,
        {
          method: "POST",
          body: {
            editorID: editorID.trim(),
            coverLetter: coverLetter.trim(),
            proposedRate: null,
          },
        }
      );

      if (response?.error) {
        alert(response.error);
        return;
      }

      // Clear form and collapse
      setCoverLetter("");
      setEditorID("");
      setActiveProjectId(null);

      // Refresh proposals for this project
      await viewProposals(projectId);
    } catch (err) {
      console.error(err);
    }
  }

  // Get proposals for a project
  async function viewProposals(projectId) {
    try {
      const data = await fetchJSON(
        `http://localhost:3001/api/project/${projectId}/proposals`
      );

      setProposalsByProjectId((prev) => ({
        ...prev,
        [projectId]: data || [],
      }));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div id="posting-board">
      <h1>Posting Board:</h1>
      <button onClick={fetchPosts}>Refresh</button>

      <table border="1">
        <thead>
          <tr>
            <th>Posting Title</th>
            <th>Description</th>
            <th>Deadline</th>
            <th>Budget</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {postsJson.map((project) => (
            <>
              <tr key={project._id}>
                <td>{project.title}</td>
                <td>{project.description}</td>
                <td>{new Date(project.deadline).toLocaleDateString()}</td>
                <td>{project.budget}</td>
                <td>{project.status}</td>
                <td>
                  <button onClick={() => setActiveProjectId(project._id)}>
                    Apply
                  </button>
                  <button onClick={() => viewProposals(project._id)}>
                    View Proposals
                  </button>
                </td>
              </tr>

              {activeProjectId === project._id && (
                <tr>
                  <td colSpan="6">
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
                    <button
                      onClick={() => applyToProject(project._id)}
                    >
                      Submit Application
                    </button>
                  </td>
                </tr>
              )}

              {proposalsByProjectId[project._id] && (
                <tr>
                  <td colSpan="6">
                    <strong>Proposals:</strong>
                    {proposalsByProjectId[project._id].length === 0 && (
                      <div>No proposals yet.</div>
                    )}
                    {proposalsByProjectId[project._id].map((p) => (
                      <div key={p._id}>
                        <strong>{p.editorID}</strong>: {p.coverLetter}
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

// Utility fetch helper
async function fetchJSON(route, options) {
  let response;
  try {
    response = await fetch(route, {
      method: options?.method || "GET",
      body: options?.body ? JSON.stringify(options.body) : undefined,
      headers: options?.body
        ? { "Content-Type": "application/json" }
        : undefined,
    });
  } catch (error) {
    console.log(error);
  }

  let responseJson;
  try {
    responseJson = await response.json();
  } catch (error) {
    console.log(error);
  }

  return responseJson;
}