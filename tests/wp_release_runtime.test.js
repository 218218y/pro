import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { applyContentHashingToRelease } from '../tools/wp_release_hashing.js';
import { resolveReleaseJsObfuscationPolicy } from '../tools/wp_release_build.js';

import { parseReleaseArgs } from '../tools/wp_release_state.js';
import {
  resolveFinalReleaseAssets,
  rewriteReleaseHtml,
  writeReleaseMetadata,
} from '../tools/wp_release_finalize.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-release-'));
}

test('release hashing rewrites bundle/chunk refs and hashes vendor/css files', () => {
  const dir = tempDir();
  const libs = path.join(dir, 'libs');
  fs.mkdirSync(libs, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'wardrobepro.bundle.js'),
    "import('./wardrobepro.chunk-core.js');import './theme.css';import './libs/three.vendor.js';\n",
    'utf8'
  );
  fs.writeFileSync(path.join(dir, 'wardrobepro.chunk-core.js'), "console.log('core');\n", 'utf8');
  fs.writeFileSync(path.join(dir, 'theme.css'), 'body{color:red;}\n', 'utf8');
  fs.writeFileSync(path.join(libs, 'three.vendor.js'), "console.log('three');\n", 'utf8');

  const hashed = applyContentHashingToRelease({ releaseDirAbs: dir, keepSourceMap: false });
  const bundleRel = hashed.js['wardrobepro.bundle.js'];
  const chunkRel = hashed.js['wardrobepro.chunk-core.js'];
  const cssRel = hashed.css['theme.css'];
  const vendorRel = hashed.three['libs/three.vendor.js'];

  assert.ok(bundleRel && chunkRel && cssRel && vendorRel, 'hash maps should be populated');
  assert.ok(fs.existsSync(path.join(dir, bundleRel)));
  assert.ok(fs.existsSync(path.join(dir, chunkRel)));
  assert.ok(fs.existsSync(path.join(dir, cssRel)));
  assert.ok(fs.existsSync(path.join(dir, vendorRel)));

  const code = fs.readFileSync(path.join(dir, bundleRel), 'utf8');
  assert.match(code, new RegExp(path.basename(chunkRel).replace(/\./g, '\\.')));
  assert.ok(!fs.existsSync(path.join(dir, 'theme.css')));
  assert.ok(!fs.existsSync(path.join(dir, 'libs', 'three.vendor.js')));
  assert.equal(typeof hashed.buildId, 'string');
  assert.ok(hashed.buildId.length >= 6);
});

test('release obfuscation policy keeps startup/vendor paths safe and allows explicit on-demand chunks only', () => {
  assert.deepEqual(
    resolveReleaseJsObfuscationPolicy({
      filePath: 'three.vendor.js',
      requestedMode: 'strong',
      wantObfuscate: true,
    }),
    { wantObfuscate: false, mode: 'strong', reason: 'skip:three_vendor' }
  );
  assert.deepEqual(
    resolveReleaseJsObfuscationPolicy({
      filePath: 'wardrobepro.bundle.js',
      requestedMode: 'balanced',
      wantObfuscate: true,
    }),
    { wantObfuscate: false, mode: 'balanced', reason: 'skip:entry_bundle_startup_safety' }
  );
  assert.deepEqual(
    resolveReleaseJsObfuscationPolicy({
      filePath: 'wardrobepro.chunk-export_canvas.js',
      requestedMode: 'lite',
      wantObfuscate: true,
    }),
    { wantObfuscate: true, mode: 'lite', reason: 'allowlist:on_demand_feature' }
  );
  assert.deepEqual(
    resolveReleaseJsObfuscationPolicy({
      filePath: 'wardrobepro.chunk-core.js',
      requestedMode: 'lite',
      wantObfuscate: true,
    }),
    { wantObfuscate: false, mode: 'lite', reason: 'skip:core_chunk_startup_safety' }
  );
});

test('release arg parsing keeps site2/template/out and secure sourcemap policy canonical', () => {
  const root = '/repo';
  const parsed = parseReleaseArgs({
    root,
    args: ['--site2', '--out', 'dist/release-site2', '--obfuscate-strong', '--debug', '--no-css-minify'],
  });

  assert.equal(parsed.distRootRel, 'dist/site2');
  assert.equal(parsed.templatePath, path.join(root, 'tools', 'index_release_bundle_site2.html'));
  assert.equal(parsed.outDirRel, 'dist/release-site2');
  assert.equal(parsed.wantObfuscate, true);
  assert.equal(parsed.obfuscateMode, 'strong');
  assert.equal(
    parsed.keepSourceMap,
    false,
    'secure builds should disable sourcemaps when obfuscation is requested'
  );
  assert.equal(parsed.wantCssMinify, false);
  assert.equal(parsed.buildMode, 'debug');
});

