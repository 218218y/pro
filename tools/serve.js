#!/usr/bin/env node

// Simple static server for WardrobePro.
//
// After the TS migration, the runnable browser build lives under ./dist.
// This server therefore prefers serving ./dist when it exists.
//
// Usage:
//   node tools/serve.js
//   node tools/serve.js --port 3000
//   node tools/serve.js --root dist

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parsePort() {
  const idx = process.argv.indexOf('--port');
  if (idx >= 0 && process.argv[idx + 1]) {
    const n = Number(process.argv[idx + 1]);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return Number(process.env.PORT || 3000);
}

function parseRoot(projectRoot) {
  const idx = process.argv.indexOf('--root');
  if (idx >= 0 && process.argv[idx + 1]) {
    return path.resolve(projectRoot, process.argv[idx + 1]);
  }

  const distRoot = path.join(projectRoot, 'dist');
  const distIndex = path.join(distRoot, 'index_pro.html');
  if (fs.existsSync(distIndex)) return distRoot;

  return projectRoot;
}

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ROOT = parseRoot(PROJECT_ROOT);
const PORT = parsePort();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function safeResolve(urlPath) {
  let decoded = '';
  try {
    decoded = decodeURIComponent(String(urlPath || '/'));
  } catch {
    return null;
  }

  // Prevent path traversal. Use path.relative instead of startsWith so sibling
  // directories with a shared prefix cannot bypass the root boundary.
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, '');
  const abs = path.resolve(ROOT, normalized);
  const rel = path.relative(ROOT, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return abs;
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function serveFile(req, res) {
  let u = req.url || '/';
  if (u === '/' || u === '') {
    // Prefer the main dev entry when present; otherwise fall back to a generic index.html (release builds).
    const hasIndexPro = fs.existsSync(path.join(ROOT, 'index_pro.html'));
    const hasIndex = fs.existsSync(path.join(ROOT, 'index.html'));
    u = hasIndexPro ? '/index_pro.html' : hasIndex ? '/index.html' : '/index_pro.html';
  }

  // strip query
  const q = u.indexOf('?');
  if (q >= 0) u = u.slice(0, q);

  const abs = safeResolve(u);
  if (!abs) return send(res, 403, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Forbidden');

  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not found');
  }

  const ext = path.extname(abs).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';

  // Cache policy (local server):
  // - index.html + version.json: never cache (prevents "stuck on old" during development/deploy tests)
  // - hashed assets (.*.<hash>.(js|css)): long cache + immutable
  // - other JS/CSS: no-cache (revalidate)
  // - everything else: short cache
  const relUrl = u.replace(/^\//, '');
  const base = path.basename(relUrl);
  const isHtml = ext === '.html';
  const isVersion = base.toLowerCase() === 'version.json';
  const isHashedAsset = /\.[a-f0-9]{6,64}\.(js|css|mjs)$/i.test(base);
  const isJsCss = ext === '.js' || ext === '.mjs' || ext === '.css';

  const headers = { 'Content-Type': type };
  if (isHtml || isVersion) {
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
    headers.Pragma = 'no-cache';
    headers.Expires = '0';
  } else if (isHashedAsset) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else if (isJsCss) {
    headers['Cache-Control'] = 'no-cache';
  } else {
    headers['Cache-Control'] = 'public, max-age=3600';
  }

  try {
    const data = fs.readFileSync(abs);
    send(res, 200, headers, data);
  } catch (err) {
    send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, String(err));
  }
}

const server = http.createServer(serveFile);

server.listen(PORT, () => {
  const relRoot = path.relative(PROJECT_ROOT, ROOT).replace(/\\/g, '/');
  console.log(`WardrobePro server running at http://localhost:${PORT}/`);
  console.log(`Serving: ${relRoot || '.'}`);

  if (ROOT === PROJECT_ROOT && !fs.existsSync(path.join(PROJECT_ROOT, 'dist', 'index_pro.html'))) {
    console.log('\nNote: dist/ not found. For a working browser build, run:');
    console.log('  npm run build:dist');
    console.log('Then re-run this server (or start it again; it auto-detects dist).\n');
  }
});
