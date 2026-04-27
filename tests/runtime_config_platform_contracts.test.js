import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertLacksAll, assertMatchesAll } from './_source_bundle.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function bareCall(name) {
  return new RegExp(`(^|[^.\\w$])${name}\\(`, 'm');
}

function listFilesRec(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'release'].includes(ent.name)) continue;
      listFilesRec(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

test('[runtime-config-platform] legacy injected config globals stay deleted and runtime validation stays file-based', () => {
  const files = [
    'esm/entry_pro_main.ts',
    'esm/native/runtime/runtime_globals.ts',
    'types/dom_globals.d.ts',
    'tools/index_release.html',
    'tools/index_release_bundle.html',
    'tools/index_release_bundle_site2.html',
    'tools/wp_build_dist.js',
    'tools/wp_release.js',
    'index_pro.html',
    'index_site2.html',
    'wp_runtime_config.mjs',
  ];

  for (const rel of files) {
    const src = read(rel);
    assert.equal(
      src.includes('__WARDROBE_PRO_CONFIG__'),
      false,
      `${rel} should not mention __WARDROBE_PRO_CONFIG__`
    );
  }

  for (const rel of [
    'index_pro.html',
    'index_site2.html',
    'tools/index_release_bundle.html',
    'tools/index_release_bundle_site2.html',
  ]) {
    const src = read(rel);
    assert.equal(src.includes('supabase_config.js'), false, `${rel} should not load supabase_config.js`);
  }

  assert.equal(
    fs.existsSync(path.join(ROOT, 'supabase_config.js')),
    false,
    'supabase_config.js should stay deleted'
  );
  assert.equal(
    fs.existsSync(path.join(ROOT, 'supabase_config.mjs')),
    false,
    'supabase_config.mjs should stay deleted'
  );

  const targets = [
    path.join(ROOT, 'esm'),
    path.join(ROOT, 'tools'),
    path.join(ROOT, 'docs'),
    path.join(ROOT, 'types'),
  ]
    .filter(fs.existsSync)
    .flatMap(dir => listFilesRec(dir));
  targets.push(
    path.join(ROOT, 'index_pro.html'),
    path.join(ROOT, 'index_site2.html'),
    path.join(ROOT, 'wp_runtime_config.mjs')
  );

  const forbiddenTokens = [
    '__WARDROBE_PRO_FLAGS__',
    '__WARDROBE_PRO_CACHE_LIMITS__',
    'WP_SITE_VARIANT',
    'WP_SITE2_ENABLED_TABS',
  ];

  const hits = [];
  for (const file of targets) {
    if (
      !fs.existsSync(file) ||
      file.endsWith(path.join('tests', 'runtime_config_platform_contracts.test.js'))
    )
      continue;
    const ext = path.extname(file);
    if (ext && !new Set(['.ts', '.tsx', '.js', '.mjs', '.html', '.md', '.d.ts']).has(ext)) continue;
    const src = fs.readFileSync(file, 'utf8');
    for (const token of forbiddenTokens) {
      if (src.includes(token)) hits.push(`${path.relative(ROOT, file)} :: ${token}`);
    }
  }
  assert.equal(hits.length, 0, `forbidden Window-global config tokens remain:\n${hits.join('\n')}`);
});

test('[runtime-config-platform] platform hot paths keep browser timers and fetch behind canonical seams', () => {
  const renderLoop = [
    read('esm/native/platform/render_loop_impl.ts'),
    read('esm/native/platform/render_loop_impl_runtime.ts'),
  ].join('\n');
  const platform = read('esm/native/platform/platform.ts');
  const cloudOwner = [
    read('esm/native/services/cloud_sync_owner_context.ts'),
    read('esm/native/services/cloud_sync_owner_context_runtime.ts'),
    read('esm/native/services/cloud_sync_owner_context_runtime_access.ts'),
  ].join('\n');
  const cloudSync = read('esm/native/services/cloud_sync.ts');

  assertMatchesAll(
    assert,
    renderLoop,
    [/getBrowserTimers\(/, /const __raf = __timers\.requestAnimationFrame/],
    'renderLoop'
  );
  assertMatchesAll(
    assert,
    platform,
    [
      /getBrowserTimers\(/,
      /const __raf = __timers\.requestAnimationFrame/,
      /requestIdleCallbackMaybe\(App\)/,
    ],
    'platform'
  );
  assertLacksAll(assert, renderLoop, [bareCall('requestAnimationFrame')], 'renderLoop');
  assertLacksAll(
    assert,
    platform,
    [bareCall('requestAnimationFrame'), bareCall('requestIdleCallback')],
    'platform'
  );

  assert.match(cloudOwner, /getBrowserFetchMaybe/);
  assert.doesNotMatch(cloudOwner, /await\s+fetch\(/);
  assert.doesNotMatch(cloudSync, /await\s+fetch\(/);
});

test('[runtime-config-platform] installer/runtime entry modules keep named exports only', () => {
  const modules = [
    'esm/native/platform/platform.ts',
    'esm/native/platform/boot_main.ts',
    'esm/native/platform/render_loop_impl.ts',
    'esm/native/platform/smoke_checks.ts',
    'esm/native/platform/cache_pruning.ts',
    'esm/native/platform/picking_primitives.ts',
    'esm/native/platform/three_geometry_cache_patch.ts',
    'esm/native/services/canvas_picking.ts',
    'esm/native/ui/primary_mode.ts',
    'esm/native/ui/modes.ts',
  ];

  for (const rel of modules) {
    const src = read(rel);
    assert.equal(/^[ \t]*export\s+default\b/m.test(src), false, `${rel} should not export default`);
  }
});
