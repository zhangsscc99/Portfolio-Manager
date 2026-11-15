// Lightweight static file server for the CRA build with atomic releases.
//
// The site is served from the `current` symlink, which is switched atomically
// by scripts/deploy-frontend.sh. The root is re-resolved (fs.realpathSync) on
// every request, so a symlink flip takes effect immediately with no restart
// and no dropped requests.
//
// Usage:
//   node serve.js [--port 5000] [--root /path/to/frontend/current]
//
// Routes:
//   GET /__health        -> { ok: true, release: "<release-dir-name>" }
//   GET <file>           -> static asset (immutable cache headers)
//   GET <anything else>  -> index.html (SPA fallback, no-cache)

const express = require('express');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
function arg(name, fallback) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

const PORT = Number(process.env.PORT || arg('port', 5000));
const ROOT = arg('root', path.join(__dirname, 'current'));

const IMMUTABLE = 'public, max-age=31536000, immutable';
const NO_CACHE = 'no-cache';

const app = express();
app.disable('x-powered-by');

// Re-resolve the `current` symlink on every request so a release switch is
// picked up mid-flight. Both the old and new release dirs still exist during
// a switch, so every resolution lands on a complete tree.
function resolveRoot() {
  try {
    return fs.realpathSync(ROOT);
  } catch (err) {
    return null;
  }
}

app.get('/__health', (req, res) => {
  const root = resolveRoot();
  res.set('Cache-Control', NO_CACHE);
  res.json({ ok: Boolean(root), release: root ? path.basename(root) : null });
});

function sendFile(res, file, cacheControl) {
  res.set('Cache-Control', cacheControl);
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) {
      res.status(err.statusCode || 500).end();
    }
  });
}

app.use((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).end();
  }
  const root = resolveRoot();
  if (!root) {
    return res.status(503).send('no release deployed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(req.path);
  } catch (err) {
    return res.status(400).send('bad request');
  }

  // Normalize and strip any traversal so we stay inside the release dir.
  const rel = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let file = path.join(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) {
    file = path.join(root, 'index.html');
  }

  const sendIndex = () => {
    const index = path.join(root, 'index.html');
    if (fs.existsSync(index)) {
      return sendFile(res, index, NO_CACHE);
    }
    res.status(503).send('release has no index.html');
  };

  let stat;
  try {
    stat = fs.statSync(file);
  } catch (err) {
    return sendIndex();
  }

  if (stat.isDirectory()) {
    file = path.join(file, 'index.html');
    try {
      stat = fs.statSync(file);
    } catch (err) {
      return sendIndex();
    }
  }
  if (!stat.isFile()) {
    return sendIndex();
  }

  sendFile(res, file, path.basename(file) === 'index.html' ? NO_CACHE : IMMUTABLE);
});

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`serve.js listening on :${PORT}, root -> ${ROOT}`);
});
