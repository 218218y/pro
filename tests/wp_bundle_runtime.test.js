import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { assertBundleArgsAllowed, parseBundleArgs, resolveBundlePaths } from '../tools/wp_bundle_state.js';
import {
  cleanOldBundleArtifacts,
  createBundleBuildConfig,
  writeBundleOutputs,
} from '../tools/wp_bundle_emit.js';
import { buildDistModules, shouldRebuildDistModules } from '../tools/wp_bundle_dist.js';
import { BUNDLE_CODE_SPLITTING_GROUPS, resolveTscInvocation } from '../tools/wp_bundle_shared.js';
import {
  classifyInitialModuleSubsystem,
  createInitialBundleSubsystemSummary,
} from '../tools/wp_bundle_attribution_support.js';
import {
  analyzeBundleChunkTopology,
  assertBundleChunkTopology,
  CLIENT_INITIAL_BUNDLE_BUDGET,
} from '../tools/wp_bundle_chunk_graph.js';

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
      unknownOptions: [],
    }
  );

  assert.deepEqual(parseBundleArgs(['--wat']).unknownOptions, ['--wat']);
  assert.equal(assertBundleArgsAllowed(parseBundleArgs(['--wat']), { env: {} }), true);
  assert.throws(
    () => assertBundleArgsAllowed(parseBundleArgs(['--wat']), { env: { CI: '1' } }),
    /Unknown option\(s\) in CI\/release mode: --wat/
  );
});

test('bundle path resolution derives out dir and stale tmp cleanup dir canonically', () => {
  const root = '/repo';
  const paths = resolveBundlePaths({ root, outFile: path.join('dist', 'wardrobepro.bundle.js') });
  assert.equal(paths.outFileAbs, path.join(root, 'dist', 'wardrobepro.bundle.js'));
  assert.equal(paths.outDirAbs, path.join(root, 'dist'));
  assert.equal(paths.staleTmpDirAbs, path.join(root, 'dist', '.tmp_vite_bundle'));
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

  const oldEntryAbs = path.join(root, 'dist', 'esm', 'main.js');
  const entryAbs = path.join(root, 'dist', 'esm', 'release_main.js');
  const buildInfoAbs = path.join(root, 'dist', '.tsconfig.dist.tsbuildinfo');
  fs.writeFileSync(oldEntryAbs, 'export {};\n', 'utf8');
  fs.writeFileSync(buildInfoAbs, 'info\n', 'utf8');

  const oldEntryOnly = shouldRebuildDistModules(root, {});
  assert.equal(oldEntryOnly.rebuild, true);
  assert.match(oldEntryOnly.reason, /missing built ESM entry/);
  assert.equal(oldEntryOnly.entryAbs, entryAbs);

  fs.writeFileSync(entryAbs, 'export {};\n', 'utf8');
  const staleTime = new Date(Date.now() - 10_000);
  const freshTime = new Date(Date.now() + 10_000);
  fs.utimesSync(entryAbs, staleTime, staleTime);
  fs.utimesSync(buildInfoAbs, staleTime, staleTime);
  fs.utimesSync(path.join(root, 'esm', 'entry.ts'), freshTime, freshTime);

  const stale = shouldRebuildDistModules(root, {});
  assert.equal(stale.rebuild, true);
  assert.match(stale.reason, /older than a source or config file/);
});

test('bundle TypeScript resolver refuses system tsc unless manual fallback is explicit', () => {
  const root = tempDir();
  const spawnImpl = () => ({ status: 0 });

  assert.equal(resolveTscInvocation(root, { spawnImpl, env: {} }), null);

  const manual = resolveTscInvocation(root, {
    spawnImpl,
    env: { WP_ALLOW_SYSTEM_TSC: '1', WP_TSC_BIN: '/custom/tsc' },
  });
  assert.equal(manual.kind, 'manual-bin');
  assert.equal(manual.cmd, '/custom/tsc');
  assert.deepEqual(manual.args, []);
  assert.equal(manual.source, 'manual-env-bin');
  assert.match(manual.warning, /manual mode/i);

  const blocked = resolveTscInvocation(root, {
    spawnImpl,
    env: { WP_ALLOW_SYSTEM_TSC: '1', GITHUB_ACTIONS: 'true' },
  });
  assert.equal(blocked.blocked, true);
  assert.match(blocked.errorMessage, /manual-only.*refused in CI\/release/i);
});

