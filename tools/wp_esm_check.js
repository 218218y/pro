#!/usr/bin/env node

// Lightweight ESM sanity check.
// Purpose: fail fast if the local ESM graph is broken (missing files, bad specifiers).
//
// After the TS migration we keep ONLY TS in-repo and emit runnable JS to ./dist.
// Therefore the probes here target dist/esm outputs.

import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

function resolveProjectRoot() {
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(__filename), '..');
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function tryImport(projectRoot, rel) {
  const abs = path.join(projectRoot, rel);
  if (!fileExists(abs)) {
    throw new Error(
      `[WardrobePro] ESM check: missing file: ${rel}\n` +
        `Hint: run \"node tools/wp_build_dist.js --no-assets\" (or \"npm run build:dist\").`
    );
  }
  await import(pathToFileURL(abs).href);
  console.log(`[WardrobePro] ESM ok: ${rel}`);
}

async function main() {
  const projectRoot = resolveProjectRoot();

  // Keep this list conservative (avoid browser-only entrypoints).
  // These modules are intentionally side-effect free on import.
  const probes = [
    'dist/esm/app_container.js',
    'dist/esm/native/runtime/api.js',
    'dist/esm/native/kernel/api.js',
  ];

  for (const rel of probes) {
    await tryImport(projectRoot, rel);
  }
}

main().catch(err => {
  console.error(String(err && err.stack ? err.stack : err));
  process.exit(1);
});
