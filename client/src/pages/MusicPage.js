import React, { useState, useEffect, useRef } from "react";

const MOODS = [
  { id:"upbeat",     emoji:"🔥", label:"Upbeat"     },
  { id:"chill",      emoji:"🌊", label:"Chill"       },
  { id:"dramatic",   emoji:"🎭", label:"Dramatic"    },
  { id:"romantic",   emoji:"🌸", label:"Romantic"    },
  { id:"energetic",  emoji:"⚡", label:"Energetic"   },
  { id:"mysterious", emoji:"🌙", label:"Mysterious"  },
];

const ARTS = [
  "linear-gradient(135deg,#e040fb,#7c4dff)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#f7971e,#ffd200)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#00c853,#69ff47)",
];
const EMOJIS = ["🎤","🎵","🎶","🎸","🎹","🎧"];

export default function MusicPage({ project, onDone, onBack }) {
  const [tracks, setTracks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // null = no music
  const [filter, setFilter]   = useState("all");
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(null);
  const { analysis } = project;

  useEffect(() => {
    fetch("/api/music")
      .then((r) => r.json())
      .then((d) => {
        const lib = d.tracks || [];
        setTracks(lib);
        // Auto-select AI recommendation
        const rec = lib.find((t) => t.filename === analysis.recommendedMusicFilename);
        if (rec) setSelected(rec);
        else if (lib.length > 0) setSelected(lib[0]);
      })
      .catch((e) => console.error("Music fetch:", e))
      .finally(() => setLoading(false));
  }, [analysis.recommendedMusicFilename]);

  const togglePlay = (track) => {
    if (playing === track.filename) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.play().catch(() => {});
      }
      setPlaying(track.filename);
    }
  };

  const handleContinue = () => {
    if (audioRef.current) audioRef.current.pause();
    onDone(selected); // null = no music
  };

  const filtered = filter === "all" ? tracks : tracks.filter((t) => t.mood === filter);

  return (
    <div className="fade-up">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} />

      <div className="page-title">AI-matched music. 🎵</div>
      <div className="page-sub">
        Tracks are ranked by how well they match your video's{" "}
        <strong style={{ color:"var(--accent)" }}>{analysis.detectedMood}</strong> vibe.
      </div>

      {loading ? (
        <div className="card" style={{ padding:40, textAlign:"center" }}>
          <div style={{
            width:40, height:40, margin:"0 auto 14px",
            border:"3px solid rgba(224,64,251,0.2)",
            borderTopColor:"var(--accent)", borderRadius:"50%",
            animation:"spin 0.8s linear infinite",
          }} />
          <div style={{ color:"var(--muted2)", fontSize:14 }}>Loading music library…</div>
        </div>
      ) : tracks.length === 0 ? (
        <EmptyState analysis={analysis} />
      ) : (
        <>
          <div className="ai-insight">
            <div className="ai-insight-icon">🎯</div>
            <div>
              <strong>Match logic:</strong> {analysis.musicReason || "Tracks ranked by BPM and mood compatibility."}
              {analysis.recommendedMusicFilename && (
                <span> Top pick: <strong style={{ color:"var(--accent)" }}>
                  {analysis.recommendedMusicFilename.replace(/\.(mp3|wav|aac|m4a)$/i,"").replace(/_/g," ")}
                </strong></span>
              )}
            </div>
          </div>

          {/* Mood filter row */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
            {["all", ...MOODS.map(m=>m.id)].map((id) => {
              const mood = MOODS.find(m=>m.id===id);
              const active = filter === id;
              return (
                <button key={id} onClick={() => setFilter(id)} style={{
                  padding:"5px 14px", borderRadius:20, cursor:"pointer",
                  border:`1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "rgba(224,64,251,0.12)" : "var(--surface)",
                  color: active ? "var(--accent)" : "var(--muted2)",
                  fontSize:12, fontWeight:600, transition:"all 0.2s",
                }}>
                  {mood ? `${mood.emoji} ${mood.label}` : "All"}
                </button>
              );
            })}
          </div>

          <div className="music-list">
            {/* No music option */}
            <div
              className={`music-card none-selected ${selected===null ? "selected" : ""}`}
              onClick={() => setSelected(null)}
            >
              <div className="music-rank" style={{ color: selected===null ? "var(--accent)" : undefined }}>—</div>
              <div className="music-art" style={{ background:"var(--surface2)", fontSize:26 }}>🔇</div>
              <div style={{ flex:1 }}>
                <div className="music-title">No Music</div>
                <div className="music-artist">Keep original video audio only</div>
              </div>
            </div>

            {filtered.map((track, i) => {
              const isSel   = selected?.filename === track.filename;
              const isAi    = track.filename === analysis.recommendedMusicFilename;
              const score   = Math.max(95 - i * 7, 58);
              const badge   = i===0 ? ["trend-hot","🔥 BEST MATCH"] : i===1 ? ["trend-viral","✨ GREAT FIT"] : ["trend-rising","📈 GOOD FIT"];

              return (
                <div key={track.filename} className={`music-card ${isSel ? "selected" : ""}`} onClick={() => setSelected(track)}>
                  <div className="music-rank">{i+1}</div>
                  <div className="music-art" style={{ background: ARTS[i % ARTS.length] }}>
                    {EMOJIS[i % EMOJIS.length]}
                  </div>
                  <div className="music-details" style={{ flex:1 }}>
                    <div className="music-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {track.title}
                      {isAi && <span className="chip chip-gold" style={{ fontSize:10 }}>⭐ AI PICK</span>}
                    </div>
                    <div className="music-artist">{track.mood} · {track.bpm} BPM</div>
                    <div className="music-meta">
                      <span className={`trend-badge ${badge[0]}`}>{badge[1]}</span>
                    </div>
                  </div>

                  {/* Preview button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(track); }}
                    title={playing===track.filename ? "Pause" : "Preview"}
                    style={{
                      width:36, height:36, border:"1.5px solid var(--border2)",
                      borderRadius:"50%", background:"var(--surface2)",
                      color:"var(--text)", fontSize:14, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      flexShrink:0, transition:"all 0.2s",
                    }}
                  >
                    {playing===track.filename ? "⏸" : "▶"}
                  </button>

                  <div className="music-match">
                    <div className="match-num">{score}%</div>
                    <div className="match-lbl">match</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="btn-row">
        <button className="btn btn-primary" onClick={handleContinue}>
          {tracks.length===0 ? "Continue Without Music →" : "Next — Edit Options →"}
        </button>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}

function EmptyState({ analysis }) {
  return (
    <div className="empty-music">
      <div style={{ fontSize:48, marginBottom:14 }}>🎵</div>
      <h3>No music in library yet</h3>
      <p>Add MP3 files to <code>server/data/music/</code> (local) or <code>/data/music/</code> (Render) to enable mixing.</p>
      <div className="music-steps">
        {[
          { n:1, t: <>Visit <a href="https://pixabay.com/music" target="_blank" rel="noreferrer" style={{ color:"var(--accent3)" }}>pixabay.com/music</a> — free &amp; Instagram-safe</> },
          { n:2, t: <>Download tracks for different moods</> },
          { n:3, t: <>Rename: <code>mood_title_bpm.mp3</code> e.g. <code>upbeat_summer-vibes_128.mp3</code></> },
          { n:4, t: <>Upload to <code>server/data/music/</code> and restart</> },
        ].map(s => (
          <div key={s.n} className="music-step">
            <div className="music-step-num">{s.n}</div>
            <div className="music-step-text">{s.t}</div>
          </div>
        ))}
      </div>
      <div style={{
        background:"var(--surface2)", border:"1px solid var(--border)",
        borderRadius:10, padding:"12px 16px", fontSize:13,
        color:"var(--muted2)", maxWidth:480, margin:"0 auto",
      }}>
        💡 AI suggests moods:{" "}
        <strong style={{ color:"var(--accent)" }}>
          {(analysis.suggestedMusicMoods || ["upbeat","energetic"]).join(", ")}
        </strong>
      </div>
    </div>
  );
}
