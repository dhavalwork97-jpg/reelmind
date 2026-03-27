// POST /api/edit
// Applies FFmpeg edits based on selected template
// Templates: cinematic | aesthetic | trending | minimal | vlog | luxury

const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const ffmpeg   = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { v4: uuidv4 } = require('uuid');

ffmpeg.setFfmpegPath(ffmpegPath);

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const OUTPUTS_DIR = path.join(__dirname, '../outputs');

// Template definitions — each is a set of FFmpeg filter chains
const TEMPLATES = {
  cinematic: {
    name: 'Cinematic',
    // Letterbox (2.35:1), slight desaturation, contrast boost, warm shadows
    vf: [
      'scale=1080:1920:force_original_aspect_ratio=decrease',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
      'eq=contrast=1.15:brightness=-0.03:saturation=0.85',
      'curves=r=\'0/0 0.3/0.25 1/0.95\':g=\'0/0 0.5/0.48 1/1\':b=\'0/0 0.5/0.45 1/0.9\'',
      // Letterbox bars
      'drawbox=x=0:y=0:w=iw:h=ih*0.09:color=black@1:t=fill',
      'drawbox=x=0:y=ih*0.91:w=iw:h=ih*0.09:color=black@1:t=fill',
    ].join(','),
  },
  aesthetic: {
    name: 'Aesthetic',
    // Pastel/warm, softened, slight vignette, dreamy
    vf: [
      'scale=1080:1920:force_original_aspect_ratio=decrease',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
      'eq=contrast=0.95:brightness=0.04:saturation=1.1:gamma_r=1.05:gamma_b=0.92',
      'curves=r=\'0/0.05 1/1\':b=\'0/0 1/0.9\'',
      // Soft vignette via overlay
      'vignette=PI/5',
    ].join(','),
  },
  trending: {
    name: 'Trending Now',
    // High contrast, punchy saturation, slight sharpening
    vf: [
      'scale=1080:1920:force_original_aspect_ratio=decrease',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
      'eq=contrast=1.25:brightness=0.01:saturation=1.35',
      'unsharp=5:5:0.8:3:3:0.0',
    ].join(','),
  },
  minimal: {
    name: 'Minimal',
    // Clean, neutral, slight warmth
    vf: [
      'scale=1080:1920:force_original_aspect_ratio=decrease',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:white',
      'eq=contrast=1.05:brightness=0.02:saturation=0.95',
    ].join(','),
  },
  vlog: {
    name: 'Vlog Diary',
    // Natural, slight warm grade, no heavy processing
    vf: [
      'scale=1080:1920:force_original_aspect_ratio=decrease',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
      'eq=contrast=1.08:brightness=0.01:saturation=1.08:gamma_r=1.03',
    ].join(','),
  },
  luxury: {
    name: 'Luxury',
    // Deep shadows, cool highlights, refined dark look
    vf: [
      'scale=1080:1920:force_original_aspect_ratio=decrease',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
      'eq=contrast=1.2:brightness=-0.06:saturation=0.75',
      'curves=r=\'0/0 0.5/0.42 1/0.92\':g=\'0/0 0.5/0.47 1/0.95\':b=\'0/0 0.5/0.52 1/1\'',
      'vignette=PI/4',
    ].join(','),
  },
};

router.post('/', async (req, res) => {
  const { fileName, template, hookText, trimStart, trimEnd } = req.body;

  if (!fileName || !template) {
    return res.status(400).json({ error: 'fileName and template are required' });
  }

  const tpl = TEMPLATES[template] || TEMPLATES.trending;
  const inputPath  = path.join(UPLOADS_DIR, fileName);
  const outputName = `${uuidv4()}_${template}.mp4`;
  const outputPath = path.join(OUTPUTS_DIR, outputName);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Source video not found' });
  }

  // Build ffmpeg command
  let cmd = ffmpeg(inputPath);

  // Optional trim
  if (trimStart) cmd = cmd.setStartTime(parseFloat(trimStart));
  if (trimEnd)   cmd = cmd.setDuration(parseFloat(trimEnd) - parseFloat(trimStart || 0));

  // Add hook text overlay if provided
  let vf = tpl.vf;
  if (hookText) {
    const safeText = hookText.replace(/'/g, "\\'").replace(/:/g, '\\:');
    vf += `,drawtext=text='${safeText}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=h*0.12:shadowcolor=black:shadowx=2:shadowy=2:enable='between(t,0,3)'`;
  }

  cmd
    .videoFilter(vf)
    .audioCodec('aac')
    .videoBitrate('4000k')
    .fps(30)
    .format('mp4')
    .outputOptions(['-movflags faststart', '-pix_fmt yuv420p'])
    .output(outputPath)
    .on('start', cmdLine => console.log('FFmpeg started:', cmdLine))
    .on('progress', p => console.log(`Processing: ${Math.round(p.percent || 0)}%`))
    .on('end', () => {
      res.json({
        success: true,
        outputFile: outputName,
        downloadUrl: `/outputs/${outputName}`,
        template: tpl.name,
      });
    })
    .on('error', err => {
      console.error('FFmpeg error:', err);
      res.status(500).json({ error: 'Video processing failed: ' + err.message });
    })
    .run();
});

// GET /api/edit/templates — list available templates
router.get('/templates', (_, res) => {
  res.json(Object.entries(TEMPLATES).map(([id, t]) => ({ id, name: t.name })));
});

module.exports = router;
