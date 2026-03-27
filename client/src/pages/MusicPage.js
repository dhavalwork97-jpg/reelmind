import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "";

const MOODS = [
  { id: "upbeat", emoji: "🔥", label: "Upbeat" },
  { id: "chill", emoji: "🌊", label: "Chill" },
  { id: "dramatic", emoji: "🎭", label: "Dramatic" },
  { id: "romantic", emoji: "🌸", label: "Romantic" },
  { id: "energetic", emoji: "⚡", label: "Energetic" },
  { id: "mysterious", emoji: "🌙", label: "Mysterious" },
];

const ART_COLORS = [
  "linear-gradient(135deg,#e040fb,#7c4dff)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#f7971e,#ffd200)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#00c853,#69ff47)",
];

const ART_EMOJIS = ["🎤", "🎵", "🎶", "🎸", "🎹", "🎧"];

export default function MusicPage({ project, template, onDone, onBack }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(null);
  const { analysis } = project;

  useEffect(() => {
    fetchMusic();
  }, []);

  const fetchMusic = async () => {
    try {
      const res = await axios.get(`${API}/api/music`);
      const library = res.data.tracks || [];
      setTracks(library);

      // Auto-select AI recommendation
      if (analysis.recommendedMusicFilename) {
        const rec = library.find((t) => t.filename === analysis.recommendedMusicFilename);
        if (rec) setSelected(rec);
      } else if (library.length > 0) {
        setSelected(library[0]);
      }
    } catch (e) {
      console.error("Music fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (track) => {
    if (playing === track.filename) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = `${API}${track.url}`;
        audioRef.current.play().catch(() => {});
      }
      setPlaying(track.filename);
    }
  };

  const filtered = filter === "all" ? tracks : tracks.filter((t) => t.mood === filter);

  const handleContinue = () => {
    if (audioRef.current) audioRef.current.pause();
    onDone(selected); // null = no music
  };

  return (
    <div className="fade-up">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} />

      <div className="page-title">AI-matched music. 🎵</div>
      <div className="page-sub">
        These tracks from your library are ranked by how well they match your video's {analysis.detectedMood} vibe.
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ width: 40, height: 40, margin: "0 auto 14px", border: "3px solid rgba(224,64,251,0.2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ color: "var(--muted2)", fontSize: 14 }}>Loading music library...</div>
        </div>
      ) : tracks.length === 0 ? (
        <EmptyMusicState analysis={analysis} />
      ) : (
        <>
          <div className="ai-insight">
            <div className="ai-insight-icon">🎯</div>
            <div>
              <strong>Music Match Logic:</strong> {analysis.musicReason || "Tracks ranked by BPM match and mood compatibility with your video."}
              {analysis.recommendedMusicFilename && (
                <span> Top pick: <strong style={{ color: "var(--accent)" }}>{analysis.recommendedMusicFilename.replace(/_/g, " ").replace(/\.(mp3|wav)$/, "")}</strong></span>
              )}
            </div>
          </div>

          {/* Mood filter */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <button
              className={`chip ${filter === "all" ? "chip-pink" : ""}`}
              style={{ border: "1.5px solid var(--border)", cursor: "pointer", background: filter === "all" ? undefined : "var(--surface)", color: filter === "all" ? undefined : "var(--muted2)" }}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            {MOODS.map((m) => (
              <button
                key={m.id}
                className={`chip ${filter === m.id ? "chip-purple" : ""}`}
                style={{ border: "1.5px solid var(--border)", cursor: "pointer", background: filter === m.id ? undefined : "var(--surface)", color: filter === m.id ? undefined : "var(--muted2)" }}
                onClick={() => setFilter(m.id)}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>

          <div className="music-list">
            {/* No music option */}
            <div
              className={`music-card none-selected ${selected === null ? "selected" : ""}`}
              onClick={() => setSelected(null)}
            >
              <div className="music-rank" style={{ color: selected === null ? "var(--accent)" : undefined }}>—</div>
              <div className="music-art" style={{ background: "var(--surface2)", fontSize: 26 }}>🔇</div>
              <div style={{ flex: 1 }}>
                <div className="music-title">No Music</div>
                <div className="music-artist">Keep original video audio only</div>
              </div>
            </div>

            {filtered.map((track, i) => {
              const isSelected = selected?.filename === track.filename;
              const isAiPick = track.filename === analysis.recommendedMusicFilename;
              const artColor = ART_COLORS[i % ART_COLORS.length];
              const artEmoji = ART_EMOJIS[i % ART_EMOJIS.length];
              const matchScore = Math.max(95 - i * 7, 60);

              return (
                <div
                  key={track.filename}
                  className={`music-card ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelected(track)}
                >
                  <div className="music-rank">{i + 1}</div>
                  <div className="music-art" style={{ background: artColor }}>{artEmoji}</div>
                  <div className="music-details" style={{ flex: 1 }}>
                    <div className="music-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {track.title}
                      {isAiPick && <span className="chip chip-gold" style={{ fontSize: 10 }}>⭐ AI PICK</span>}
                    </div>
                    <div className="music-artist">{track.mood} · {track.bpm} BPM</div>
                    <div className="music-meta">
                      <span className={`trend-badge ${i === 0 ? "trend-hot" : i === 1 ? "trend-viral" : "trend-rising"}`}>
                        {i === 0 ? "🔥 BEST MATCH" : i === 1 ? "✨ GREAT FIT" : "📈 GOOD FIT"}
                      </span>
                    </div>
                  </div>

                  {/* Play button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(track); }}
                    style={{ width: 36, height: 36, border: "1.5px solid var(--border2)", borderRadius: "50%", background: "var(--surface2)", color: "var(--text)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    title="Preview"
                  >
                    {playing === track.filename ? "⏸" : "▶"}
                  </button>

                  <div className="music-match">
                    <div className="match-num">{matchScore}%</div>
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
          Generate Reel →
        </button>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}

function EmptyMusicState({ analysis }) {
  return (
    <div className="empty-music">
      <div style={{ fontSize: 48, marginBottom: 14 }}>🎵</div>
      <h3>No music in library yet</h3>
      <p>Add MP3s to your <code style={{ background: "var(--surface2)", padding: "2px 6px", borderRadius: 5, fontSize: 13 }}>server/music/</code> folder to enable music mixing.</p>

      <div className="music-steps">
        {[
          { n: 1, text: <>Go to <a href="https://pixabay.com/music" target="_blank" rel="noreferrer" style={{ color: "var(--accent3)" }}>pixabay.com/music</a> — 100% free, Instagram-safe</> },
          { n: 2, text: <>Download tracks sorted by mood (upbeat, chill, dramatic, romantic)</> },
          { n: 3, text: <>Rename files: <code>mood_title_bpm.mp3</code> e.g. <code>upbeat_summer-vibes_128.mp3</code></> },
          { n: 4, text: <>Place in <code>server/music/</code> folder and restart server</> },
        ].map((s) => (
          <div key={s.n} className="music-step">
            <div className="music-step-num">{s.n}</div>
            <div className="music-step-text">{s.text}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "var(--muted2)", maxWidth: 480, margin: "0 auto" }}>
        💡 AI suggests moods: <strong style={{ color: "var(--accent)" }}>{analysis.suggestedMusicMoods?.join(", ") || "upbeat, energetic"}</strong> for your video
      </div>
    </div>
  );
}
