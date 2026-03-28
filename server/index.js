require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const ffmpeg = require("fluent-ffmpeg");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 4000;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Data paths ─────────────────────────────────────────────────────────────
// Always use the project directory - it is ALWAYS writable on Render.
// /opt/render/project/src/server/data
// If you add a Render Disk, set mount path to /opt/render/project/src/server/data
// so uploads persist across deploys — no code change needed.
const DATA_ROOT = path.join(__dirname, "data");

["uploads", "outputs", "music", "thumbnails"].forEach((d) => {
  fs.mkdirSync(path.join(DATA_ROOT, d), { recursive: true });
});

const CLIENT_BUILD = path.join(__dirname, "..", "client", "build");

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use("/outputs", express.static(path.join(DATA_ROOT, "outputs")));
app.use("/music", express.static(path.join(DATA_ROOT, "music")));
app.use("/thumbnails", express.static(path.join(DATA_ROOT, "thumbnails")));

if (process.env.NODE_ENV === "production" && fs.existsSync(CLIENT_BUILD)) {
  app.use(express.static(CLIENT_BUILD));
  console.log("Serving React build from", CLIENT_BUILD);
}

// ─── Multer ──────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(DATA_ROOT, "uploads")),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = [
      "video/mp4","video/quicktime","video/x-msvideo",
      "video/x-matroska","video/webm","video/mpeg",
    ].includes(file.mimetype);
    ok ? cb(null, true) : cb(new Error("Only video files are allowed."));
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────
function getMusicLibrary() {
  const dir = path.join(DATA_ROOT, "music");
  try {
    return fs.readdirSync(dir)
      .filter((f) => /\.(mp3|wav|aac|m4a)$/i.test(f))
      .map((filename) => {
        const base = filename.replace(/\.(mp3|wav|aac|m4a)$/i, "");
        const [mood = "unknown", rawTitle = base, rawBpm = "100"] = base.split("_");
        return {
          filename,
          mood,
          title: rawTitle.replace(/-/g, " "),
          bpm: parseInt(rawBpm) || 100,
          url: `/music/${encodeURIComponent(filename)}`,
        };
      });
  } catch {
    return [];
  }
}

function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) return reject(err);
      const v = meta.streams.find((s) => s.codec_type === "video") || {};
      const a = meta.streams.find((s) => s.codec_type === "audio") || {};
      const duration = parseFloat(meta.format.duration) || 0;
      let fps = 30;
      if (v.r_frame_rate) {
        const [num, den] = v.r_frame_rate.split("/").map(Number);
        if (den) fps = parseFloat((num / den).toFixed(2));
      }
      resolve({
        duration: Math.round(duration),
        durationExact: duration,
        width: v.width || 1080,
        height: v.height || 1920,
        fps,
        hasAudio: !!a.codec_name,
        size: Math.round((meta.format.size || 0) / 1024 / 1024),
        bitrate: Math.round((meta.format.bit_rate || 0) / 1000),
      });
    });
  });
}

function generateThumbnail(inputPath, fileId) {
  return new Promise((resolve) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ["10%"],
        filename: `${fileId}.jpg`,
        folder: path.join(DATA_ROOT, "thumbnails"),
        size: "360x640",
      })
      .on("end", () => resolve(`/thumbnails/${fileId}.jpg`))
      .on("error", (e) => { console.warn("Thumbnail:", e.message); resolve(null); });
  });
}

