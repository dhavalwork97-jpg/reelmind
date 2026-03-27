import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "";

export default function ExportPage({ project, template, music, outputName, onProcessDone, onBack, onReset }) {
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
  const [currentOutput, setCurrentOutput] = useState(outputName);
  const [outputUrl, setOutputUrl] = useState(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const { analysis, fileId, filename, meta } = project;

  useEffect(() => {
    setCaption(analysis.suggestedCaption || "");
    return () => clearInterval(pollRef.current);
  }, []);

  const startProcessing = async () => {
    setStatus("processing");
    setError(null);

    try {
      const res = await axios.post(`${API}/api/process`, {
        fileId,
        filename,
        template,
        musicFilename: music?.filename || null,
        editInstructions: analysis.editInstructions || {},
      });

      const name = res.data.outputName;
      setCurrentOutput(name);
      onProcessDone(name);

      // Poll for completion
      pollRef.current = setInterval(async () => {
        try {
          const check = await axios.get(`${API}/api/status/${name}`);
          if (check.data.status === "done") {
            clearInterval(pollRef.current);
            setOutputUrl(`${API}${check.data.url}`);
            setStatus("done");
          }
        } catch {
          clearInterval(pollRef.current);
          setStatus("error");
          setError("Status check failed.");
        }
      }, 2000);

      // Timeout after 3 minutes
      setTimeout(() => {
        if (status !== "done") {
          clearInterval(pollRef.current);
          setStatus("error");
          setError("Processing timed out. Try a shorter video.");
        }
      }, 180000);
    } catch (err) {
      setStatus("error");
      setError(err.response?.data?.error || "Processing failed. Check server logs.");
    }
  };

  const hashtags = analysis.suggestedHashtags || [];
  const instaTips = analysis.instaTips || [];
  const editInstructions = analysis.editInstructions || {};

  const templateLabel = {
    cinematic: "🎬 Cinematic",
    aesthetic: "🌸 Aesthetic",
    trending: "🔥 Trending Now",
    minimal: "◻️ Minimal",
    vlog: "📱 Vlog Diary",
    luxury: "✨ Luxury",
  }[template] || template;

  return (
    <div className="fade-up">
      <div className="page-title">Ready to render. 🚀</div>
      <div className="page-sub">
        Template: <strong style={{ color: "var(--accent)" }}>{templateLabel}</strong>
        {music ? <> · Music: <strong style={{ color: "var(--accent3)" }}>{music.title}</strong></> : " · No music (original audio)"}
      </div>

      {/* Summary card */}
      <div className="result-grid">
        <div className="result-card">
          <div className="result-label">✂️ AI Edit Plan</div>
          <div className="edit-step">
            <div className="edit-dot">1</div>
            <div className="edit-text">
              Trim: {editInstructions.trimStart || 0}s → {editInstructions.trimEnd || meta.duration}s
              <span>Removes silence, focuses on best moments</span>
            </div>
          </div>
          <div className="edit-step">
            <div className="edit-dot">2</div>
            <div className="edit-text">
              Apply <strong>{templateLabel}</strong> color grade
              <span>Brightness, saturation & contrast via FFmpeg</span>
            </div>
          </div>
          {music && (
            <div className="edit-step">
              <div className="edit-dot">3</div>
              <div className="edit-text">
                Mix music: 80% · Original: 30%
                <span>{music.title} · {music.bpm} BPM</span>
              </div>
            </div>
          )}
          <div className="edit-step">
            <div className="edit-dot">{music ? 4 : 3}</div>
            <div className="edit-text">
              Export 1080×1920 · H.264 · AAC
              <span>Instagram Reels optimized format</span>
            </div>
          </div>
          {editInstructions.notes && (
            <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--muted2)", marginTop: 8 }}>
              💡 {editInstructions.notes}
            </div>
          )}
        </div>

        <div className="result-card">
          <div className="result-label" style={{ marginBottom: 10 }}>📝 AI Caption</div>
          <textarea
            className="caption-area"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <div className="result-label" style={{ marginTop: 16, marginBottom: 8 }}>🏷️ Trending Hashtags</div>
          <div className="hashtag-cloud">
            {hashtags.map((h) => (
              <span key={h} className="hashtag" onClick={() => { navigator.clipboard?.writeText("#" + h); }}>#{h}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Instagram Tips */}
      {instaTips.length > 0 && (
        <div className="card card-sm" style={{ marginBottom: 20 }}>
          <div className="result-label" style={{ marginBottom: 12 }}>💡 Insta Pro Tips</div>
          <div className="tips-list">
            {instaTips.map((tip, i) => (
              <div key={i} className="tip">
                <span className="tip-icon">📌</span>
                <span style={{ fontSize: 14, color: "var(--muted2)" }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing / Export */}
      {status === "idle" && (
        <div className="export-box">
          <h3>🎬 Generate Your Reel</h3>
          <p>FFmpeg will apply the template, mix music, and export your video in ~30–90 seconds.</p>
          <button className="btn btn-primary" style={{ fontSize: 16, padding: "16px 36px" }} onClick={startProcessing}>
            ✨ Start Processing
          </button>
        </div>
      )}

      {status === "processing" && (
        <div className="export-box">
          <div className="processing-state">
            <div style={{ width: 52, height: 52, border: "4px solid rgba(224,64,251,0.2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 700 }}>FFmpeg is working...</div>
            <div style={{ color: "var(--muted2)", fontSize: 14 }}>Applying {templateLabel} · This takes 20–90 seconds</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>Don't close this tab</div>
          </div>
        </div>
      )}

      {status === "done" && outputUrl && (
        <div className="export-box">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h3>Your Reel is Ready!</h3>
          <p>Download and post directly to Instagram Reels</p>

          <div style={{ marginBottom: 20 }}>
            <a className="download-link" href={outputUrl} download>
              ⬇️ Download Reel
            </a>
          </div>

          <div className="export-opts">
            {[
              { icon: "📋", lbl: "Copy Caption", sub: "Tap to copy", action: () => navigator.clipboard?.writeText(caption) },
              { icon: "🏷️", lbl: "Copy Hashtags", sub: "All at once", action: () => navigator.clipboard?.writeText(hashtags.map(h => "#" + h).join(" ")) },
              { icon: "🔗", lbl: "Share Link", sub: "Direct video URL", action: () => navigator.clipboard?.writeText(outputUrl) },
            ].map((o) => (
              <div key={o.lbl} className="export-opt" onClick={o.action}>
                <div className="icon">{o.icon}</div>
                <div className="lbl">{o.lbl}</div>
                <div className="sub">{o.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <div style={{ background: "rgba(255,82,82,0.08)", border: "1px solid rgba(255,82,82,0.25)", borderRadius: 14, padding: "24px 28px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Processing Failed</div>
          <div style={{ color: "var(--muted2)", fontSize: 14 }}>{error}</div>
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={startProcessing}>Retry</button>
        </div>
      )}

      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onReset}>✦ New Reel</button>
        {status === "idle" && <button className="btn btn-ghost" onClick={onBack}>← Back</button>}
      </div>
    </div>
  );
}
