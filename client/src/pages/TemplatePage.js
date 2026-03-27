import React, { useState } from "react";

const TEMPLATES = [
  {
    id: "cinematic",
    name: "Cinematic",
    emoji: "🎬",
    desc: "Letterbox bars, moody grade, smooth cuts",
    bg: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
    tags: ["Travel", "Drama"],
    tagColors: ["chip-blue", "chip-purple"],
  },
  {
    id: "aesthetic",
    name: "Aesthetic",
    emoji: "🌸",
    desc: "Soft grain, pastel overlay, dreamy fade",
    bg: "linear-gradient(135deg, #ffecd2, #fcb69f, #ff9a9e)",
    tags: ["Lifestyle", "GRWM"],
    tagColors: ["chip-pink", "chip-gold"],
  },
  {
    id: "trending",
    name: "Trending Now ⭐",
    emoji: "🔥",
    desc: "Snappy cuts, punchy colors, bold energy",
    bg: "linear-gradient(135deg, #e040fb, #7c4dff, #00e5ff)",
    tags: ["Viral", "Dance"],
    tagColors: ["chip-pink", "chip-blue"],
  },
  {
    id: "minimal",
    name: "Minimal",
    emoji: "◻️",
    desc: "Clean cuts, let the content breathe",
    bg: "linear-gradient(135deg, #1a1a2a, #2a2a3a)",
    tags: ["Tech", "Fashion"],
    tagColors: ["chip-blue", "chip-purple"],
  },
  {
    id: "vlog",
    name: "Vlog Diary",
    emoji: "📱",
    desc: "Raw, authentic, day-in-life titles",
    bg: "linear-gradient(135deg, #f093fb, #f5576c, #fda085)",
    tags: ["Daily", "Relatable"],
    tagColors: ["chip-gold", "chip-pink"],
  },
  {
    id: "luxury",
    name: "Luxury",
    emoji: "✨",
    desc: "Slow reveals, deep contrast, refined tone",
    bg: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    tags: ["Glam", "Fashion"],
    tagColors: ["chip-gold", "chip-purple"],
  },
];

export default function TemplatePage({ project, initial, onDone, onBack }) {
  const [selected, setSelected] = useState(initial || "trending");
  const { analysis, meta, thumbnail, originalName } = project;

  return (
    <div className="fade-up">
      {/* Video info bar */}
      <div className="video-bar">
        <div className="video-thumb-box">
          {thumbnail ? <img src={thumbnail} alt="thumb" /> : <span>🎬</span>}
        </div>
        <div className="video-info">
          <h3>{originalName || "your_video.mp4"}</h3>
          <p>{meta.duration}s · {meta.width}×{meta.height} · {meta.size}MB</p>
          <div className="video-chips">
            <span className="chip chip-pink">{analysis.detectedScene}</span>
            <span className="chip chip-gold">{analysis.energy} energy</span>
            <span className="chip chip-blue">{analysis.detectedMood}</span>
          </div>
        </div>
      </div>

      <div className="ai-insight">
        <div className="ai-insight-icon">🤖</div>
        <div>
          <strong>AI Pick:</strong> {analysis.templateReason}{" "}
          Recommended template: <strong style={{ color: "var(--accent)" }}>{analysis.recommendedTemplate}</strong>
        </div>
      </div>

      <div className="page-title">Pick your aesthetic. 🎨</div>
      <div className="page-sub">AI applies color grading, aspect ratio & style via FFmpeg. Choose what fits your vibe.</div>

      <div className="templates-grid">
        {TEMPLATES.map((t) => (
          <div
            key={t.id}
            className={`template-card ${selected === t.id ? "selected" : ""}`}
            onClick={() => setSelected(t.id)}
          >
            <div className="template-check">✓</div>
            {analysis.recommendedTemplate === t.id && (
              <div style={{ position: "absolute", top: 10, left: 10, background: "var(--gold)", color: "#08080f", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 10, letterSpacing: "0.5px" }}>AI PICK</div>
            )}
            <div className="template-thumb" style={{ background: t.bg }}>
              {t.emoji}
            </div>
            <div className="template-info">
              <div className="template-name">{t.name}</div>
              <div className="template-desc">{t.desc}</div>
              <div className="template-chips">
                {t.tags.map((tag, i) => (
                  <span key={tag} className={`chip ${t.tagColors[i]}`}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={() => onDone(selected)}>
          Next — Choose Music →
        </button>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}
