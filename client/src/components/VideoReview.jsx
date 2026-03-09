import { useEffect, useState, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function fetchJSON(url, options) {
  const res = await fetch(url, {
    method: options?.method || "GET",
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export default function VideoReview() {
  const [projectId, setProjectId] = useState("");
  const [authorID, setAuthorID] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [annotationText, setAnnotationText] = useState("");
  const [annotations, setAnnotations] = useState([]);
  const [message, setMessage] = useState(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);

  const videoRef = useRef(null);
  const blobUrlRef = useRef(null);
  const fileInputRef = useRef(null);

  async function loadAnnotations(pid, vurl) {
    const params = new URLSearchParams({ videoUrl: vurl });
    const { ok, data } = await fetchJSON(
      `${API}/api/annotation/${pid}?${params}`
    );
    if (ok && Array.isArray(data)) {
      setAnnotations(data);
    }
  }

  function cleanupBlobUrl() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }
  
  useEffect(() => {
    return () => cleanupBlobUrl();
  }, []);

  function handleFile(file) {
    setMessage(null);
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setMessage({ type: "error", text: "Only MP4, WebM, and OGG video files are allowed." });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: "error", text: "File too large (max 500MB)." });
      return;
    }
    cleanupBlobUrl();
    const blobUrl = URL.createObjectURL(file);
    blobUrlRef.current = blobUrl;
    setVideoUrl(blobUrl);
    setFileName(file.name);
    if (projectId.trim() && authorID.trim()) {
      setVideoLoaded(true);
      setAnnotations([]);
      loadAnnotations(projectId.trim(), file.name);
    } else {
      setMessage({ type: "error", text: "Enter Project ID and User ID, then the video will load." });
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }

  function handleFileInput(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }

  function handleLoadVideo() {
    setMessage(null);
    if (!projectId.trim() || !authorID.trim()) {
      setMessage({ type: "error", text: "Project ID and User ID are required." });
      return;
    }
    if (!videoUrl.trim()) {
      setMessage({ type: "error", text: "Provide a video URL or drag & drop a file." });
      return;
    }
    // If it's a blob URL (from file drop), already validated
    if (videoUrl.startsWith("blob:")) {
      setVideoLoaded(true);
      setAnnotations([]);
      loadAnnotations(projectId.trim(), fileName || videoUrl);
      return;
    }
    try {
      const url = new URL(videoUrl.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      setMessage({ type: "error", text: "Enter a valid http/https video URL." });
      return;
    }
    setVideoLoaded(true);
    setAnnotations([]);
    loadAnnotations(projectId.trim(), videoUrl.trim());
  }

  async function addAnnotation(e) {
    e.preventDefault();
    setMessage(null);
    const text = annotationText.trim();
    if (!text) {
      setMessage({ type: "error", text: "Annotation text cannot be empty." });
      return;
    }
    if (text.length > 2000) {
      setMessage({ type: "error", text: "Annotation text is too long (max 2000 chars)." });
      return;
    }

    // Use file name for local files, actual URL for remote
    const videoIdentifier = videoUrl.startsWith("blob:") ? (fileName || "local-file") : videoUrl.trim();

    const { ok, data } = await fetchJSON(`${API}/api/annotation`, {
      method: "POST",
      body: {
        projectId: projectId.trim(),
        videoUrl: videoIdentifier,
        timestamp: currentTime,
        text,
        authorID: authorID.trim(),
      },
    });

    if (ok) {
      setAnnotationText("");
      setMessage({ type: "success", text: `Annotation added at ${formatTime(currentTime)}` });
      loadAnnotations(projectId.trim(), videoIdentifier);
    } else {
      setMessage({ type: "error", text: data?.error || "Failed to add annotation." });
    }
  }

  async function deleteAnnotation(annotationId) {
    setMessage(null);
    const { ok, data } = await fetchJSON(`${API}/api/annotation/${annotationId}`, {
      method: "DELETE",
      body: { authorID: authorID.trim() },
    });
    if (ok) {
      setMessage({ type: "success", text: "Annotation deleted." });
      const videoIdentifier = videoUrl.startsWith("blob:") ? (fileName || "local-file") : videoUrl.trim();
      loadAnnotations(projectId.trim(), videoIdentifier);
    } else {
      setMessage({ type: "error", text: data?.error || "Failed to delete annotation." });
    }
  }

  function seekTo(seconds) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.pause();
    }
  }

  const styles = {
    container: { maxWidth: 960, margin: "2rem auto", padding: "0 1rem", fontFamily: "sans-serif" },
    heading: { borderBottom: "2px solid #333", paddingBottom: "0.5rem", marginBottom: "1rem" },
    setupRow: { display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "flex-end" },
    label: { display: "flex", flexDirection: "column", flex: 1, minWidth: 150, fontSize: "0.9rem", fontWeight: 600 },
    input: { marginTop: "0.25rem", padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4, fontSize: "0.9rem" },
    btn: { padding: "0.5rem 1rem", backgroundColor: "#333", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: "0.9rem" },
    mainLayout: { display: "flex", gap: "1rem" },
    videoCol: { flex: 2, minWidth: 0 },
    video: { width: "100%", backgroundColor: "#000", borderRadius: 4 },
    formBox: { marginTop: "0.5rem", padding: "0.75rem", border: "1px solid #ddd", borderRadius: 4, background: "#f9f9f9" },
    textarea: { width: "100%", padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4, fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box" },
    sidebar: { flex: 1, maxHeight: 500, overflowY: "auto", border: "1px solid #ddd", borderRadius: 4, padding: "0.75rem" },
    annotationCard: { padding: "0.5rem", marginBottom: "0.5rem", border: "1px solid #eee", borderRadius: 4, cursor: "pointer", transition: "background 0.15s" },
    timeLabel: { color: "#0066cc", fontWeight: 700, fontSize: "0.9rem" },
    authorLabel: { opacity: 0.6, fontSize: "0.8rem" },
    deleteBtn: { marginTop: "0.25rem", fontSize: "0.8rem", color: "red", cursor: "pointer", background: "none", border: "none", padding: 0 },
    msg: (type) => ({ padding: "0.5rem 0.75rem", marginBottom: "0.75rem", borderRadius: 4, background: type === "error" ? "#fee" : "#efe", color: type === "error" ? "#c00" : "#060", fontSize: "0.9rem" }),
    dropZone: (active) => ({
      border: `2px dashed ${active ? "#0066cc" : "#ccc"}`,
      borderRadius: 8,
      padding: "1.5rem",
      textAlign: "center",
      cursor: "pointer",
      background: active ? "#e8f0fe" : "#fafafa",
      marginBottom: "1rem",
      transition: "all 0.2s",
    }),
    dropText: { margin: 0, fontSize: "0.95rem", color: "#666" },
    fileNameTag: { display: "inline-block", marginTop: "0.5rem", padding: "0.25rem 0.5rem", background: "#e8f0fe", borderRadius: 4, fontSize: "0.85rem", color: "#333" },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Video Review &amp; Annotations</h2>

      {message && <div style={styles.msg(message.type)}>{message.text}</div>}

      <div style={styles.setupRow}>
        <label style={styles.label}>
          Project ID
          <input
            style={styles.input}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Paste project _id"
          />
        </label>
        <label style={styles.label}>
          Your User ID
          <input
            style={styles.input}
            value={authorID}
            onChange={(e) => setAuthorID(e.target.value)}
            placeholder="Your user ID"
          />
        </label>
      </div>

      <div
        style={styles.dropZone(dragging)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <p style={styles.dropText}>
          Drag &amp; drop a video file here, or click to browse
        </p>
        <p style={{ ...styles.dropText, fontSize: "0.8rem", marginTop: "0.25rem" }}>
          MP4, WebM, OGG (max 500MB)
        </p>
        {fileName && <span style={styles.fileNameTag}>{fileName}</span>}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          onChange={handleFileInput}
          style={{ display: "none" }}
        />
      </div>

      <div style={{ ...styles.setupRow, alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#888" }}>OR</span>
        <label style={{ ...styles.label, flex: 3 }}>
          Video URL
          <input
            style={styles.input}
            value={videoUrl.startsWith("blob:") ? "" : videoUrl}
            onChange={(e) => { setVideoUrl(e.target.value); setFileName(""); }}
            placeholder="https://example.com/draft.mp4"
          />
        </label>
        <button style={styles.btn} onClick={handleLoadVideo}>
          Load Video
        </button>
      </div>

      {videoLoaded && (
        <div style={styles.mainLayout}>
          <div style={styles.videoCol}>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              onPause={() => {
                setIsPaused(true);
                setCurrentTime(videoRef.current.currentTime);
              }}
              onPlay={() => setIsPaused(false)}
              onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
              onError={() => setMessage({ type: "error", text: "Could not load video. Check the URL and format (MP4, WebM)." })}
              style={styles.video}
            />

            {isPaused && (
              <form onSubmit={addAnnotation} style={styles.formBox}>
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>Add annotation at {formatTime(currentTime)}</strong>
                </div>
                {message && (
                  <div style={{ ...styles.msg(message.type), marginBottom: "0.5rem" }}>
                    {message.text}
                  </div>
                )}
                <textarea
                  style={styles.textarea}
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  placeholder="Type your feedback here..."
                  maxLength={2000}
                  required
                  rows={3}
                />
                <button type="submit" style={{ ...styles.btn, marginTop: "0.5rem" }}>
                  Add Annotation
                </button>
              </form>
            )}
          </div>

          <div style={styles.sidebar}>
            <h3 style={{ margin: "0 0 0.5rem" }}>Annotations ({annotations.length})</h3>
            {annotations.length === 0 && (
              <p style={{ opacity: 0.6, fontSize: "0.9rem" }}>
                No annotations yet. Pause the video to add one.
              </p>
            )}
            {annotations.map((a) => (
              <div
                key={a._id}
                style={styles.annotationCard}
                onClick={() => seekTo(a.timestamp)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={styles.timeLabel}>{formatTime(a.timestamp)}</span>
                  <span style={styles.authorLabel}>{a.authorID}</span>
                </div>
                <div style={{ marginTop: "0.25rem", fontSize: "0.9rem" }}>{a.text}</div>
                {a.authorID === authorID.trim() && (
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnnotation(a._id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
