# 🎬 ReelMind AI — Instagram Reel Editor

AI-powered Instagram Reels editor. Upload a video → get AI template suggestions + music recommendations → FFmpeg processes it → download your reel.

---

## 🏗️ Project Structure

```
reelmind/
├── server/          ← Express + FFmpeg backend
│   ├── index.js     ← Main server
│   ├── music/       ← 🎵 PUT YOUR MP3s HERE
│   ├── uploads/     ← Temp video uploads (auto-created)
│   ├── outputs/     ← Processed reels (auto-created)
│   └── thumbnails/  ← Video thumbnails (auto-created)
├── client/          ← React frontend
├── render.yaml      ← Render.com deployment config
└── package.json
```

---

## 🎵 Step 1 — Add Music (Do This First!)

Music must be added **manually** to `server/music/`. Use free, Instagram-safe tracks.

### Where to get music:
- **[pixabay.com/music](https://pixabay.com/music)** — Best option. 100% free, no copyright claims.
- **[mixkit.co/free-music](https://mixkit.co/free-music/)** — Also free & safe.

### How to name your files:
```
mood_title_bpm.mp3
```

Examples:
```
upbeat_summer-vibes_128.mp3
chill_golden-hour_90.mp3
dramatic_epic-moment_140.mp3
romantic_soft-petals_75.mp3
energetic_neon-rush_145.mp3
mysterious_dark-forest_85.mp3
```

**Moods to cover:** `upbeat` · `chill` · `dramatic` · `romantic` · `energetic` · `mysterious`

Aim for **10–20 tracks** across all moods for best AI recommendations.

---

## 💻 Step 2 — Local Development

### Prerequisites
- Node.js 18+
- FFmpeg installed: `brew install ffmpeg` (Mac) or `sudo apt install ffmpeg` (Linux)

### Setup
```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/reelmind.git
cd reelmind

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..

# Setup environment
cp server/.env.example server/.env
# Edit server/.env and add your ANTHROPIC_API_KEY

# Add music to server/music/ (see Step 1)

# Start both server + client
npm run dev
```

App runs at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

---

## 🌐 Step 3 — Deploy to GitHub + Render

### Push to GitHub
```bash
git init
git add .
git commit -m "Initial ReelMind commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/reelmind.git
git push -u origin main
```

### Deploy Backend to Render
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Starter ($7/mo) — needed for persistent disk
4. Add Environment Variables:
   - `ANTHROPIC_API_KEY` = your key from console.anthropic.com
   - `NODE_ENV` = `production`
5. Add Disk:
   - Name: `reelmind-storage`
   - Mount Path: `/opt/render/project/src`
   - Size: 10GB

⚠️ **Important:** After deploying, SSH into Render or use the shell to upload your music files:
```bash
# In Render shell
mkdir -p server/music
# Then upload files via Render's file upload or use the API endpoint
```

### Deploy Frontend (Netlify recommended for React)
1. Go to [netlify.com](https://netlify.com) → New Site → Import from Git
2. Settings:
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `client/build`
3. Add Environment Variable:
   - `REACT_APP_API_URL` = your Render backend URL (e.g. `https://reelmind-server.onrender.com`)
4. Deploy!

---

## 🎛️ Templates (Applied via FFmpeg)

| Template | Effect |
|----------|--------|
| **Cinematic** | Letterbox bars + moody desaturation + slight contrast boost |
| **Aesthetic** | Warm brightness + pastel saturation + vignette |
| **Trending** | Punchy saturation boost + bright contrast |
| **Minimal** | Subtle color correct only |
| **Vlog Diary** | Natural warm grade |
| **Luxury** | Deep blacks + high contrast + vignette |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/music` | List music library |
| POST | `/api/upload` | Upload + AI analyze video |
| POST | `/api/process` | Start FFmpeg processing |
| GET | `/api/status/:name` | Poll processing status |
| POST | `/api/suggest-music` | Get music recommendations |

---

## 🔑 Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...   # Required — get from console.anthropic.com
PORT=4000                       # Optional — defaults to 4000
```

---

## 🚧 Limitations

- Max video size: **500MB** (adjustable in `index.js`)
- Max reel length: **90 seconds** (Instagram limit)
- Music playback preview requires the audio file to be on the same server (CORS)
- Processing time: **20–90 seconds** depending on video length and server specs

---

## 📈 Future Enhancements

- [ ] Text overlays with FFmpeg `drawtext` filter
- [ ] Speed ramps (slow-mo + fast-mo)
- [ ] Beat detection for auto-sync cuts
- [ ] Multiple export formats (TikTok 9:16, YouTube Shorts)
- [ ] Spotify API for real trending track data
- [ ] User accounts & reel history
