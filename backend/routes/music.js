// POST /api/music
// Given video vibe + metadata, returns curated music suggestions
// Music is manually added by user — this returns names + where to find them

const express   = require('express');
const router    = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

// Curated trending music database (user maintains this list)
// Each entry: title, artist, bpm, vibe tags, where to find on Instagram
const MUSIC_DB = [
  { id: 1,  title: 'Espresso',            artist: 'Sabrina Carpenter',    bpm: 127, vibes: ['energetic','fun','pop','upbeat'],          trending: 'HOT',    instaTip: 'Search "Espresso Sabrina Carpenter" in Instagram audio' },
  { id: 2,  title: 'APT.',                artist: 'ROSÉ & Bruno Mars',    bpm: 118, vibes: ['fun','energetic','pop','kpop'],             trending: 'VIRAL',  instaTip: 'Search "APT. Bruno Mars" in Instagram audio' },
  { id: 3,  title: 'Die With A Smile',    artist: 'Lady Gaga & Bruno Mars',bpm: 97, vibes: ['romantic','dramatic','emotional','calm'],   trending: 'RISING', instaTip: 'Search "Die With A Smile" in Instagram audio' },
  { id: 4,  title: 'Beautiful Things',    artist: 'Benson Boone',         bpm: 105, vibes: ['aesthetic','romantic','calm','emotional'],  trending: 'HOT',    instaTip: 'Search "Beautiful Things Benson Boone" in Reels audio' },
  { id: 5,  title: 'Good Luck, Babe!',   artist: 'Chappell Roan',         bpm: 140, vibes: ['energetic','fun','pop','trending'],         trending: 'VIRAL',  instaTip: 'Search "Good Luck Babe Chappell Roan" in audio' },
  { id: 6,  title: 'Levii\'s Jeans',     artist: 'Beyoncé ft. Post Malone',bpm:91, vibes: ['luxury','aesthetic','cool','confident'],    trending: 'HOT',    instaTip: 'Search "Leviis Jeans Beyonce" in Instagram audio' },
  { id: 7,  title: 'Stick Season',       artist: 'Noah Kahan',            bpm: 132, vibes: ['calm','aesthetic','emotional','vlog'],      trending: 'RISING', instaTip: 'Search "Stick Season Noah Kahan" in Reels audio' },
  { id: 8,  title: 'Too Sweet',          artist: 'Hozier',                bpm: 80,  vibes: ['romantic','aesthetic','calm','luxury'],     trending: 'HOT',    instaTip: 'Search "Too Sweet Hozier" in Instagram audio' },
  { id: 9,  title: 'One of the Girls',   artist: 'The Weeknd',            bpm: 95,  vibes: ['luxury','dramatic','aesthetic','cool'],     trending: 'RISING', instaTip: 'Search "One of the Girls Weeknd" in audio' },
  { id: 10, title: 'Thousand Miles',     artist: 'The Kid LAROI',         bpm: 168, vibes: ['trending','energetic','fun','viral'],       trending: 'VIRAL',  instaTip: 'Search "Thousand Miles LAROI" in Reels audio' },
  { id: 11, title: 'Timeless',           artist: 'The Weeknd & Playboi Carti',bpm:110,vibes:['luxury','aesthetic','dramatic','cool'],   trending: 'HOT',    instaTip: 'Search "Timeless Weeknd Carti" in Instagram audio' },
  { id: 12, title: 'What Was I Made For',artist: 'Billie Eilish',          bpm: 70,  vibes: ['calm','emotional','aesthetic','minimal'],   trending: 'RISING', instaTip: 'Search "What Was I Made For Billie Eilish" in audio' },
  { id: 13, title: 'Harleys in Hawaii',  artist: 'Katy Perry',            bpm: 88,  vibes: ['aesthetic','calm','romantic','travel'],     trending: 'RISING', instaTip: 'Search "Harleys in Hawaii" in Instagram audio' },
  { id: 14, title: 'Rush',               artist: 'Troye Sivan',           bpm: 130, vibes: ['energetic','fun','trending','pop'],         trending: 'HOT',    instaTip: 'Search "Rush Troye Sivan" in Reels audio' },
  { id: 15, title: 'Cruel Summer',       artist: 'Taylor Swift',          bpm: 170, vibes: ['energetic','fun','pop','aesthetic'],        trending: 'VIRAL',  instaTip: 'Search "Cruel Summer Taylor Swift" in Instagram audio' },
];

router.post('/', async (req, res) => {
  const { vibe, bpm_target, music_vibe, template } = req.body;

  if (!vibe) return res.status(400).json({ error: 'vibe is required' });

  try {
    // Score each song against the requested vibe
    const scored = MUSIC_DB.map(song => {
      let score = 0;
      // Vibe tag match
      if (song.vibes.includes(vibe)) score += 40;
      // Partial tag matches
      const vibeRelated = getRelatedVibes(vibe);
      vibeRelated.forEach(v => { if (song.vibes.includes(v)) score += 10; });
      // Template match
      if (template && song.vibes.includes(template)) score += 15;
      // BPM proximity (within 20bpm = bonus)
      if (bpm_target) {
        const diff = Math.abs(song.bpm - bpm_target);
        if (diff < 10) score += 20;
        else if (diff < 20) score += 10;
        else if (diff < 40) score += 5;
      }
      // Trending bonus
      if (song.trending === 'VIRAL') score += 15;
      else if (song.trending === 'HOT') score += 10;
      else score += 5;
      return { ...song, matchScore: Math.min(score, 99) };
    });

    // Sort and take top 5
    const top5 = scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);

    // Ask Claude for a personalised explanation for each
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `You are an Instagram music expert. Given this video vibe: "${vibe}" and music feel: "${music_vibe || 'upbeat and trendy'}", write a SHORT 1-sentence reason why each of these songs fits. Respond ONLY with JSON array, no markdown:
[
  ${top5.map((s, i) => `{"id": ${s.id}, "reason": "..."}`).join(',\n  ')}
]
Songs: ${top5.map(s => `${s.id}: ${s.title} by ${s.artist}`).join(', ')}`;

    let reasons = {};
    try {
      const aiResp = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      });
      const raw = aiResp.content[0].text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw);
      parsed.forEach(r => { reasons[r.id] = r.reason; });
    } catch {
      top5.forEach(s => { reasons[s.id] = `Great ${s.bpm}BPM ${s.vibes[0]} track that fits your video perfectly.`; });
    }

    const result = top5.map(s => ({ ...s, aiReason: reasons[s.id] || '' }));
    res.json({ suggestions: result, totalInDb: MUSIC_DB.length });

  } catch (err) {
    console.error('Music route error:', err);
    res.status(500).json({ error: err.message });
  }
});

function getRelatedVibes(vibe) {
  const map = {
    energetic: ['fun', 'trending', 'pop'],
    calm:      ['aesthetic', 'emotional', 'romantic'],
    romantic:  ['aesthetic', 'calm', 'emotional'],
    aesthetic:  ['calm', 'minimal', 'vlog'],
    dramatic:  ['luxury', 'emotional', 'cinematic'],
    fun:       ['energetic', 'trending', 'pop'],
    luxury:    ['dramatic', 'aesthetic', 'cool'],
  };
  return map[vibe] || [];
}

// GET /api/music/db — return full music database for UI display
router.get('/db', (_, res) => res.json(MUSIC_DB));

module.exports = router;
