import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function fetchJSON(route, options) {
  const response = await fetch(route, {
    method: options?.method || "GET",
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { ok: response.ok, data };
}

export default function ProjectChat({ projectId, userId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const normalizedUserId = useMemo(() => String(userId || "").trim(), [userId]);

  async function loadMessages() {
    if (!projectId || !normalizedUserId) {
      setMessages([]);
      return;
    }

    const { ok, data } = await fetchJSON(
      `${API}/api/project/${projectId}/chatroom/messages?userID=${encodeURIComponent(normalizedUserId)}`
    );

    if (!ok) {
      setError(data?.error || "Failed to load chat.");
      return;
    }

    setError("");
    setMessages(data?.messages || []);
  }

  useEffect(() => {
    loadMessages();

    if (!projectId || !normalizedUserId) return undefined;

    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [projectId, normalizedUserId]);

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || !normalizedUserId || !projectId) return;

    const { ok, data } = await fetchJSON(`${API}/api/project/${projectId}/chatroom/messages`, {
      method: "POST",
      body: {
        senderID: normalizedUserId,
        text: trimmed,
      },
    });

    if (!ok) {
      setError(data?.error || "Failed to send message.");
      return;
    }

    setText("");
    setError("");
    await loadMessages();
  }

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginTop: 8 }}>
      <h4 style={{ margin: "0 0 8px" }}>Project Chat</h4>
      <div style={{ fontSize: "0.85rem", opacity: 0.75, marginBottom: 8 }}>
        Real-time updates refresh every 2 seconds.
      </div>

      {error && <div style={{ color: "#b00020", marginBottom: 8 }}>{error}</div>}

      <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #eee", padding: 8 }}>
        {messages.length === 0 && <div>No messages yet.</div>}
        {messages.map((m) => (
          <div key={m._id} style={{ marginBottom: 6 }}>
            <strong>{m.senderID}</strong>: {m.text}
            <div style={{ fontSize: "0.75rem", opacity: 0.65 }}>
              {new Date(m.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          style={{ flex: 1 }}
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
