#!/usr/bin/env node
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'names.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
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

  // Optionally auto-commit changes to git when AUTO_COMMIT env var is truthy
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

const port = process.env.PORT || 5174;
app.listen(port, () => {
  console.log(`Name file-storage server listening at http://localhost:${port}`);
});

// API endpoint for categories
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
if (!fs.existsSync(CATEGORIES_FILE)) {
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify([], null, 2));
}

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

  // Optionally auto-commit changes to git when AUTO_COMMIT env var is truthy
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

// API endpoint for blocked pairs
const BLOCKED_PAIRS_FILE = path.join(DATA_DIR, 'blocked-pairs.json');
if (!fs.existsSync(BLOCKED_PAIRS_FILE)) {
  fs.writeFileSync(BLOCKED_PAIRS_FILE, JSON.stringify([], null, 2));
}

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

  // Optionally auto-commit changes to git when AUTO_COMMIT env var is truthy
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
