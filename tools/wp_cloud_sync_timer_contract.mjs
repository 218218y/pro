#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const servicesRoot = path.join(root, 'esm/native/services');
const filePattern = /^cloud_sync.*\.ts$/;
const directCallPattern = /(^|[^A-Za-z0-9_$.])(?:setTimeout|clearTimeout|setInterval|clearInterval)\s*\(/;
const directFallbackPattern = /:\s*(?:setTimeout|clearTimeout|setInterval|clearInterval)\b/;

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (filePattern.test(entry.name)) out.push(abs);
  }
  return out;
}

const violations = [];
for (const abs of walk(servicesRoot)) {
  const rel = path.relative(root, abs).replace(/\\/g, '/');
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) return;
    if (directCallPattern.test(line)) {
      violations.push(
        `${rel}:${index + 1}: direct global timer call; use injected deps or getBrowserTimers(App)`
      );
    }
    if (directFallbackPattern.test(line)) {
      violations.push(`${rel}:${index + 1}: direct global timer fallback; use getBrowserTimers(App)`);
    }
  });
}

const snapshotRuntime = path.join(root, 'esm/native/services/cloud_sync_panel_api_snapshots_runtime.ts');
const snapshotSource = fs.readFileSync(snapshotRuntime, 'utf8');
if (!/getBrowserTimers\(deps\.App\)/.test(snapshotSource)) {
  violations.push(
    'esm/native/services/cloud_sync_panel_api_snapshots_runtime.ts: must resolve fallback timers through getBrowserTimers(deps.App)'
  );
}

if (violations.length) {
  console.error('[cloud-sync-timer-contract] FAILED');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('[cloud-sync-timer-contract] ok');
