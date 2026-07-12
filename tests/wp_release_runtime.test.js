import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { applyContentHashingToRelease } from '../tools/wp_release_hashing.js';
import { resolveReleaseJsObfuscationPolicy } from '../tools/wp_release_build.js';
import { copyRootStaticWebAssets } from '../tools/wp_release_shared.js';
import { WEB_APP_ICON_ASSETS } from '../tools/wp_web_icon_assets.js';

import { parseReleaseArgs } from '../tools/wp_release_state.js';
import {
  buildReleaseHeaders,
  resolveFinalReleaseAssets,
  rewriteReleaseHtml,
  writeReleaseHeaders,
  writeReleaseMetadata,
  writeReleaseNotFoundPage,
} from '../tools/wp_release_finalize.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-release-'));
}

test('repository contains every canonical web-app icon advertised by source HTML and manifest', () => {
  const root = process.cwd();
  const advertisedAssets = [
    'favicon.ico',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'apple-touch-icon.png',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png',
    'site.webmanifest',
  ];

  for (const name of advertisedAssets) {
    assert.ok(WEB_APP_ICON_ASSETS.includes(name), `${name} must remain in the canonical web-icon allowlist`);
    assert.ok(fs.existsSync(path.join(root, name)), `${name} must exist in a clean repository checkout`);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'site.webmanifest'), 'utf8'));
  for (const icon of manifest.icons || []) {
    const name = String(icon?.src || '').replace(/^\/+/, '');
    assert.ok(name, 'manifest icon entries must declare a root-relative source');
    assert.ok(fs.existsSync(path.join(root, name)), `manifest icon ${name} must exist in the repository`);
  }
});

test('release root static web assets copy canonical favicon/web-app icon set into target root only', () => {
  const root = tempDir();
  const targetDir = path.join(root, 'dist', 'release');
  fs.mkdirSync(targetDir, { recursive: true });
  const iconAssets = [
    'favicon.ico',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'apple-touch-icon.png',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png',
    'site.webmanifest',
  ];
  for (const name of iconAssets) fs.writeFileSync(path.join(root, name), name, 'utf8');
  fs.writeFileSync(path.join(root, 'random-root-image.png'), 'should-not-copy', 'utf8');

  const copied = copyRootStaticWebAssets({ root, targetDir });

  assert.deepEqual(copied, iconAssets);
  for (const name of iconAssets) assert.equal(fs.readFileSync(path.join(targetDir, name), 'utf8'), name);
  assert.equal(fs.existsSync(path.join(targetDir, 'random-root-image.png')), false);
});

test('release html templates advertise the canonical favicon and web-app icon set', () => {
  const root = process.cwd();
  for (const rel of [
    path.join('tools', 'index_release.html'),
    path.join('tools', 'index_release_bundle.html'),
    path.join('tools', 'index_release_bundle_site2.html'),
  ]) {
    const html = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.match(html, /<link rel="icon" href="\.\/favicon\.ico" \/>/);
    assert.match(html, /<link rel="icon" type="image\/png" sizes="32x32" href="\.\/favicon-32x32\.png" \/>/);
    assert.match(html, /<link rel="icon" type="image\/png" sizes="16x16" href="\.\/favicon-16x16\.png" \/>/);
    assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\.\/apple-touch-icon\.png" \/>/);
    assert.match(html, /<link rel="manifest" href="\.\/site\.webmanifest" \/>/);
  }
});

