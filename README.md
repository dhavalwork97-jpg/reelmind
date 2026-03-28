# 🎬 ReelMind AI v2

AI-powered Instagram Reel editor — upload a video, get AI template + music suggestions, FFmpeg processes it, download your reel.

**Single deployment on Render** — no separate frontend hosting needed. The Express server builds and serves the React app.

---

## ✨ Features
- 🤖 Claude AI analyses mood, energy & scene
- 🎨 6 templates: Cinematic, Aesthetic, Trending, Minimal, Vlog, Luxury
- 💬 Text overlay (top / centre / bottom)
- 🥁 Beat-sync option (aligns cuts to music BPM)
- 📤 Export for Instagram Reels, TikTok, YouTube Shorts
- 🎵 Music library with AI ranking + in-browser preview
- 📝 AI caption + hashtag generator

---

## 🎵 Add Music First (manual, one-time)

1. Go to **[pixabay.com/music](https://pixabay.com/music)** — 100% free, no copyright claims
2. Download 10–15 tracks across moods
3. Rename each file: `mood_title_bpm.mp3`
   ```
   upbeat_summer-vibes_128.mp3
   chill_golden-hour_90.mp3
   dramatic_epic-moment_140.mp3
   romantic_soft-petals_75.mp3
   energetic_neon-rush_145.mp3
   mysterious_dark-forest_85.mp3
   ```
4. **Locally:** put in `server/data/music/`
5. **On Render:** use the Render Shell (see deploy steps)

---

## 💻 Local Development

### Prerequisites
- Node.js 18+
- FFmpeg: `brew install ffmpeg` (Mac) or `sudo apt install ffmpeg` (Ubuntu)

### Setup
```bash
git clone https://github.com/YOUR_USERNAME/reelmind.git
cd reelmind

# Install everything
npm run install-all

# Configure
cp server/.env.example server/.env
# Edit server/.env → paste your ANTHROPIC_API_KEY

# Add music to server/data/music/ (see above)

# Run dev mode (both server + client)
npm run dev
# → Frontend: http://localhost:3000
# → API:      http://localhost:4000
```

---

## ☁️ Deploy to GitHub + Render (single service)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "ReelMind v2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/reelmind.git
git push -u origin main
```

### Step 2 — Create Render Web Service
1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Settings:
   | Field | Value |
   |-------|-------|
   | **Root Directory** | *(leave blank — uses root)* |
   | **Build Command** | `npm install && npm run build && cd server && npm install` |
   | **Start Command** | `npm start` |
   | **Node Version** | `18` |

4. **Environment Variables** (in Render dashboard):
   ```
   ANTHROPIC_API_KEY = sk-ant-your-key-here
   NODE_ENV          = production
   PORT              = 10000
   ```

5. **Add Disk** (required for file storage):
   - Name: `reelmind-data`
   - Mount Path: `/opt/render/project/src/server/data`
   - Size: 10 GB
   - Plan: Starter ($7/mo) or higher

6. Click **Deploy** — Render will build React + start the server.

### Step 3 — Upload Music via Render Shell
After deploy, go to your service → **Shell** tab:
```bash
mkdir -p /opt/render/project/src/server/data/music
# Then drag-and-drop your renamed MP3s using the Render file browser
# OR use the shell to wget from a public URL:
# wget -O /opt/render/project/src/server/data/music/upbeat_summer-vibes_128.mp3 "https://your-url/file.mp3"
```

Your app will be live at `https://reelmind.onrender.com` (or your custom domain).

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + feature list |
| GET | `/api/music` | List music library |
| POST | `/api/upload` | Upload video + Claude analysis |
| POST | `/api/process` | Start FFmpeg job |
| GET | `/api/status/:name` | Poll job status |

### POST `/api/process` body
```json
{
  "fileId": "uuid",
  "filename": "uuid.mp4",
  "template": "cinematic|aesthetic|trending|minimal|vlog|luxury",
  "musicFilename": "upbeat_summer_128.mp3",
  "exportFormat": "instagram|tiktok|youtube_shorts",
  "overlayText": "POV: You finally did it ✨",
  "textPosition": "top|center|bottom",
  "beatSync": true,
  "musicBpm": 128,
  "editInstructions": { "trimStart": 0, "trimEnd": 45 }
}
```

---

## 🗂️ Project Structure
```
reelmind/
├── package.json          ← root: build + start scripts
├── render.yaml           ← Render deployment config
├── server/
│   ├── index.js          ← Express + FFmpeg + Claude API
│   ├── package.json
│   ├── .env.example
│   └── data/             ← created automatically
│       ├── music/        ← PUT YOUR MP3s HERE
│       ├── uploads/      ← temp uploads (auto-cleaned)
│       ├── outputs/      ← processed reels
│       └── thumbnails/   ← video thumbnails
└── client/
    ├── package.json
    └── src/
        ├── App.js
        ├── App.css
        ├── index.js
        └── pages/
            ├── UploadPage.js
            ├── TemplatePage.js
            ├── MusicPage.js
            └── ExportPage.js
```

---

## ⚠️ Limits
- Max upload: 500 MB
- Max reel length: 90 seconds
- Processing time: 20–90s depending on video + server plan
- Render free tier spins down after inactivity (use Starter plan to avoid)
