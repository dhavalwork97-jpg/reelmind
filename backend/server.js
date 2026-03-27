require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure directories exist
['uploads', 'outputs'].forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json());
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// Routes
app.use('/api/analyze', require('./routes/analyze'));
app.use('/api/edit',    require('./routes/edit'));
app.use('/api/music',   require('./routes/music'));

app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => console.log(`✅ ReelMind backend running on port ${PORT}`));
