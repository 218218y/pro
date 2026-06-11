import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { checkBuildSiteArtifacts } from '../tools/wp_release_parity_artifacts.js';
import { runReleaseParityChecks } from '../tools/wp_release_parity_checks.js';
import { collectJsLocalRefs } from '../tools/wp_release_parity_refs.js';
import { formatRefForConsole } from '../tools/wp_release_parity_shared.js';

async function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-release-parity-'));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('release parity js ref scanner ignores comments and keeps filesystem-like refs only', () => {
  const refs = collectJsLocalRefs(`
    // import('./fake-comment.js')
    /* new URL('./also-commented.js', import.meta.url) */
    const x = import('./real-chunk');
    import helper from './entry.js';
    const asset = new URL('../assets/icon.svg', import.meta.url);
    const vendor = 'libs/three.vendor.abcdef.js';
    const packageImport = import('react');
  `);

  assert.deepEqual(
    refs.map(item => item.kind + ':' + item.ref),
    [
      'js:dynamic-import:./real-chunk',
      'js:import:./entry.js',
      'js:new-url:../assets/icon.svg',
      'js:vendor-literal:libs/three.vendor.abcdef.js',
    ]
  );
});

test('release parity js ref scanner ignores JSDoc import type references inside comments', () => {
  const refs = collectJsLocalRefs(`
    /** @typedef {import('../../../types').AppContainer} AppContainer */
    /** @returns {import('../../../types').SlidingDoorOpsLike} */
    const loadChunk = () => import('./real-runtime-chunk.js').then(m => m.default);
  `);

  assert.deepEqual(
    refs.map(item => item.kind + ':' + item.ref),
    ['js:dynamic-import:./real-runtime-chunk.js']
  );
});

test('release parity artifact check reports missing local refs and missing release vendor', () => {
  return withTempDir(root => {
    const siteDir = path.join(root, 'dist', 'release');
    fs.mkdirSync(path.join(siteDir, 'assets'), { recursive: true });
    fs.writeFileSync(
      path.join(siteDir, 'index.html'),
      '<!doctype html><script src="./assets/app.js"></script><link href="./assets/missing.css" rel="stylesheet">',
      'utf8'
    );
    fs.writeFileSync(
      path.join(siteDir, 'assets', 'app.js'),
      "const mod = import('./missing-chunk'); const u = new URL('./missing.svg', import.meta.url);",
      'utf8'
    );

    const result = checkBuildSiteArtifacts({ root, siteDir, label: 'release' });
    assert.equal(result.ok, false);
    assert.match(JSON.stringify(result.issues), /missing\.css/);
    assert.match(JSON.stringify(result.issues), /missing-chunk/);
    assert.match(JSON.stringify(result.issues), /missing\.svg/);
    assert.match(JSON.stringify(result.issues), /release-vendor-missing|release-libs-missing/);
  });
});

test('release parity check writes manifest and succeeds for valid dist/release artifacts in artifacts-only mode', async () => {
  await withTempDir(async root => {
    const distDir = path.join(root, 'dist');
    const releaseDir = path.join(root, 'dist', 'release');
    fs.mkdirSync(path.join(distDir, 'chunks'), { recursive: true });
    fs.mkdirSync(path.join(releaseDir, 'libs'), { recursive: true });

    fs.writeFileSync(path.join(distDir, 'index.html'), '<script src="./chunks/app.js"></script>', 'utf8');
    fs.writeFileSync(path.join(distDir, 'chunks', 'app.js'), "import('./lazy.js');", 'utf8');
    fs.writeFileSync(path.join(distDir, 'chunks', 'lazy.js'), 'export default 1;', 'utf8');

    fs.mkdirSync(path.join(releaseDir, 'chunks'), { recursive: true });
    fs.writeFileSync(path.join(releaseDir, 'index.html'), '<script src="./chunks/app.js"></script>', 'utf8');
    fs.writeFileSync(
      path.join(releaseDir, 'chunks', 'app.js'),
      "const vendor = 'libs/three.vendor.abcdef.js'; import('./lazy.js');",
      'utf8'
    );
    fs.writeFileSync(path.join(releaseDir, 'chunks', 'lazy.js'), 'export default 2;', 'utf8');
    fs.writeFileSync(
      path.join(releaseDir, 'libs', 'three.vendor.abcdef.js'),
      'export const THREE = {};',
      'utf8'
    );

    const report = await runReleaseParityChecks({
      root,
      artifactsOnly: true,
      requireDist: true,
      requireRelease: true,
      manifestOut: 'dist/release_parity.json',
    });

    assert.equal(report.ok, true);
    assert.equal(report.checks.distArtifacts.checkedJsRefs, 1);
    assert.deepEqual(report.checks.releaseArtifacts.releaseVendorFiles, ['three.vendor.abcdef.js']);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'release_parity.json'), 'utf8'));
    assert.equal(manifest.ok, true);
  });
});

test('release parity console formatter truncates oversized refs safely', () => {
  const formatted = formatRefForConsole('x'.repeat(220));
  assert.match(formatted, /\[len=220\]$/);
  assert.ok(formatted.length < 220);
});
