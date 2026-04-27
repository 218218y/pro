import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parseBundleArgs, resolveBundlePaths } from '../tools/wp_bundle_state.js';
import {
  cleanOldBundleArtifacts,
  createBundleBuildConfig,
  writeBundleOutputs,
} from '../tools/wp_bundle_emit.js';
import { shouldRebuildDistModules } from '../tools/wp_bundle_dist.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-bundle-'));
}

test('bundle arg parsing preserves out/sourcemap/minify/rebuild policy', () => {
  assert.deepEqual(
    parseBundleArgs([
      '--out',
      'dist/custom.js',
      '--no-sourcemap',
      '--minify',
      '--force-dist-rebuild',
      '--build-mode',
      'perf',
    ]),
    {
      outFile: 'dist/custom.js',
      sourcemap: false,
      forceDistRebuild: true,
      minify: true,
      buildMode: 'perf',
    }
  );
});

test('bundle path resolution derives out dir and legacy tmp dir canonically', () => {
  const root = '/repo';
  const paths = resolveBundlePaths({ root, outFile: path.join('dist', 'wardrobepro.bundle.js') });
  assert.equal(paths.outFileAbs, path.join(root, 'dist', 'wardrobepro.bundle.js'));
  assert.equal(paths.outDirAbs, path.join(root, 'dist'));
  assert.equal(paths.legacyTmpDirAbs, path.join(root, 'dist', '.tmp_vite_bundle'));
});

test('bundle dist freshness requests rebuild when entry/build info are stale or missing', () => {
  const root = tempDir();
  fs.mkdirSync(path.join(root, 'esm'), { recursive: true });
  fs.mkdirSync(path.join(root, 'dist', 'esm'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'tsconfig.json'), '{}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'tsconfig.dist.json'), '{}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'esm', 'entry.ts'), 'export const x = 1;\n', 'utf8');

  const missing = shouldRebuildDistModules(root, {});
  assert.equal(missing.rebuild, true);
  assert.match(missing.reason, /missing built ESM entry/);

  const entryAbs = path.join(root, 'dist', 'esm', 'release_main.js');
  const buildInfoAbs = path.join(root, 'dist', '.tsconfig.dist.tsbuildinfo');
  fs.writeFileSync(entryAbs, 'export {};\n', 'utf8');
  fs.writeFileSync(buildInfoAbs, 'info\n', 'utf8');
  const staleTime = new Date(Date.now() - 10_000);
  const freshTime = new Date(Date.now() + 10_000);
  fs.utimesSync(entryAbs, staleTime, staleTime);
  fs.utimesSync(buildInfoAbs, staleTime, staleTime);
  fs.utimesSync(path.join(root, 'esm', 'entry.ts'), freshTime, freshTime);

  const stale = shouldRebuildDistModules(root, {});
  assert.equal(stale.rebuild, true);
  assert.match(stale.reason, /older than a source or config file/);
});

test('bundle artifact cleanup removes numbered chunk wrappers only', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'wardrobepro2.chunk-export_canvas.js'), 'x\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'wardrobepro99.chunk-export_canvas.js.map'), 'map\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'keep-me.js'), 'keep\n', 'utf8');
  cleanOldBundleArtifacts(dir);
  assert.equal(fs.existsSync(path.join(dir, 'wardrobepro2.chunk-export_canvas.js')), false);
  assert.equal(fs.existsSync(path.join(dir, 'wardrobepro99.chunk-export_canvas.js.map')), false);
  assert.equal(fs.existsSync(path.join(dir, 'keep-me.js')), true);
});

test('bundle emit writes entry code, sourcemap comment, and extra chunks canonically', () => {
  const tmpDir = tempDir();
  const outDir = tempDir();
  const outFile = path.join(outDir, 'wardrobepro.bundle.js');
  fs.writeFileSync(path.join(tmpDir, 'wardrobepro.bundle.js'), 'console.log("bundle");\n', 'utf8');
  fs.writeFileSync(path.join(tmpDir, 'wardrobepro.bundle.js.map'), '{"version":3}\n', 'utf8');
  fs.writeFileSync(path.join(tmpDir, 'wardrobepro.chunk-core.js'), 'console.log("core");\n', 'utf8');
  fs.mkdirSync(path.join(tmpDir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'assets', 'lazy.txt'), 'lazy\n', 'utf8');

  writeBundleOutputs({ tmpDirAbs: tmpDir, outFileAbs: outFile, outDirAbs: outDir, sourcemap: true });

  const written = fs.readFileSync(outFile, 'utf8');
  assert.match(written, /sourceMappingURL=wardrobepro\.bundle\.js\.map/);
  assert.equal(fs.existsSync(path.join(outDir, 'wardrobepro.bundle.js.map')), true);
  assert.equal(fs.existsSync(path.join(outDir, 'wardrobepro.chunk-core.js')), true);
  assert.equal(fs.existsSync(path.join(outDir, 'assets', 'lazy.txt')), true);
});

test('bundle build config keeps strict entry signatures and named chunk policy', () => {
  const cfg = createBundleBuildConfig({
    root: '/repo',
    entryAbs: '/repo/dist/esm/release_main.js',
    tmpDirAbs: '/tmp/wp-bundle',
    args: { sourcemap: true, minify: false, buildMode: 'client' },
  });

  const aliasKey = path.join('/repo', 'dist', 'esm', 'native', 'runtime', 'observability_surface.js');
  const aliasTarget = path.join('/repo', 'dist', 'esm', 'native', 'runtime', 'observability_surface_prod.js');
  assert.equal(cfg.resolve.alias[aliasKey], aliasTarget);
  assert.equal(cfg.define.__WP_BUILD_CLIENT__, 'true');
  assert.equal(cfg.define.__WP_BUILD_PERF__, 'false');
  assert.equal(cfg.build.rolldownOptions.preserveEntrySignatures, 'strict');
  assert.equal(cfg.build.rolldownOptions.output.entryFileNames, 'wardrobepro.bundle.js');
  assert.equal(cfg.build.rolldownOptions.output.chunkFileNames, 'wardrobepro.chunk-[name].js');
  assert.equal(cfg.build.rolldownOptions.treeshake.moduleSideEffects, false);
});

test('bundle emit writes build-mode marker next to the entry bundle', () => {
  const tmpDir = tempDir();
  const outDir = tempDir();
  const outFile = path.join(outDir, 'wardrobepro.bundle.js');
  fs.writeFileSync(path.join(tmpDir, 'wardrobepro.bundle.js'), 'console.log("bundle");\n', 'utf8');

  writeBundleOutputs({
    tmpDirAbs: tmpDir,
    outFileAbs: outFile,
    outDirAbs: outDir,
    sourcemap: false,
    buildMode: 'perf',
  });

  assert.equal(fs.readFileSync(`${outFile}.buildmode.txt`, 'utf8').trim(), 'perf');
});