test('bundle dist build fails before probing system tsc when local TypeScript is missing', () => {
  const root = tempDir();
  fs.writeFileSync(path.join(root, 'tsconfig.dist.json'), '{}\n', 'utf8');

  assert.throws(
    () =>
      buildDistModules(root, {
        forceDistRebuild: true,
        env: {},
        spawnImpl() {
          return { status: 0 };
        },
      }),
    /Local TypeScript was not found.*npm ci.*Refusing to use system tsc/s
  );
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
  const statsAliasKey = path.join('/repo', 'dist', 'esm', 'native', 'builder', 'scheduler_debug_stats.js');
  const statsAliasTarget = path.join(
    '/repo',
    'dist',
    'esm',
    'native',
    'builder',
    'scheduler_debug_stats_prod.js'
  );
  assert.equal(cfg.resolve.alias[aliasKey], aliasTarget);
  assert.equal(cfg.resolve.alias[statsAliasKey], statsAliasTarget);
  assert.equal(cfg.resolve.alias['./scheduler_debug_stats.js'], statsAliasTarget);
  assert.equal(cfg.define.__WP_BUILD_CLIENT__, 'true');
  assert.equal(cfg.define.__WP_BUILD_PERF__, 'false');
  assert.equal(cfg.define.__WP_ADHESIVE_GLASS_WARMUP_MODE__, '"startup"');
  assert.equal(cfg.define.__WP_FOLDED_GEOMETRY_MODE__, '"canonical-scale"');
  assert.equal(cfg.build.copyPublicDir, false);
  assert.equal(cfg.build.rolldownOptions.preserveEntrySignatures, 'strict');
  assert.equal(cfg.build.rolldownOptions.output.entryFileNames, 'wardrobepro.bundle.js');
  assert.equal(cfg.build.rolldownOptions.output.chunkFileNames, 'wardrobepro.chunk-[name].js');
  assert.equal(cfg.build.rolldownOptions.treeshake.moduleSideEffects, false);
  assert.deepEqual(
    BUNDLE_CODE_SPLITTING_GROUPS.map(({ name, priority, tags }) => ({ name, priority, tags })),
    [
      { name: 'supabase', priority: 80, tags: undefined },
      { name: 'pdf', priority: 70, tags: undefined },
      { name: 'vendor', priority: 60, tags: undefined },
      { name: 'app_initial', priority: 50, tags: ['$initial'] },
    ]
  );
});

test('bundle build config maps scheduler debug stats to full implementation outside client mode', () => {
  const cfg = createBundleBuildConfig({
    root: '/repo',
    entryAbs: '/repo/dist/esm/release_main.js',
    tmpDirAbs: '/tmp/wp-bundle',
    args: { sourcemap: false, minify: true, buildMode: 'perf' },
  });

  const statsAliasKey = path.join('/repo', 'dist', 'esm', 'native', 'builder', 'scheduler_debug_stats.js');
  const statsAliasTarget = path.join(
    '/repo',
    'dist',
    'esm',
    'native',
    'builder',
    'scheduler_debug_stats_full.js'
  );
  assert.equal(cfg.resolve.alias[statsAliasKey], statsAliasTarget);
  assert.equal(cfg.resolve.alias['./scheduler_debug_stats.js'], statsAliasTarget);
  assert.equal(cfg.define.__WP_BUILD_CLIENT__, 'false');
  assert.equal(cfg.define.__WP_BUILD_PERF__, 'true');
  assert.equal(cfg.define.__WP_ADHESIVE_GLASS_WARMUP_MODE__, '"startup"');
  assert.equal(cfg.define.__WP_FOLDED_GEOMETRY_MODE__, '"canonical-scale"');
});