function buildVF(template, overlayText, textPosition) {
  const scalepad =
    "scale=1080:1920:force_original_aspect_ratio=decrease," +
    "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black";

  const grades = {
    cinematic: "eq=brightness=-0.02:saturation=0.82:contrast=1.12",
    aesthetic:  "eq=brightness=0.06:saturation=0.68:contrast=0.94",
    trending:   "eq=brightness=0.04:saturation=1.35:contrast=1.18",
    minimal:    "eq=saturation=0.92:contrast=1.04",
    vlog:       "eq=brightness=0.05:saturation=1.12:contrast=1.06",
    luxury:     "eq=brightness=-0.04:saturation=0.72:contrast=1.22",
  };

  const extras = {
    cinematic:
      ",vignette=PI/4" +
      ",drawbox=x=0:y=0:w=iw:h=ih*0.09:color=black@1:t=fill" +
      ",drawbox=x=0:y=ih*0.91:w=iw:h=ih*0.09:color=black@1:t=fill",
    aesthetic: ",vignette=PI/5",
    luxury:    ",vignette=PI/4.5",
  };

  let vf = `${scalepad},${grades[template] || grades.minimal}${extras[template] || ""}`;

  // Text overlay via drawtext
  if (overlayText && overlayText.trim()) {
    const safe = overlayText.trim()
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\u2019")   // replace straight apostrophe with curly to avoid quoting issues
      .replace(/:/g, "\\:")
      .replace(/\n/g, " ");

    const yMap = { top: "120", center: "(h-text_h)/2", bottom: "h-180" };
    const y = yMap[textPosition] || yMap.bottom;

    // Try system font; gracefully skip if unavailable
    vf +=
      `,drawtext=text='${safe}':` +
      `x=(w-text_w)/2:y=${y}:` +
      `fontsize=52:fontcolor=white:` +
      `shadowcolor=black@0.75:shadowx=3:shadowy=3:` +
      `box=1:boxcolor=black@0.45:boxborderw=18`;
  }

  return vf;
}

function processVideo(inputPath, musicPath, opts, outputName) {
  return new Promise((resolve, reject) => {
    const {
      template = "minimal",
      trimStart = 0,
      trimEnd,
      overlayText = "",
      textPosition = "bottom",
      hasAudio = true,
      durationExact = 60,
    } = opts;

    const safeStart = Math.max(0, Number(trimStart) || 0);
    const rawDur = trimEnd
      ? Number(trimEnd) - safeStart
      : durationExact - safeStart;
    const dur = Math.min(Math.max(rawDur, 1), 90);

    const outputPath = path.join(DATA_ROOT, "outputs", `${outputName}.mp4`);
    const vf = buildVF(template, overlayText, textPosition);
    const useMusic = musicPath && fs.existsSync(musicPath);

    let cmd = ffmpeg(inputPath).seekInput(safeStart).duration(dur);
    if (useMusic) cmd = cmd.addInput(musicPath);

    const outOpts = [
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "22",
      "-profile:v", "main",
      "-level", "4.0",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-vf", vf,
    ];

    if (useMusic) {
      if (hasAudio) {
        // Mix original (quiet) + music (loud)
        outOpts.push(
          "-filter_complex",
          `[0:a]volume=0.2,atrim=0:${dur}[va];[1:a]volume=0.8,atrim=0:${dur}[ma];[va][ma]amix=inputs=2:duration=shortest:normalize=0[aout]`,
          "-map", "0:v",
          "-map", "[aout]",
          "-c:a", "aac", "-b:a", "128k", "-ar", "44100"
        );
      } else {
        outOpts.push(
          "-map", "0:v",
          "-map", "1:a",
          "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
          "-t", String(dur)
        );
      }
    } else {
      outOpts.push("-c:a", "aac", "-b:a", "128k", "-ar", "44100");
    }

    cmd
      .outputOptions(outOpts)
      .output(outputPath)
      .on("start", (c) => console.log("FFmpeg:", c.slice(0, 100)))
      .on("progress", (p) => process.stdout.write(`\r  ${Math.round(p.percent || 0)}%`))
      .on("end", () => { console.log("\n✅", outputName); resolve(`/outputs/${outputName}.mp4`); })
      .on("error", (e, _stdout, stderr) => {
        console.error("\n❌ FFmpeg error:", e.message, "\n", (stderr || "").slice(-300));
        reject(new Error(e.message));
      })
      .run();
  });
}