test('release finalize rewrites hashed html refs and modulepreloads canonical assets', () => {
  const dir = tempDir();
  const libs = path.join(dir, 'libs');
  fs.mkdirSync(libs, { recursive: true });
  fs.writeFileSync(path.join(dir, 'wardrobepro.bundle.abc123.js'), "console.log('bundle');\n", 'utf8');
  fs.writeFileSync(path.join(dir, 'wardrobepro.chunk-core.def456.js'), "console.log('core');\n", 'utf8');
  fs.writeFileSync(path.join(dir, 'wardrobepro.chunk-vendor.fff999.js'), "console.log('vendor');\n", 'utf8');
  fs.writeFileSync(path.join(libs, 'three.vendor.0f0f0f.js'), "console.log('three');\n", 'utf8');

  const hashed = {
    buildId: '202603310101',
    js: {
      'wardrobepro.bundle.js': 'wardrobepro.bundle.abc123.js',
      'wardrobepro.chunk-core.js': 'wardrobepro.chunk-core.def456.js',
      'wardrobepro.chunk-vendor.js': 'wardrobepro.chunk-vendor.fff999.js',
    },
    css: { 'theme.css': 'theme.123abc.css' },
    three: { 'libs/three.vendor.js': 'libs/three.vendor.0f0f0f.js' },
  };

  const finalAssets = resolveFinalReleaseAssets({
    releaseDir: dir,
    hashAssets: true,
    hashed,
    keepSourceMap: false,
    chunkLogicalFiles: ['wardrobepro.chunk-core.js', 'wardrobepro.chunk-vendor.js'],
  });
  const html = rewriteReleaseHtml({
    htmlTemplate:
      '<html><head><link rel="stylesheet" href="theme.css"></head><body><script type="module">import "./libs/three.vendor.js"; import "./wardrobepro.bundle.js";</script><script src="./wp_logo_data.js"></script><script type="module" src="./wp_runtime_config.mjs"></script></body></html>',
    releaseDir: dir,
    hashAssets: true,
    hashed,
    bundleRelFinal: finalAssets.bundleRelFinal,
    threeVendorMetaFinal: finalAssets.threeVendorMetaFinal,
    buildId: finalAssets.buildId,
  });

  assert.match(html, /theme\.123abc\.css/);
  assert.match(html, /libs\/three\.vendor\.0f0f0f\.js/);
  assert.match(html, /wardrobepro\.bundle\.abc123\.js/);
  assert.match(html, /wp_logo_data\.js\?v=202603310101/);
  assert.match(html, /wp_runtime_config\.mjs\?v=202603310101/);
  assert.match(html, /__WP_RELEASE_BUILD_ID__/);
  assert.match(html, /modulepreload/);
});

test('release arg parsing accepts explicit perf build mode without changing sourcemap policy', () => {
  const parsed = parseReleaseArgs({
    root: '/repo',
    args: ['--build-mode', 'perf', '--no-sourcemap'],
  });

  assert.equal(parsed.buildMode, 'perf');
  assert.equal(parsed.keepSourceMap, false);
});

test('release metadata records the client observability mode for shipped bundles', () => {
  const root = tempDir();
  const releaseDir = path.join(root, 'dist', 'release');
  fs.mkdirSync(path.join(releaseDir, 'libs'), { recursive: true });
  fs.writeFileSync(path.join(releaseDir, 'wardrobepro.bundle.js'), "console.log('bundle');\n", 'utf8');
  fs.writeFileSync(path.join(releaseDir, 'wardrobepro.bundle.js.buildmode.txt'), 'client\n', 'utf8');
  fs.writeFileSync(path.join(releaseDir, 'libs', 'three.vendor.js'), "console.log('three');\n", 'utf8');

  const meta = writeReleaseMetadata({
    root,
    releaseDir,
    minifyInfo: { minified: true, engine: 'oxc' },
    htmlInfo: { minified: true },
    cssMinifyInfo: { minified: true },
    obfuscateInfo: { obfuscated: true },
    obfuscateMode: 'balanced',
    keepSourceMap: false,
    hashAssets: true,
    buildMode: 'client',
    buildId: '202604201700',
    bundleRelFinal: 'wardrobepro.bundle.js',
    bundleAbsFinal: path.join(releaseDir, 'wardrobepro.bundle.js'),
    bundleMapRelFinal: null,
    threeVendorMetaFinal: {
      file: 'libs/three.vendor.js',
      sha256: 'stub',
      bytes: fs.statSync(path.join(releaseDir, 'libs', 'three.vendor.js')).size,
      sourcemap: null,
    },
    chunksFinal: [],
  });

  assert.equal(meta.bundle.buildMode, 'client');
  assert.equal(meta.build.observabilityMode, 'client');
  const versionJson = JSON.parse(fs.readFileSync(path.join(releaseDir, 'version.json'), 'utf8'));
  assert.equal(versionJson.bundle.buildMode, 'client');
  assert.equal(versionJson.build.observabilityMode, 'client');
  const readme = fs.readFileSync(path.join(releaseDir, 'README_RELEASE.txt'), 'utf8');
  assert.match(readme, /Observability build mode for this release: client/);
  assert.match(readme, /buildmode\.txt marker/);
});

test('package release scripts keep client mode explicit for shipped site bundles', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  assert.match(pkg.scripts.release, /--build-mode client/);
  assert.equal(pkg.scripts['release:client'], 'npm run release');
  assert.match(pkg.scripts['release:release'], /--build-mode client/);
  assert.match(pkg.scripts['release:site2'], /--build-mode client/);
  assert.equal(pkg.scripts.bundle, 'npm run release:release');
  assert.equal(pkg.scripts['bundle:site2'], 'npm run release:site2');
});
