import React, { useState, useEffect, useRef } from "react";

const FORMAT_LABELS = {
  instagram:      { icon:"📸", label:"Instagram Reels" },
  tiktok:         { icon:"🎵", label:"TikTok"          },
  youtube_shorts: { icon:"▶️", label:"YouTube Shorts"  },
};

const TEXT_POSITIONS = [
  { id:"top",    label:"Top"    },
  { id:"center", label:"Centre" },
  { id:"bottom", label:"Bottom" },
];

export default function ExportPage({ project, template, exportFormat, music, onBack, onReset }) {
  const { analysis, fileId, filename, meta } = project;

  // Edit options (editable by user)
  const [overlayText,   setOverlayText]   = useState(analysis.editInstructions?.suggestedOverlayText || "");
  const [textPosition,  setTextPosition]  = useState(analysis.editInstructions?.suggestedTextPosition || "bottom");
  const [beatSync,      setBeatSync]      = useState(!!analysis.editInstructions?.beatSync);
  const [trimStart,     setTrimStart]     = useState(analysis.editInstructions?.trimStart || 0);
  const [trimEnd,       setTrimEnd]       = useState(analysis.editInstructions?.trimEnd || meta.duration);
  const [caption,       setCaption]       = useState(analysis.suggestedCaption || "");

  const [status,        setStatus]        = useState("idle"); // idle|processing|done|error
  const [outputUrl,     setOutputUrl]     = useState(null);
  const [outputSize,    setOutputSize]    = useState(null);
  const [errorMsg,      setErrorMsg]      = useState(null);
  const [outputName,    setOutputName]    = useState(null);
  const [copied,        setCopied]        = useState(null); // which thing was copied

  const pollRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => () => {
    clearInterval(pollRef.current);
    clearTimeout(timeoutRef.current);
  }, []);

  const startProcessing = async () => {
    setStatus("processing");
    setErrorMsg(null);
    setOutputUrl(null);

    try {
      const body = {
        fileId, filename, template,
        musicFilename: music?.filename || null,
        exportFormat: exportFormat || "instagram",
        overlayText: overlayText.trim(),
        textPosition,
        beatSync,
        musicBpm: music?.bpm || 0,
        editInstructions: { trimStart: Number(trimStart), trimEnd: Number(trimEnd) },
      };

      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Processing failed.");
      if (!data.outputName) throw new Error("No output name returned from server.");

      const name = data.outputName;
      setOutputName(name);

      // Poll every 2 s, timeout after 4 min
      pollRef.current = setInterval(async () => {
        try {
          const check = await fetch(`/api/status/${name}`);
          const job = await check.json();
          if (job.status === "done") {
            clearInterval(pollRef.current);
            clearTimeout(timeoutRef.current);
            setOutputUrl(job.url);
            setOutputSize(job.sizeMB);
            setStatus("done");
          } else if (job.status === "error") {
            clearInterval(pollRef.current);
            clearTimeout(timeoutRef.current);
            setErrorMsg(job.error || "FFmpeg failed.");
            setStatus("error");
          }
        } catch { /* keep polling */ }
      }, 2000);

      timeoutRef.current = setTimeout(() => {
        clearInterval(pollRef.current);
        setErrorMsg("Processing timed out after 4 minutes. Try a shorter clip.");
        setStatus("error");
      }, 240000);
    } catch (e) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  };

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const hashtags = analysis.suggestedHashtags || [];
  const instaTips = analysis.instaTips || [];
  const fmtInfo = FORMAT_LABELS[exportFormat] || FORMAT_LABELS.instagram;

  return (
    <div className="fade-up">
      <div className="page-title">Edit & export. 🚀</div>
      <div className="page-sub">
        {fmtInfo.icon} {fmtInfo.label} · Template: <strong style={{ color:"var(--accent)" }}>{template}</strong>
        {music ? <> · 🎵 <strong style={{ color:"var(--accent3)" }}>{music.title}</strong></> : " · No music"}
      </div>

      {/* ── Edit options ───────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>

        {/* Text overlay */}
        <div className="result-card">
          <div className="result-label">💬 Text Overlay</div>
          <textarea
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder="e.g. POV: You finally did it ✨  (leave blank for none)"
            className="caption-area"
            style={{ minHeight:70, marginBottom:12 }}
          />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {TEXT_POSITIONS.map((p) => (
              <button key={p.id} onClick={() => setTextPosition(p.id)} style={{
                padding:"5px 14px", borderRadius:20, cursor:"pointer", fontSize:12, fontWeight:600,
                border:`1.5px solid ${textPosition===p.id ? "var(--accent)" : "var(--border)"}`,
                background: textPosition===p.id ? "rgba(224,64,251,0.12)" : "var(--surface2)",
                color: textPosition===p.id ? "var(--accent)" : "var(--muted2)", transition:"all 0.2s",
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* Trim + options */}
        <div className="result-card">
          <div className="result-label">✂️ Trim & Options</div>

          <div style={{ display:"flex", gap:12, marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, color:"var(--muted)", display:"block", marginBottom:5 }}>Start (s)</label>
              <input
                type="number" min={0} max={meta.duration - 1} value={trimStart}
                onChange={(e) => setTrimStart(Math.max(0, Number(e.target.value)))}
                style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px", color:"var(--text)", fontSize:14 }}
              />
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11, color:"var(--muted)", display:"block", marginBottom:5 }}>End (s)</label>
              <input
                type="number" min={1} max={meta.duration} value={trimEnd}
                onChange={(e) => setTrimEnd(Math.min(meta.duration, Number(e.target.value)))}
                style={{ width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 10px", color:"var(--text)", fontSize:14 }}
              />
            </div>
          </div>

          {/* Beat sync toggle */}
          <div
            onClick={() => setBeatSync(!beatSync)}
            style={{
              display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
              background: beatSync ? "rgba(224,64,251,0.08)" : "var(--surface2)",
              border:`1.5px solid ${beatSync ? "var(--accent)" : "var(--border)"}`,
              borderRadius:10, cursor:"pointer", transition:"all 0.2s",
            }}
          >
            <div style={{
              width:36, height:20, borderRadius:20,
              background: beatSync ? "var(--accent)" : "var(--border2)",
              position:"relative", transition:"background 0.2s",
              flexShrink:0,
            }}>
              <div style={{
                width:14, height:14, borderRadius:"50%", background:"white",
                position:"absolute", top:3,
                left: beatSync ? 18 : 3, transition:"left 0.2s",
              }} />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>🥁 Beat-Sync Timing</div>
              <div style={{ fontSize:11, color:"var(--muted2)" }}>
                {beatSync
                  ? `Cuts aligned to ${music?.bpm || "track"} BPM — recommended by AI`
                  : "Enable to align cuts to the music beat"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caption + hashtags */}
      <div className="result-grid" style={{ marginBottom:20 }}>
        <div className="result-card">
          <div className="result-label">📝 Caption</div>
          <textarea className="caption-area" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <button
            onClick={() => copy(caption, "caption")}
            style={{ marginTop:10, padding:"7px 16px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface2)", color: copied==="caption" ? "var(--green)" : "var(--muted2)", fontSize:12, cursor:"pointer" }}
          >
            {copied==="caption" ? "✓ Copied!" : "📋 Copy caption"}
          </button>
        </div>

        <div className="result-card">
          <div className="result-label">🏷️ Trending Hashtags</div>
          <div className="hashtag-cloud">
            {hashtags.map((h) => (
              <span key={h} className="hashtag" onClick={() => copy("#"+h, h)}>
                {copied===h ? "✓" : `#${h}`}
              </span>
            ))}
          </div>
          <button
            onClick={() => copy(hashtags.map(h=>"#"+h).join(" "), "all-tags")}
            style={{ marginTop:12, padding:"7px 16px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface2)", color: copied==="all-tags" ? "var(--green)" : "var(--muted2)", fontSize:12, cursor:"pointer" }}
          >
            {copied==="all-tags" ? "✓ Copied all!" : "📋 Copy all hashtags"}
          </button>

          {instaTips.length > 0 && (
            <>
              <div className="result-label" style={{ marginTop:16 }}>💡 Pro Tips</div>
              <div className="tips-list">
                {instaTips.map((tip,i) => (
                  <div key={i} className="tip">
                    <span className="tip-icon">📌</span>
                    <span style={{ fontSize:13, color:"var(--muted2)" }}>{tip}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Processing UI ─────────────────────────────── */}
      {status === "idle" && (
        <div className="export-box">
          <h3>🎬 Generate Your Reel</h3>
          <p>FFmpeg applies your template, mixes music, adds text overlay, and exports in 20–90s.</p>
          <button className="btn btn-primary" style={{ fontSize:16, padding:"16px 40px" }} onClick={startProcessing}>
            ✨ Start Processing
          </button>
        </div>
      )}

      {status === "processing" && (
        <div className="export-box">
          <div className="processing-state">
            <div style={{
              width:56, height:56,
              border:"4px solid rgba(224,64,251,0.2)",
              borderTopColor:"var(--accent)", borderRadius:"50%",
              animation:"spin 0.8s linear infinite",
            }} />
            <div style={{ fontFamily:"Syne", fontSize:18, fontWeight:700 }}>FFmpeg is working…</div>
            <div style={{ color:"var(--muted2)", fontSize:14 }}>
              Applying {template} grade{overlayText ? " + text overlay" : ""}{music ? " + audio mix" : ""} · 20–90s
            </div>
            <div style={{ color:"var(--muted)", fontSize:12 }}>Don't close this tab</div>
          </div>
        </div>
      )}

      {status === "done" && outputUrl && (
        <div className="export-box">
          <div style={{ fontSize:48, marginBottom:10 }}>🎉</div>
          <h3>Your Reel is Ready!</h3>
          <p>
            {outputSize ? `${outputSize} MB · ` : ""}
            {fmtInfo.icon} {fmtInfo.label} format
          </p>
          <div style={{ marginBottom:20 }}>
            <a
              className="download-link"
              href={outputUrl}
              download={`reelmind_${template}_${exportFormat}.mp4`}
            >
              ⬇️ Download Reel
            </a>
          </div>
          <div className="export-opts">
            {[
              { icon:"📋", lbl:"Copy Caption",   sub:"Ready to paste", fn:() => copy(caption,"cap2") },
              { icon:"🏷️", lbl:"Copy Hashtags",  sub:"All at once",     fn:() => copy(hashtags.map(h=>"#"+h).join(" "),"ht2") },
              { icon:"🔗", lbl:"Copy Video URL", sub:"Direct link",     fn:() => copy(window.location.origin+outputUrl,"url") },
            ].map((o) => (
              <div key={o.lbl} className="export-opt" onClick={o.fn}>
                <div className="icon">{o.icon}</div>
                <div className="lbl">{o.lbl}</div>
                <div className="sub">{o.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <div style={{
          background:"rgba(255,82,82,0.07)", border:"1px solid rgba(255,82,82,0.25)",
          borderRadius:14, padding:"24px 28px", marginBottom:20, textAlign:"center",
        }}>
          <div style={{ fontSize:32, marginBottom:10 }}>⚠️</div>
          <div style={{ fontFamily:"Syne", fontSize:16, fontWeight:700, marginBottom:6 }}>Processing Failed</div>
          <div style={{ color:"var(--muted2)", fontSize:14, marginBottom:16 }}>{errorMsg}</div>
          <button className="btn btn-secondary" onClick={startProcessing}>Retry</button>
        </div>
      )}

      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onReset}>✦ New Reel</button>
        {status === "idle" && <button className="btn btn-ghost" onClick={onBack}>← Back</button>}
      </div>
    </div>
  );
}
