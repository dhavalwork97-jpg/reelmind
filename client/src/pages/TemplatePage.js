import React, { useState } from "react";

const TEMPLATES = [
  { id:"cinematic", name:"Cinematic",       emoji:"🎬", desc:"Letterbox bars, moody grade, smooth cuts",     bg:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",    tags:["Travel","Drama"],     tc:["chip-blue","chip-purple"] },
  { id:"aesthetic", name:"Aesthetic",       emoji:"🌸", desc:"Soft grain, pastel overlay, dreamy fade",       bg:"linear-gradient(135deg,#ffecd2,#fcb69f,#ff9a9e)",    tags:["Lifestyle","GRWM"],   tc:["chip-pink","chip-gold"]   },
  { id:"trending",  name:"Trending Now ⭐", emoji:"🔥", desc:"Punchy colors, snappy cuts, bold energy",       bg:"linear-gradient(135deg,#e040fb,#7c4dff,#00e5ff)",    tags:["Viral","Dance"],      tc:["chip-pink","chip-blue"]   },
  { id:"minimal",   name:"Minimal",         emoji:"◻️", desc:"Clean grade — let the content breathe",         bg:"linear-gradient(135deg,#1a1a2a,#2a2a3a)",            tags:["Tech","Fashion"],     tc:["chip-blue","chip-purple"] },
  { id:"vlog",      name:"Vlog Diary",      emoji:"📱", desc:"Warm, authentic, day-in-life vibe",             bg:"linear-gradient(135deg,#f093fb,#f5576c,#fda085)",    tags:["Daily","Relatable"],  tc:["chip-gold","chip-pink"]   },
  { id:"luxury",    name:"Luxury",          emoji:"✨", desc:"Deep blacks, high contrast, refined vignette",  bg:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)",    tags:["Glam","Fashion"],     tc:["chip-gold","chip-purple"] },
];

const FORMATS = [
  { id:"instagram",      label:"Instagram Reels", icon:"📸", desc:"1080×1920 · max 90s" },
  { id:"tiktok",         label:"TikTok",          icon:"🎵", desc:"1080×1920 · max 60s" },
  { id:"youtube_shorts", label:"YouTube Shorts",  icon:"▶️", desc:"1080×1920 · max 60s" },
];

export default function TemplatePage({ project, initial, onDone, onBack }) {
  const [template, setTemplate]     = useState(initial || "trending");
  const [format, setFormat]         = useState("instagram");
  const { analysis, meta, thumbnail, originalName } = project;

  return (
    <div className="fade-up">
      {/* Video bar */}
      <div className="video-bar">
        <div className="video-thumb-box">
          {thumbnail ? <img src={thumbnail} alt="thumb" /> : <span>🎬</span>}
        </div>
        <div className="video-info">
          <h3>{originalName || "video.mp4"}</h3>
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
          Recommended: <strong style={{ color:"var(--accent)" }}>{analysis.recommendedTemplate}</strong>
        </div>
      </div>

      {/* Export format */}
      <div style={{ marginBottom: 28 }}>
        <div className="page-title" style={{ fontSize: 22 }}>Export format 📤</div>
        <div style={{ display:"flex", gap:10, marginTop:12, flexWrap:"wrap" }}>
          {FORMATS.map((f) => (
            <div
              key={f.id}
              onClick={() => setFormat(f.id)}
              style={{
                flex:"1 1 160px", padding:"14px 16px", borderRadius:12, cursor:"pointer",
                border:`2px solid ${format===f.id ? "var(--accent)" : "var(--border)"}`,
                background: format===f.id ? "rgba(224,64,251,0.08)" : "var(--surface)",
                transition:"all 0.2s",
              }}
            >
              <div style={{ fontSize:22, marginBottom:6 }}>{f.icon}</div>
              <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, marginBottom:3 }}>{f.label}</div>
              <div style={{ fontSize:11, color:"var(--muted2)" }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Templates */}
      <div className="page-title" style={{ fontSize: 22 }}>Visual template 🎨</div>
      <div className="page-sub" style={{ marginBottom: 16 }}>
        AI applies color grade, aspect ratio pad & style via FFmpeg.
      </div>

      <div className="templates-grid">
        {TEMPLATES.map((t) => (
          <div
            key={t.id}
            className={`template-card ${template===t.id ? "selected" : ""}`}
            onClick={() => setTemplate(t.id)}
          >
            <div className="template-check">✓</div>
            {analysis.recommendedTemplate === t.id && (
              <div style={{
                position:"absolute", top:10, left:10,
                background:"var(--gold)", color:"#08080f",
                fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:10,
              }}>AI PICK</div>
            )}
            <div className="template-thumb" style={{ background:t.bg }}>{t.emoji}</div>
            <div className="template-info">
              <div className="template-name">{t.name}</div>
              <div className="template-desc">{t.desc}</div>
              <div className="template-chips">
                {t.tags.map((tag,i) => (
                  <span key={tag} className={`chip ${t.tc[i]}`}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={() => onDone({ template, exportFormat: format })}>
          Next — Choose Music →
        </button>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}
