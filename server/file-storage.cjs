#!/usr/bin/env node
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the dist folder (built frontend)
const distPath = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'names.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const BLOCKED_PAIRS_FILE = path.join(DATA_DIR, 'blocked-pairs.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(CATEGORIES_FILE)) {
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(BLOCKED_PAIRS_FILE)) {
  fs.writeFileSync(BLOCKED_PAIRS_FILE, JSON.stringify([], null, 2));
}

app.get('/api/names', (req, res) => {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error('Failed to read names file', err);
    res.status(500).json({ error: 'failed to read names file' });
  }
});

app.post('/api/names', (req, res) => {
  const payload = req.body;
  if (!Array.isArray(payload)) {
    return res.status(400).json({ error: 'expected an array of names' });
  }

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('Failed to write names file', err);
    return res.status(500).json({ error: 'failed to write names file' });
  }

  try {
    const historyFile = path.join(DATA_DIR, 'names-history.jsonl');
    const snapshot = {
      ts: new Date().toISOString(),
      data: payload,
    };
    fs.appendFileSync(historyFile, JSON.stringify(snapshot) + '\n');
  } catch (hfErr) {
    console.error('Failed to write names-history', hfErr);
  }

  if (process.env.AUTO_COMMIT) {
    const msg = process.env.COMMIT_MESSAGE || 'Update names.json from local server';
    exec(`git add "${path.relative(process.cwd(), DATA_FILE)}" && git commit -m "${msg}"`, (err, stdout, stderr) => {
      if (err) {
        console.error('git commit failed', err, stderr);
      } else {
        console.log('Committed changes to git:', stdout.trim());
      }
    });
  }

  res.json({ ok: true });
});

app.get('/api/categories', (req, res) => {
  try {
    const raw = fs.readFileSync(CATEGORIES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error('Failed to read categories file', err);
    res.status(500).json({ error: 'failed to read categories file' });
  }
});

app.post('/api/categories', (req, res) => {
  const payload = req.body;
  if (!Array.isArray(payload)) {
    return res.status(400).json({ error: 'expected an array of categories' });
  }

  try {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('Failed to write categories file', err);
    return res.status(500).json({ error: 'failed to write categories file' });
  }

  if (process.env.AUTO_COMMIT) {
    const msg = process.env.COMMIT_MESSAGE || 'Update categories.json from local server';
    exec(`git add "${path.relative(process.cwd(), CATEGORIES_FILE)}" && git commit -m "${msg}"`, (err, stdout, stderr) => {
      if (err) {
        console.error('git commit failed', err, stderr);
      } else {
        console.log('Committed changes to git:', stdout.trim());
      }
    });
  }

  res.json({ ok: true });
});

app.get('/api/blocked-pairs', (req, res) => {
  try {
    const raw = fs.readFileSync(BLOCKED_PAIRS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error('Failed to read blocked pairs file', err);
    res.status(500).json({ error: 'failed to read blocked pairs file' });
  }
});

app.post('/api/blocked-pairs', (req, res) => {
  const payload = req.body;
  if (!Array.isArray(payload)) {
    return res.status(400).json({ error: 'expected an array of blocked pairs' });
  }

  try {
    fs.writeFileSync(BLOCKED_PAIRS_FILE, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('Failed to write blocked pairs file', err);
    return res.status(500).json({ error: 'failed to write blocked pairs file' });
  }

  if (process.env.AUTO_COMMIT) {
    const msg = process.env.COMMIT_MESSAGE || 'Update blocked-pairs.json from local server';
    exec(`git add "${path.relative(process.cwd(), BLOCKED_PAIRS_FILE)}" && git commit -m "${msg}"`, (err, stdout, stderr) => {
      if (err) {
        console.error('git commit failed', err, stderr);
      } else {
        console.log('Committed changes to git:', stdout.trim());
      }
    });
  }

  res.json({ ok: true });
});

// Catch-all route - serve index.html for client-side routing (must be last)
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not found - run npm run build first');
  }
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
});
