import React, { useState, useRef } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "";

export default function UploadPage({ onDone }) {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const allowed = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"];
    if (!allowed.includes(file.type)) {
      setError("Please upload a video file (MP4, MOV, AVI, MKV)");
      return;
    }
    setError(null);
    setLoading(true);
    setProgress(0);

    const messages = [
      "Uploading your video...",
      "Probing video metadata...",
      "AI analyzing mood & style...",
      "Generating music recommendations...",
      "Almost ready...",
    ];
    let msgIdx = 0;
    setStatusMsg(messages[0]);
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, messages.length - 1);
      setStatusMsg(messages[msgIdx]);
    }, 1200);

    try {
      const formData = new FormData();
      formData.append("video", file);

      const res = await axios.post(`${API}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      clearInterval(interval);
      onDone({ ...res.data, originalFile: file });
    } catch (err) {
      clearInterval(interval);
      setError(err.response?.data?.error || "Upload failed. Check server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-up">
      <div className="page-title">Drop your reel. 🎬</div>
      <div className="page-sub">Upload your raw video — AI will analyze mood, energy, and style to suggest the perfect template and music.</div>

      {!loading ? (
        <>
          <div
            className={`upload-zone ${drag ? "drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <span className="upload-icon">🎥</span>
            <h3>{drag ? "Drop it! 🎯" : "Drag & drop your video"}</h3>
            <p>or click to browse — up to 500MB</p>
            <div className="format-chips">
              {["MP4", "MOV", "AVI", "MKV", "WebM"].map((f) => (
                <span key={f} className="format-chip">{f}</span>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,82,82,0.1)", border: "1px solid rgba(255,82,82,0.3)", borderRadius: 10, color: "#ff5252", fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ padding: "56px 40px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, margin: "0 auto 20px", border: "4px solid rgba(224,64,251,0.2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{statusMsg}</div>
          <div style={{ color: "var(--muted2)", fontSize: 14, marginBottom: 20 }}>This takes 5–15 seconds</div>
          <div style={{ background: "var(--surface2)", borderRadius: 8, height: 6, overflow: "hidden", maxWidth: 300, margin: "0 auto" }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg, var(--accent), var(--accent3))", borderRadius: 8, width: `${progress}%`, transition: "width 0.3s" }} />
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>{progress}% uploaded</div>
        </div>
      )}

      <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { icon: "🤖", title: "AI Analysis", desc: "Mood, energy & scene detection" },
          { icon: "🎵", title: "Music Match", desc: "Ranked by vibe compatibility" },
          { icon: "✂️", title: "Smart Edits", desc: "FFmpeg template processing" },
        ].map((f) => (
          <div key={f.title} className="card card-sm" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ fontFamily: "Syne", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{f.title}</div>
            <div style={{ color: "var(--muted2)", fontSize: 12 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
