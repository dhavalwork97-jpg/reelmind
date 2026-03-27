// POST /api/analyze
// Accepts video upload, extracts metadata via ffprobe,
// then asks Claude to suggest templates + music based on metadata

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpeg  = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const Anthropic = require('@anthropic-ai/sdk');

ffmpeg.setFfmpegPath(ffmpegPath);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (_, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files allowed'));
  },
});

function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const video = metadata.streams.find(s => s.codec_type === 'video') || {};
      const audio = metadata.streams.find(s => s.codec_type === 'audio') || {};
      const fpsRaw = video.r_frame_rate || '30/1';
      const fpsParts = fpsRaw.split('/');
      const fps = fpsParts.length === 2 ? (parseInt(fpsParts[0]) / parseInt(fpsParts[1])).toFixed(0) : '30';
      resolve({
        duration:    parseFloat(metadata.format.duration || 0).toFixed(1),
        size_mb:     (metadata.format.size / 1024 / 1024).toFixed(1),
        width:       video.width,
        height:      video.height,
        fps,
        has_audio:   !!audio.codec_name,
        audio_codec: audio.codec_name || 'none',
        video_codec: video.codec_name || 'unknown',
        bitrate_kbps: ((metadata.format.bit_rate || 0) / 1000).toFixed(0),
      });
    });
  });
}

router.post('/', upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file provided' });

  try {
    const meta = await getVideoMetadata(req.file.path);
    const orientation = meta.height > meta.width ? 'vertical (portrait)' : 'horizontal (landscape)';

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const aiResp = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are an expert Instagram Reels editor and music curator.
Analyze this video metadata and respond ONLY with valid JSON (no markdown, no backticks):

Video info:
- Duration: ${meta.duration}s
- Resolution: ${meta.width}x${meta.height} (${orientation})
- FPS: ${meta.fps}
- Has audio: ${meta.has_audio}
- File size: ${meta.size_mb}MB

Return this exact JSON shape:
{
  "vibe": "one of: energetic | calm | romantic | aesthetic | dramatic | fun | luxury",
  "vibe_reason": "1 sentence why",
  "recommended_template": "one of: cinematic | aesthetic | trending | minimal | vlog | luxury",
  "template_reason": "1 sentence why",
  "hook_text": "a punchy 4-8 word hook caption for the reel opener",
  "caption": "full instagram caption 2-3 sentences with emojis",
  "hashtags": ["10", "trending", "hashtags", "without", "hash", "symbol", "here", "add", "more", "tags"],
  "edit_suggestions": [
    { "time": "0:00", "action": "description of edit action" },
    { "time": "0:05", "action": "description of edit action" },
    { "time": "0:10", "action": "description of edit action" },
    { "time": "0:15", "action": "description of edit action" }
  ],
  "bpm_target": 120,
  "music_vibe": "describe in 10 words what music feel would suit this video"
}`
      }]
    });

    let aiData = {};
    try {
      const raw = aiResp.content[0].text.replace(/```json|```/g, '').trim();
      aiData = JSON.parse(raw);
    } catch {
      aiData = {
        vibe: 'energetic',
        recommended_template: 'trending',
        hook_text: 'Living my best life ✨',
        caption: 'Making every moment count! ✨🎬',
        hashtags: ['fyp','reels','viral','trending','aesthetic'],
        edit_suggestions: [],
        bpm_target: 120,
        music_vibe: 'upbeat pop with strong beat drops',
      };
    }

    res.json({
      fileId:       req.file.filename.replace(/\.[^.]+$/, ''),
      fileName:     req.file.filename,
      originalName: req.file.originalname,
      metadata:     meta,
      ai:           aiData,
    });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
