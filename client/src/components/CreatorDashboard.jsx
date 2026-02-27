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

  async function loadProjects() {
    // status=all lets creators see jobs even after they're closed from public board
    const { ok, data } = await fetchJSON(`${API}/api/project?status=all`);
    if (!ok) return setMessage(data?.error || "Failed to load projects.");
    setProjects(data || []);
  }

  async function loadProposals(projectId) {
    const { ok, data } = await fetchJSON(`${API}/api/project/${projectId}/proposals`);
    if (!ok) return setMessage(data?.error || "Failed to load proposals.");
    setProposals(data || []);
  }

  useEffect(() => {
    loadProjects();
  }, []);

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
        body: { allowMultiple: false }, // set true if you want to accept multiple without rejecting others
      }
    );

    if (!ok) return setMessage(data?.error || "Failed to accept proposal.");

    setMessage("Accepted editor. Job is now closed from the public posting board.");
    // refresh
    await loadProjects();
    await loadProposals(projectId);
  }

  const selectedProject = projects.find((p) => p._id === selectedProjectId);

  return (
    <div style={{ padding: 16, border: "1px solid #ddd", margin: "16px 0" }}>
      <h2>Creator Dashboard (Manage Applications)</h2>

      {message && <div style={{ marginBottom: 12 }}>{message}</div>}

      <button onClick={loadProjects}>Refresh Projects</button>

      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <h3>Your Projects</h3>

          <table border="1" cellPadding="6" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Accepted Editors</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p._id}>
                  <td>{p.title}</td>
                  <td>{p.status}</td>
                  <td>{(p.assignedEditorIDs || []).join(", ") || "-"}</td>
                  <td>
                    <button onClick={() => manageProject(p._id)}>
                      Manage Applications
                    </button>
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
                    <strong>{pr.editorID}</strong>{" "}
                    <span style={{ opacity: 0.7 }}>({pr.status})</span>
                  </div>
                  <div style={{ marginTop: 6 }}>{pr.coverLetter}</div>

                  <div style={{ marginTop: 8 }}>
                    <button
                      disabled={pr.status === "accepted" || selectedProject?.status === "completed"}
                      onClick={() => acceptProposal(selectedProjectId, pr._id)}
                    >
                      Accept Editor & Close Job
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}