test('perf bundle accepts isolated adhesive-glass warmup experiments without changing client builds', () => {
  const previous = process.env.WP_PERF_ADHESIVE_GLASS_WARMUP_MODE;
  const previousFolded = process.env.WP_PERF_FOLDED_GEOMETRY_MODE;
  process.env.WP_PERF_ADHESIVE_GLASS_WARMUP_MODE = 'off';
  process.env.WP_PERF_FOLDED_GEOMETRY_MODE = 'canonical-scale';
  try {
    const perf = createBundleBuildConfig({
      root: '/repo',
      entryAbs: '/repo/dist/esm/release_main.js',
      tmpDirAbs: '/tmp/wp-bundle',
      args: { sourcemap: false, minify: true, buildMode: 'perf' },
    });
    const client = createBundleBuildConfig({
      root: '/repo',
      entryAbs: '/repo/dist/esm/release_main.js',
      tmpDirAbs: '/tmp/wp-bundle-client',
      args: { sourcemap: false, minify: true, buildMode: 'client' },
    });
    assert.equal(perf.define.__WP_ADHESIVE_GLASS_WARMUP_MODE__, '"off"');
    assert.equal(perf.define.__WP_FOLDED_GEOMETRY_MODE__, '"canonical-scale"');
    assert.equal(client.define.__WP_ADHESIVE_GLASS_WARMUP_MODE__, '"startup"');
    assert.equal(client.define.__WP_FOLDED_GEOMETRY_MODE__, '"canonical-scale"');
  } finally {
    if (typeof previous === 'undefined') delete process.env.WP_PERF_ADHESIVE_GLASS_WARMUP_MODE;
    else process.env.WP_PERF_ADHESIVE_GLASS_WARMUP_MODE = previous;
    if (typeof previousFolded === 'undefined') delete process.env.WP_PERF_FOLDED_GEOMETRY_MODE;
    else process.env.WP_PERF_FOLDED_GEOMETRY_MODE = previousFolded;
  }
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

test('bundle chunk topology keeps deferred features outside the static entry closure', () => {
  const result = {
    output: [
      {
        type: 'chunk',
        fileName: 'wardrobepro.bundle.js',
        isEntry: true,
        imports: ['wardrobepro.chunk-release_main.js'],
        dynamicImports: [],
      },
      {
        type: 'chunk',
        fileName: 'wardrobepro.chunk-release_main.js',
        isEntry: false,
        imports: ['wardrobepro.chunk-vendor.js'],
        dynamicImports: ['wardrobepro.chunk-DeferredSidebarTabs.js'],
      },
      {
        type: 'chunk',
        fileName: 'wardrobepro.chunk-vendor.js',
        isEntry: false,
        imports: [],
        dynamicImports: [],
        modules: {
          '/repo/node_modules/react/index.js': {},
        },
      },
      {
        type: 'chunk',
        fileName: 'wardrobepro.chunk-supabase.js',
        isEntry: false,
        imports: [],
        dynamicImports: [],
        modules: {
          '/repo/node_modules/@supabase/supabase-js/dist/index.mjs': {},
        },
      },
      {
        type: 'chunk',
        fileName: 'wardrobepro.chunk-DeferredSidebarTabs.js',
        isEntry: false,
        imports: ['wardrobepro.chunk-vendor.js'],
        dynamicImports: [],
      },
    ],
  };

  const analysis = assertBundleChunkTopology(result);
  assert.deepEqual(analysis.eagerDeferredChunks, []);
  assert.deepEqual(analysis.eagerDeferredModules, []);
  assert.deepEqual(analysis.staticCycles, []);
  assert.deepEqual(analysis.staticClosure, [
    'wardrobepro.bundle.js',
    'wardrobepro.chunk-release_main.js',
    'wardrobepro.chunk-vendor.js',
  ]);
});

test('bundle chunk topology rejects Supabase and PDF modules in generic initial chunks', () => {
  const result = {
    output: [
      {
        type: 'chunk',
        fileName: 'wardrobepro.bundle.js',
        isEntry: true,
        imports: ['wardrobepro.chunk-vendor.js'],
      },
      {
        type: 'chunk',
        fileName: 'wardrobepro.chunk-vendor.js',
        isEntry: false,
        imports: [],
        modules: {
          '/repo/node_modules/react/index.js': {},
          '/repo/node_modules/@supabase/realtime-js/dist/index.mjs': {},
          '/repo/node_modules/pdfjs-dist/build/pdf.mjs': {},
        },
      },
    ],
  };

  const analysis = analyzeBundleChunkTopology(result);
  assert.deepEqual(
    analysis.eagerDeferredModules.map(item => item.label),
    ['Supabase remote-cloud vendor', 'PDF vendor']
  );
  assert.throws(
    () => assertBundleChunkTopology(result),
    /deferred modules are statically reachable:.*Supabase remote-cloud vendor.*PDF vendor/s
  );
});

test('bundle chunk topology rejects artifact cycles and eager deferred chunks', () => {
  const result = {
    output: [
      {
        type: 'chunk',
        fileName: 'wardrobepro.bundle.js',
        isEntry: true,
        imports: ['wardrobepro.chunk-release_main.js'],
      },
      {
        type: 'chunk',
        fileName: 'wardrobepro.chunk-release_main.js',
        isEntry: false,
        imports: ['wardrobepro.chunk-DeferredSidebarTabs.js'],
      },
      {
        type: 'chunk',
        fileName: 'wardrobepro.chunk-DeferredSidebarTabs.js',
        isEntry: false,
        imports: ['wardrobepro.chunk-release_main.js'],
      },
    ],
  };

  const analysis = analyzeBundleChunkTopology(result);
  assert.deepEqual(analysis.eagerDeferredChunks, ['wardrobepro.chunk-DeferredSidebarTabs.js']);
  assert.equal(analysis.staticCycles.length, 1);
  assert.throws(
    () => assertBundleChunkTopology(result),
    /static chunk cycle:.*deferred chunks are statically reachable/s
  );
});

test('bundle chunk topology enforces deterministic initial byte, chunk, and module budgets', () => {
  const result = {
    output: [
      {
        type: 'chunk',
        fileName: 'wardrobepro.bundle.js',
        isEntry: true,
        imports: ['wardrobepro.chunk-app_initial.js'],
        code: 'entry',
        modules: {},
      },
      {
        type: 'chunk',
        fileName: 'wardrobepro.chunk-app_initial.js',
        isEntry: false,
        imports: [],
        code: 'initial-code',
        modules: { '/repo/esm/main.js': {} },
      },
    ],
  };

  const analysis = assertBundleChunkTopology(result, {
    initialBudget: { rawBytes: 100, gzipBytes: 100, chunkCount: 2, moduleCount: 1 },
  });
  assert.deepEqual(analysis.initial, {
    chunkCount: 2,
    moduleCount: 1,
    rawBytes: 17,
    gzipBytes: analysis.initial.gzipBytes,
  });
  assert.ok(analysis.initial.gzipBytes > 0);
  assert.throws(
    () =>
      assertBundleChunkTopology(result, {
        initialBudget: { ...CLIENT_INITIAL_BUNDLE_BUDGET, moduleCount: 0 },
      }),
    /initial module count exceeded budget: 1 > 0/
  );
});

test('bundle attribution groups initial modules by subsystem without counting deferred chunks', () => {
  assert.equal(
    classifyInitialModuleSubsystem('/repo/esm/native/services/canvas_picking_core.ts'),
    'canvas picking'
  );
  assert.equal(
    classifyInitialModuleSubsystem('/repo/esm/native/services/cloud_sync_main_row.ts'),
    'cloud sync'
  );
  assert.equal(classifyInitialModuleSubsystem('/repo/node_modules/react/index.js'), 'React/UI vendor');

  assert.deepEqual(
    createInitialBundleSubsystemSummary(
      [
        {
          fileName: 'initial.js',
          modules: {
            '/repo/esm/native/services/canvas_picking_core.ts': { renderedLength: 120 },
            '/repo/node_modules/react/index.js': { renderedLength: 80 },
          },
        },
        {
          fileName: 'deferred.js',
          modules: {
            '/repo/esm/native/services/cloud_sync_main_row.ts': { renderedLength: 500 },
          },
        },
      ],
      ['initial.js']
    ),
    [
      { subsystem: 'canvas picking', moduleCount: 1, renderedBytes: 120 },
      { subsystem: 'React/UI vendor', moduleCount: 1, renderedBytes: 80 },
    ]
  );
});
