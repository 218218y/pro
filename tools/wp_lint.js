#!/usr/bin/env node
/*
  WardrobePro - ESLint runner (cross-platform)

  Why this exists:
  - Works on Windows/macOS/Linux (no `FOO=bar` env syntax in npm scripts).
  - Allows multiple lint "profiles" so we can keep day-to-day lint low-noise
    while still keeping the JS/tools/config ESLint lane explicit.

  Usage:
    node tools/wp_lint.js
    node tools/wp_lint.js --profile js-only
    node tools/wp_lint.js --profile js-only --strict
    node tools/wp_lint.js --fix

  Notes:
    - The selected profile is read by eslint.config.js via process.env.WP_LINT_PROFILE.
    - "--strict" sets --max-warnings=0 for the JS/tools/config lane.
*/

import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function getFlagValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  if (eq) return eq.slice(flag.length + 1);
  return null;
}

const profile = (getFlagValue('--profile') || 'js-only').trim();
const normalizedProfile = profile.toLowerCase();
const jsOnlyProfile = normalizedProfile === 'js-only';
const strict = hasFlag('--strict');
const fix = hasFlag('--fix');

// Allow passing extra args after `--` directly to ESLint.
const dd = process.argv.indexOf('--');
const passthrough = dd >= 0 ? process.argv.slice(dd + 1) : [];

const eslintBin = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
if (!fs.existsSync(eslintBin)) {
  console.error('[WP Lint] ESLint not found. Run: npm i (or npm ci)');
  process.exit(2);
}

const configCandidates = [path.join(ROOT, 'eslint.config.js'), path.join(ROOT, 'eslint.config.cjs')];
const configPath = configCandidates.find(p => fs.existsSync(p));
if (!configPath) {
  console.error('[WP Lint] Missing eslint.config.js (or eslint.config.cjs) in project root.');
  process.exit(2);
}

// Default targets: keep it focused and fast.
// IMPORTANT: Some repos are legacy (./js) and some are Pure ESM (./esm).
// ESLint errors if you pass a pattern that matches zero files unless you also pass
// --no-error-on-unmatched-pattern.
const defaultTargets = [];
if (!jsOnlyProfile) {
  console.error(`[WP Lint] Unknown profile: ${profile}`);
  console.error('[WP Lint] Supported profile: js-only');
  process.exit(2);
}

if (fs.existsSync(path.join(ROOT, 'js'))) defaultTargets.push('js/**/*.js');
if (fs.existsSync(path.join(ROOT, 'esm'))) defaultTargets.push('esm/**/*.js', 'esm/**/*.mjs');
if (fs.existsSync(path.join(ROOT, 'tools'))) defaultTargets.push('tools/**/*.js');
if (fs.existsSync(path.join(ROOT, 'tests'))) defaultTargets.push('tests/**/*.js');
defaultTargets.push('*.js', '*.cjs', '*.mjs');

const args = [
  eslintBin,
  '--config',
  configPath,
  '--no-error-on-unmatched-pattern',
  ...(passthrough.length ? [] : defaultTargets),
  // Make warnings non-blocking for day-to-day runs, but allow strict gate mode.
  '--max-warnings',
  strict ? '0' : '999999',
];

if (fix) args.push('--fix');
if (passthrough.length) args.push(...passthrough);

const env = { ...process.env, WP_LINT_PROFILE: profile };

const r = spawnSync(process.execPath, args, {
  cwd: ROOT,
  stdio: 'inherit',
  env,
});

process.exit(typeof r.status === 'number' ? r.status : 1);
