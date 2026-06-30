import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  BROWSER_PERF_BASELINE_RELATIVE_PATH,
  resolveBrowserPerfBaselinePath,
} from '../tools/wp_browser_perf_paths.js';

test('browser perf baseline path always resolves to the browser-specific baseline', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-browser-perf-paths-'));
  const genericPerfBaseline = path.join(root, 'tools/wp_perf_smoke_baseline.json');
  fs.mkdirSync(path.dirname(genericPerfBaseline), { recursive: true });
  fs.writeFileSync(genericPerfBaseline, '{}\n', 'utf8');

  assert.equal(resolveBrowserPerfBaselinePath(root), path.join(root, BROWSER_PERF_BASELINE_RELATIVE_PATH));
});

test('browser perf baseline path resolves from the provided project root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-browser-perf-paths-'));
  assert.equal(resolveBrowserPerfBaselinePath(root), path.join(root, BROWSER_PERF_BASELINE_RELATIVE_PATH));
});