// ─── In-memory job tracking ───────────────────────────────────────────────────
const jobs = {};

// ─── API Routes ──────────────────────────────────────────────────────────────

app.get("/api/health", (_, res) =>
  res.json({
    status: "ok", version: "2.0.0",
    musicTracks: getMusicLibrary().length,
    features: ["text-overlay", "beat-sync-info", "tiktok-export", "youtube-shorts"],
  })
);

app.get("/api/music", (_, res) => res.json({ tracks: getMusicLibrary() }));

// Upload + Claude analysis
app.post("/api/upload", (req, res) => {
  upload.single("video")(req, res, async (err) => {
    if (err) {
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: "No video file received." });

    const filePath = req.file.path;
    const fileId = path.basename(req.file.filename, path.extname(req.file.filename));

    try {
      const [meta, thumbnail] = await Promise.all([
        probeVideo(filePath),
        generateThumbnail(filePath, fileId),
      ]);

      const musicLibrary = getMusicLibrary();
      const musicList = musicLibrary.length
        ? musicLibrary.map((t) => `mood:${t.mood} title:"${t.title}" bpm:${t.bpm} file:"${t.filename}"`).join("\n")
        : "NONE";

      const prompt = `You are an expert Instagram & TikTok Reels editor.

Video: duration=${meta.duration}s res=${meta.width}x${meta.height} fps=${meta.fps} audio=${meta.hasAudio} size=${meta.size}MB name="${req.file.originalname}"

Music library:
${musicList}

Reply ONLY with valid JSON (no markdown):
{
  "detectedMood": "upbeat|chill|dramatic|romantic|energetic|mysterious",
  "detectedScene": "short scene label",
  "energy": "low|medium|high",
  "recommendedTemplate": "cinematic|aesthetic|trending|minimal|vlog|luxury",
  "templateReason": "one sentence",
  "recommendedMusicFilename": ${musicLibrary.length ? '"filename or null"' : "null"},
  "musicReason": "one sentence",
  "suggestedMusicMoods": ["mood1","mood2"],
  "hookText": "punchy 4-8 word hook",
  "suggestedCaption": "2-3 line caption with emojis",
  "suggestedHashtags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],
  "editInstructions": {
    "trimStart": 0,
    "trimEnd": ${Math.min(meta.duration, 60)},
    "notes": "practical edit note",
    "beatSync": ${meta.duration <= 60},
    "suggestedOverlayText": "hook text for overlay",
    "suggestedTextPosition": "bottom"
  },
  "instaTips": ["tip1","tip2","tip3"]
}`;

      const aiResp = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      });

      let analysis;
      try {
        analysis = JSON.parse(aiResp.content[0].text.replace(/```json|```/g, "").trim());
      } catch {
        analysis = {
          detectedMood: "upbeat", detectedScene: "lifestyle", energy: "medium",
          recommendedTemplate: "trending", templateReason: "Versatile for most content.",
          recommendedMusicFilename: musicLibrary[0]?.filename || null,
          musicReason: "Matches the energy.",
          suggestedMusicMoods: ["upbeat", "energetic"],
          hookText: "You need to see this ✨",
          suggestedCaption: "Living in the moment 🌟\n\nSome things just hit different.",
          suggestedHashtags: ["fyp","reels","viral","trending","aesthetic","explore","contentcreator","instadaily","explorepage","instagood"],
          editInstructions: {
            trimStart: 0, trimEnd: Math.min(meta.duration, 60),
            notes: "Keep the best moments.", beatSync: false,
            suggestedOverlayText: "Watch till the end ✨",
            suggestedTextPosition: "bottom",
          },
          instaTips: [
            "Post between 7–9 PM for maximum reach",
            "Reply to comments in the first 30 minutes",
            "Use 5–8 targeted hashtags",
          ],
        };
      }

      res.json({ fileId, filename: req.file.filename, originalName: req.file.originalname, meta, thumbnail, analysis });
    } catch (e) {
      console.error("Upload error:", e);
      try { fs.unlinkSync(filePath); } catch {}
      res.status(500).json({ error: e.message || "Server error during analysis." });
    }
  });
});