test('release bundle HTML templates probe module assets before dynamic imports and expose clean recovery', () => {
  const root = process.cwd();
  for (const rel of [
    path.join('tools', 'index_release_bundle.html'),
    path.join('tools', 'index_release_bundle_site2.html'),
  ]) {
    const html = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.match(html, /probeModuleAsset\('\.\/libs\/three\.vendor\.js'\)/);
    assert.match(html, /probeModuleAsset\('\.\/wardrobepro\.bundle\.js'\)/);
    assert.match(html, /isRecoverableModuleFailure/);
    assert.match(html, /__WP_RECOVER_FROM_STALE_ASSET__/);
    assert.match(html, /data-wp-recover/);

    const overlayStart = html.indexOf('function showFatalOverlay');
    const bootStart = html.indexOf('async function loadThreeVendor', overlayStart);
    assert.ok(overlayStart > 0, `${rel} should define showFatalOverlay`);
    assert.ok(bootStart > overlayStart, `${rel} should define loadThreeVendor after the overlay renderer`);

    const outerLoaderScope = html.slice(0, overlayStart);
    assert.match(outerLoaderScope, /function moduleAssetUrl\(/);
    assert.match(outerLoaderScope, /function probeModuleAsset\(/);
    assert.match(outerLoaderScope, /function isRecoverableModuleFailure\(/);
    assert.match(outerLoaderScope, /function recoverStaleAsset\(/);

    const overlayRendererBody = html.slice(overlayStart, bootStart);
    assert.doesNotMatch(overlayRendererBody, /function probeModuleAsset\(/);
    assert.doesNotMatch(overlayRendererBody, /function isRecoverableModuleFailure\(/);
    assert.doesNotMatch(overlayRendererBody, /function recoverStaleAsset\(/);
  }
});

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

test('release headers pin mutable entrypoints/stale module fallbacks to no-store and only exact fingerprinted assets to immutable cache', () => {
  const dir = tempDir();
  fs.mkdirSync(path.join(dir, 'libs'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'wardrobepro.bundle.abc123.js'), "console.log('bundle');\n", 'utf8');
  fs.writeFileSync(path.join(dir, 'wardrobepro.chunk-core.def456.js'), "console.log('core');\n", 'utf8');
  fs.writeFileSync(path.join(dir, 'wardrobepro.chunk-oldmissing.000000.js'), "console.log('old');\n", 'utf8');
  fs.unlinkSync(path.join(dir, 'wardrobepro.chunk-oldmissing.000000.js'));
  fs.writeFileSync(path.join(dir, 'react_styles.112233.css'), 'body{}\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'assets', 'logo-8899aa.png'), 'png', 'utf8');
  fs.writeFileSync(path.join(dir, 'assets', 'plain.png'), 'png', 'utf8');
  fs.writeFileSync(path.join(dir, 'libs', 'three.vendor.0f0f0f.js'), "console.log('three');\n", 'utf8');

  const headers = buildReleaseHeaders({
    releaseDir: dir,
    bundleRelFinal: 'wardrobepro.bundle.abc123.js',
    threeVendorMetaFinal: { file: 'libs/three.vendor.0f0f0f.js' },
    chunksFinal: [{ file: 'wardrobepro.chunk-core.def456.js' }],
  });

  assert.match(headers, /\/\n  Cache-Control: no-store, no-cache, must-revalidate, max-age=0/);
  assert.match(headers, /\/index\.html\n  Cache-Control: no-store, no-cache, must-revalidate, max-age=0/);
  assert.match(headers, /\/404\.html\n  Cache-Control: no-store, no-cache, must-revalidate, max-age=0/);
  assert.match(headers, /\/version\.json\n  Cache-Control: no-store, no-cache, must-revalidate, max-age=0/);
  assert.match(headers, /\/wardrobepro\*\n  Cache-Control: no-store, no-cache, must-revalidate, max-age=0/);
  assert.match(headers, /\/libs\/\*\n  Cache-Control: no-store, no-cache, must-revalidate, max-age=0/);
  assert.match(
    headers,
    /\/wp_runtime_config\.mjs\n  Cache-Control: no-store, no-cache, must-revalidate, max-age=0/
  );
  assert.match(
    headers,
    /\/wardrobepro\.bundle\.abc123\.js\n  ! Cache-Control\n  ! Pragma\n  ! Expires\n  Cache-Control: public, max-age=31536000, immutable/
  );
  assert.match(
    headers,
    /\/wardrobepro\.chunk-core\.def456\.js\n  ! Cache-Control\n  ! Pragma\n  ! Expires\n  Cache-Control: public, max-age=31536000, immutable/
  );
  assert.match(
    headers,
    /\/react_styles\.112233\.css\n  ! Cache-Control\n  ! Pragma\n  ! Expires\n  Cache-Control: public, max-age=31536000, immutable/
  );
  assert.match(
    headers,
    /\/libs\/three\.vendor\.0f0f0f\.js\n  ! Cache-Control\n  ! Pragma\n  ! Expires\n  Cache-Control: public, max-age=31536000, immutable/
  );
  assert.match(
    headers,
    /\/assets\/logo-8899aa\.png\n  ! Cache-Control\n  ! Pragma\n  ! Expires\n  Cache-Control: public, max-age=31536000, immutable/
  );
  assert.doesNotMatch(headers, /\/wardrobepro\.chunk-\*\.js/);
  assert.doesNotMatch(headers, /\/assets\/\*/);
  assert.doesNotMatch(headers, /plain\.png\n  Cache-Control: public, max-age=31536000, immutable/);
});

test('release header writer materializes Cloudflare Pages headers in the release root', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'wardrobepro.bundle.abc123.js'), "console.log('bundle');\n", 'utf8');

  const headers = writeReleaseHeaders({
    releaseDir: dir,
    bundleRelFinal: 'wardrobepro.bundle.abc123.js',
    threeVendorMetaFinal: null,
    chunksFinal: [],
  });

  assert.equal(fs.readFileSync(path.join(dir, '_headers'), 'utf8'), headers);
  assert.match(headers, /Exact immutable asset rules are intentional/);
});

test('release writes a top-level 404 page so Cloudflare Pages does not serve index.html for missing stale modules', () => {
  const dir = tempDir();
  const html = writeReleaseNotFoundPage({ releaseDir: dir });
  assert.equal(fs.readFileSync(path.join(dir, '404.html'), 'utf8'), html);
  assert.match(html, /no-store, no-cache, must-revalidate, max-age=0/);
  assert.match(html, /קישור לקובץ ישן מפריסה קודמת/);
  assert.match(html, /wp_release_not_found\.css/);
  assert.match(html, /wp_release_not_found\.js/);
  assert.doesNotMatch(html, /<style|<script>(?!\s*<\/script>)|onclick=/);
  assert.match(fs.readFileSync(path.join(dir, 'wp_release_not_found.js'), 'utf8'), /wp_reload=404/);
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
      '<html><head><link rel="stylesheet" href="theme.css"><link rel="modulepreload" href="./libs/three.vendor.js"></head><body><script type="module" src="./wardrobepro.bundle.js"></script><script src="./wp_logo_data.js"></script><script type="module" src="./wp_runtime_config.mjs"></script></body></html>',
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
  assert.match(html, /meta name="wp-build-id" content="202603310101"/);
  assert.match(html, /wp_release_boot\.js\?v=202603310101/);
  assert.doesNotMatch(html, /<script>(?!\s*<\/script>)/);
  const releaseBoot = fs.readFileSync(path.join(dir, 'wp_release_boot.js'), 'utf8');
  assert.match(releaseBoot, /__WP_RELEASE_BUILD_ID__/);
  assert.match(releaseBoot, /__WP_RECOVER_FROM_STALE_ASSET__/);
  assert.match(releaseBoot, /Failed to fetch dynamically imported module/);
  assert.match(releaseBoot, /addEventListener\('unhandledrejection'/);
  assert.match(releaseBoot, /addEventListener\('error'/);
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
  assert.equal(
    pkg.scripts['check:release-clean'],
    'node tools/wp_release_clean_audit.mjs --dirs dist/release --optional-dirs dist/site2/release'
  );
  assert.equal(
    pkg.scripts['check:release-observability-clean'],
    'node tools/wp_release_clean_audit.mjs --dirs dist/release --optional-dirs dist/site2/release --observability'
  );
  assert.equal(pkg.scripts.bundle, 'npm run release:release');
  assert.equal(pkg.scripts['bundle:site2'], 'npm run release:site2');
});
