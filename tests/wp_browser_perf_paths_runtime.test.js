import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  BROWSER_PERF_BASELINE_RELATIVE_PATH,
  RELEASE_BROWSER_PERF_BASELINE_RELATIVE_PATH,
  resolveBrowserPerfBaselinePath,
} from '../tools/wp_browser_perf_paths.js';
import {
  areBrowserPerfFailuresConfirmationEligible,
  BROWSER_PERF_CONFIRMATION_FLAG,
  createBrowserPerfMeasurementProfile,
  parseBrowserPerfTarget,
  resolveBrowserPerfTargetPaths,
} from '../tools/wp_browser_perf_targets.js';

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
  assert.equal(
    resolveBrowserPerfBaselinePath(root, 'release'),
    path.join(root, RELEASE_BROWSER_PERF_BASELINE_RELATIVE_PATH)
  );
  assert.throws(() => resolveBrowserPerfBaselinePath(root, 'preview'), /unknown baseline target "preview"/u);
});

test('browser perf targets keep dev and release measurement environments separate', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-browser-perf-targets-'));
  const dev = parseBrowserPerfTarget([]);
  const release = parseBrowserPerfTarget(['--target', 'release']);

  assert.equal(dev.id, 'dev');
  assert.equal(dev.serverScript, 'start:e2e');
  assert.equal(dev.buildScript, null);
  assert.equal(release.id, 'release');
  assert.equal(release.buildScript, 'build:browser-perf-release');
  assert.equal(release.serverScript, 'start:browser-perf-release');
  assert.equal(release.pagePath, '/index.html');
  assert.equal(createBrowserPerfMeasurementProfile(release).observabilityMode, 'perf');
  assert.equal(
    resolveBrowserPerfTargetPaths(root, release).releaseRoot,
    path.join(root, '.artifacts/browser-perf/release-site')
  );
  assert.throws(() => parseBrowserPerfTarget(['--target=staging']), /unknown target/u);
  assert.throws(() => parseBrowserPerfTarget(['--target']), /requires dev or release/u);
});

test('browser perf package commands expose independent dev and release lanes', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts['perf:browser'], 'node tools/wp_browser_perf_smoke.mjs --target dev --enforce');
  assert.equal(
    pkg.scripts['perf:browser:release'],
    'node tools/wp_browser_perf_smoke.mjs --target release --enforce'
  );
  assert.match(pkg.scripts['build:browser-perf-release'], /--build-mode perf/u);
  assert.match(pkg.scripts['build:browser-perf-release'], /\.artifacts\/browser-perf\/release-site/u);
  assert.match(pkg.scripts['start:browser-perf-release'], /tools\/serve\.js --root/u);
  assert.match(pkg.scripts['start:browser-perf-release'], /--port 5176/u);
});

test('browser perf confirmation is limited to quantitative budget candidates', () => {
  assert.equal(BROWSER_PERF_CONFIRMATION_FLAG, '--confirm-regression');
  assert.equal(
    areBrowserPerfFailuresConfirmationEligible([
      'project.restoreLastSession code-execution p95 exceeded budget (575ms > 512ms)',
      'INP exceeded budget (240ms > 200ms)',
    ]),
    true
  );
  assert.equal(
    areBrowserPerfFailuresConfirmationEligible(['Required browser UX evidence missing: INP']),
    false
  );
  assert.equal(
    areBrowserPerfFailuresConfirmationEligible(['Browser runtime issues detected: 1 page error(s)']),
    false
  );
  assert.equal(areBrowserPerfFailuresConfirmationEligible([]), false);
});
