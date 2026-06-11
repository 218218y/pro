#!/usr/bin/env node
/**
 * tools/wp_boot_contract.js
 *
 * Boot contract for the Pure-ESM codebase.
 *
 * After the TS migration, runnable JS lives under ./dist.
 * This contract therefore reads the built manifest from:
 *   dist/esm/boot/boot_manifest.js
 *
 * Usage:
 *   node tools/wp_boot_contract.js
 *   node tools/wp_boot_contract.js --json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function outOk(payload) {
  if (JSON_OUT) process.stdout.write(JSON.stringify({ ok: true, ...(payload || {}) }, null, 2) + '\n');
  else console.log('✅ Boot contract OK');
}

function outFail(message, payload) {
  if (JSON_OUT)
    process.stdout.write(JSON.stringify({ ok: false, message, ...(payload || {}) }, null, 2) + '\n');
  else {
    console.error('❌ Boot contract failed: ' + message);
    if (payload) {
      if (payload.duplicates && payload.duplicates.length) {
        console.error('Duplicates:');
        for (const d of payload.duplicates) console.error(' - ' + d);
      }
      if (payload.bad && payload.bad.length) {
        console.error('Invalid steps:');
        for (const b of payload.bad) console.error(` - ${b.id || '(missing id)'}: ${b.reason}`);
      }
    }
  }
  process.exit(1);
}

async function loadManifest() {
  const __filename = fileURLToPath(import.meta.url);
  const root = path.resolve(path.dirname(__filename), '..');
  const rel = path.join('dist', 'esm', 'boot', 'boot_manifest.js');
  const abs = path.join(root, rel);

  if (!fileExists(abs)) {
    outFail(
      `Missing built boot manifest: ${rel}. Run \"node tools/wp_build_dist.js --no-assets\" (or \"npm run build:dist\").`
    );
  }

  try {
    return await import(pathToFileURL(abs).href);
  } catch (err) {
    outFail(
      `Failed to import built boot manifest (${rel}): ${String(err && err.message ? err.message : err)}`
    );
  }
  return null;
}

const mod = await loadManifest();
const BOOT_STEPS = mod?.BOOT_STEPS;
const BOOT_PHASES = mod?.BOOT_PHASES;

if (!Array.isArray(BOOT_STEPS)) {
  outFail('BOOT_STEPS is not an array.');
}

if (!Array.isArray(BOOT_PHASES) || BOOT_PHASES.length === 0) {
  outFail('BOOT_PHASES is missing or empty.');
}

const phaseSet = new Set(BOOT_PHASES);
const idSet = new Set();
/** @type {string[]} */
const duplicates = [];
/** @type {Array<{id?:string, reason:string}>} */
const bad = [];

for (let i = 0; i < BOOT_STEPS.length; i++) {
  const s = BOOT_STEPS[i];
  if (!s || typeof s !== 'object') {
    bad.push({ reason: `step[${i}] is not an object` });
    continue;
  }
  const id = /** @type {any} */ (s).id;
  const phase = /** @type {any} */ (s).phase;
  const run = /** @type {any} */ (s).run;

  if (typeof id !== 'string' || id.trim() === '') {
    bad.push({ id: String(id || ''), reason: `step[${i}] missing valid id` });
  } else {
    if (idSet.has(id)) duplicates.push(id);
    idSet.add(id);
  }

  if (typeof phase !== 'string' || phase.trim() === '') {
    bad.push({ id, reason: `step[${i}] missing valid phase` });
  } else if (!phaseSet.has(phase)) {
    bad.push({ id, reason: `unknown phase: ${phase}` });
  }

  if (typeof run !== 'function') {
    bad.push({ id, reason: `run is not a function` });
  }
}

if (duplicates.length || bad.length) {
  outFail('invalid boot manifest', { duplicates, bad });
}

outOk({ steps: BOOT_STEPS.length, phases: BOOT_PHASES.length });
