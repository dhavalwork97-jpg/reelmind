import React, { useState, useRef } from "react";

export default function UploadPage({ onDone }) {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const inputRef = useRef();

  const ALLOWED = ["video/mp4","video/quicktime","video/x-msvideo","video/x-matroska","video/webm"];

  const handleFile = async (file) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      setError("Please upload a video file — MP4, MOV, AVI, MKV, or WebM.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError("File is too large. Maximum size is 500 MB.");
      return;
    }
    setError(null);
    setLoading(true);
    setProgress(0);

    const msgs = [
      "Uploading your video…",
      "Probing video metadata…",
      "AI analysing mood & style…",
      "Matching music library…",
      "Generating suggestions…",
    ];
    let idx = 0;
    setStatusMsg(msgs[0]);
    const ticker = setInterval(() => {
      idx = Math.min(idx + 1, msgs.length - 1);
      setStatusMsg(msgs[idx]);
    }, 1400);

    try {
      const form = new FormData();
      form.append("video", file);

      // Use XHR so we get upload progress
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { reject(new Error("Invalid server response.")); }
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).error || "Upload failed.")); }
            catch { reject(new Error(`Server error ${xhr.status}`)); }
          }
        };
        xhr.onerror = () => reject(new Error("Network error — is the server running?"));
        xhr.send(form);
      });

      clearInterval(ticker);
      onDone({ ...data, originalFile: file });
    } catch (err) {
      clearInterval(ticker);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-up">
      <div className="page-title">Drop your reel. 🎬</div>
      <div className="page-sub">
        Upload your raw video — Claude AI analyses mood, energy, and scene to suggest the perfect template, text overlay, and music.
      </div>

      {!loading ? (
        <>
          <div
            className={`upload-zone ${drag ? "drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault(); setDrag(false);
              handleFile(e.dataTransfer.files[0]);
            }}
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
            <p>or click to browse — up to 500 MB</p>
            <div className="format-chips">
              {["MP4", "MOV", "AVI", "MKV", "WebM"].map((f) => (
                <span key={f} className="format-chip">{f}</span>
              ))}
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: 16, padding: "13px 18px",
              background: "rgba(255,82,82,0.08)",
              border: "1px solid rgba(255,82,82,0.3)",
              borderRadius: 10, color: "#ff5252", fontSize: 14,
            }}>
              ⚠️ {error}
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ padding: "60px 40px", textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, margin: "0 auto 20px",
            border: "4px solid rgba(224,64,251,0.2)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
          }} />
          <div style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {statusMsg}
          </div>
          <div style={{ color: "var(--muted2)", fontSize: 14, marginBottom: 22 }}>
            This takes 5–20 seconds
          </div>
          <div style={{
            background: "var(--surface2)", borderRadius: 8, height: 6,
            overflow: "hidden", maxWidth: 320, margin: "0 auto",
          }}>
            <div style={{
              height: "100%",
              background: "linear-gradient(90deg,var(--accent),var(--accent3))",
              borderRadius: 8, width: `${progress}%`, transition: "width 0.3s",
            }} />
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
            {progress}% uploaded
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          { icon: "🤖", title: "AI Analysis", desc: "Mood, energy & scene detection" },
          { icon: "🎵", title: "Music Match", desc: "Ranked by vibe compatibility" },
          { icon: "✂️", title: "FFmpeg Edits", desc: "Color grade, overlay, audio mix" },
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