// Start FFmpeg job
app.post("/api/process", async (req, res) => {
  const {
    fileId, filename, template = "minimal",
    musicFilename, editInstructions = {},
    exportFormat = "instagram",
    overlayText = "", textPosition = "bottom",
    beatSync = false, musicBpm = 0,
  } = req.body;

  if (!fileId || !filename) return res.status(400).json({ error: "fileId and filename required." });

  const inputPath = path.join(DATA_ROOT, "uploads", filename);
  if (!fs.existsSync(inputPath)) return res.status(404).json({ error: "Video not found. Please re-upload." });

  const musicPath = musicFilename ? path.join(DATA_ROOT, "music", musicFilename) : null;
  if (musicPath && !fs.existsSync(musicPath)) {
    return res.status(404).json({ error: `Music file "${musicFilename}" not found.` });
  }

  let meta;
  try { meta = await probeVideo(inputPath); }
  catch (e) { return res.status(500).json({ error: "Cannot read video: " + e.message }); }

  const outputName = `${fileId}_${template}_${exportFormat}_${Date.now()}`;
  jobs[outputName] = { status: "processing", url: null, error: null };

  res.json({ status: "processing", outputName });

  processVideo(inputPath, musicPath, {
    template, overlayText, textPosition, exportFormat, beatSync, musicBpm,
    trimStart: editInstructions.trimStart || 0,
    trimEnd: editInstructions.trimEnd || meta.duration,
    hasAudio: meta.hasAudio,
    durationExact: meta.durationExact || meta.duration,
  }, outputName)
    .then((url) => { jobs[outputName] = { status: "done", url, error: null }; })
    .catch((e) => { jobs[outputName] = { status: "error", url: null, error: e.message }; });
});

// Poll status
app.get("/api/status/:outputName", (req, res) => {
  const { outputName } = req.params;
  const job = jobs[outputName];
  const filePath = path.join(DATA_ROOT, "outputs", `${outputName}.mp4`);

  if (!job) {
    if (fs.existsSync(filePath)) {
      return res.json({ status: "done", url: `/outputs/${outputName}.mp4`, sizeMB: Math.round(fs.statSync(filePath).size / 1024 / 1024) });
    }
    return res.status(404).json({ status: "not_found" });
  }

  if (job.status === "done" && fs.existsSync(filePath)) {
    return res.json({ status: "done", url: job.url, sizeMB: Math.round(fs.statSync(filePath).size / 1024 / 1024) });
  }

  res.json({ status: job.status, error: job.error });
});

// SPA fallback — must be last
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    const index = path.join(CLIENT_BUILD, "index.html");
    if (fs.existsSync(index)) {
      res.sendFile(index);
    } else {
      res.status(503).json({ error: "Frontend not built yet." });
    }
  });
}

app.listen(PORT, () => {
  console.log(`🎬 ReelMind v2 on port ${PORT}`);
  console.log(`   NODE_ENV  : ${process.env.NODE_ENV}`);
  console.log(`   DATA_ROOT : ${DATA_ROOT}`);
  console.log(`   Music     : ${getMusicLibrary().length} tracks`);
  console.log(`   React app : ${fs.existsSync(CLIENT_BUILD) ? "✅ built" : "⚠️  not built (run npm run build)"}`);

  // Quick write-test so any permission issue shows immediately at startup
  try {
    const testFile = path.join(DATA_ROOT, "uploads", ".writetest");
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    console.log(`   Disk write: ✅ OK`);
  } catch (e) {
    console.error(`   Disk write: ❌ FAILED — ${e.message}`);
    console.error(`   → Set DATA_ROOT env var to a writable directory in Render dashboard`);
  }
});
