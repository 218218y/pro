import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  BROWSER_PERF_BASELINE_CANDIDATES,
  resolveBrowserPerfBaselinePath,
} from '../tools/wp_browser_perf_paths.js';

test('browser perf baseline path prefers legacy file when it already exists', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-browser-perf-paths-'));
  const legacy = path.join(root, 'tools/wp_perf_smoke_baseline.json');
  fs.mkdirSync(path.dirname(legacy), { recursive: true });
  fs.writeFileSync(legacy, '{}\n', 'utf8');
  assert.equal(resolveBrowserPerfBaselinePath(root), legacy);
});

test('browser perf baseline path falls back to canonical browser baseline when no baseline exists yet', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-browser-perf-paths-'));
  assert.equal(resolveBrowserPerfBaselinePath(root), path.join(root, BROWSER_PERF_BASELINE_CANDIDATES[0]));
});
