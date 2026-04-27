#!/usr/bin/env node
/*
  WardrobePro - ESLint runner (cross-platform)

  Why this exists:
  - Works on Windows/macOS/Linux (no `FOO=bar` env syntax in npm scripts).
  - Allows multiple lint "profiles" so we can keep day-to-day lint low-noise
    while still having a migration lens for the upcoming ESM conversion.

  Usage:
    node tools/wp_lint.js
    node tools/wp_lint.js --profile runtime
    node tools/wp_lint.js --profile migrate
    node tools/wp_lint.js --profile migrate --strict
    node tools/wp_lint.js --fix

  Notes:
    - The selected profile is read by eslint.config.cjs via process.env.WP_LINT_PROFILE.
    - "--strict" sets --max-warnings=0 (useful to gate migration warnings).
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

const profile = (getFlagValue('--profile') || 'runtime').trim();
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
if (fs.existsSync(path.join(ROOT, 'js'))) defaultTargets.push('js');
if (fs.existsSync(path.join(ROOT, 'esm'))) defaultTargets.push('esm');
if (fs.existsSync(path.join(ROOT, 'types'))) defaultTargets.push('types');
// Always lint tools and root config scripts.
defaultTargets.push('tools', '*.js', '*.cjs', '*.mjs');

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

// Migration profile hardening: run lightweight write-contract guard first.
// This keeps regressions out of the codebase even if ESLint rules don't cover them.
if (profile === 'migrate') {
  const guardBin = path.join(ROOT, 'tools', 'wp_write_contract_guard.js');
  if (fs.existsSync(guardBin)) {
    const g = spawnSync(process.execPath, [guardBin], {
      cwd: ROOT,
      stdio: 'inherit',
      env,
    });
    if (typeof g.status === 'number' && g.status !== 0) process.exit(g.status);
  }

  const probeGuardBin = path.join(ROOT, 'tools', 'wp_actions_surface_probe_guard.js');
  if (fs.existsSync(probeGuardBin)) {
    const g2 = spawnSync(process.execPath, [probeGuardBin], {
      cwd: ROOT,
      stdio: 'inherit',
      env,
    });
    if (typeof g2.status === 'number' && g2.status !== 0) process.exit(g2.status);
  }
}

const r = spawnSync(process.execPath, args, {
  cwd: ROOT,
  stdio: 'inherit',
  env,
});

process.exit(typeof r.status === 'number' ? r.status : 1);
