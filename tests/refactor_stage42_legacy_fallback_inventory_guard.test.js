import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

test('stage 42 legacy fallback inventory closeout is anchored', () => {
  const allowlist = readJson('tools/wp_legacy_fallback_allowlist.json');
  const audit = readJson('docs/legacy_fallback_audit.json');
  const markdown = readFileSync('docs/LEGACY_FALLBACK_AUDIT.md', 'utf8');

  assert.equal(allowlist.version, 1);
  assert.equal(allowlist.sourceRoot, 'esm');
  assert.equal(audit.summary.byCategory['legacy-runtime-risk'], 0);
  assert.equal(audit.summary.byCategory.unknown, 0);
  for (const file of [
    'esm/native/runtime/storage_access.ts',
    'esm/native/platform/storage.ts',
    'esm/native/platform/three_geometry_cache_patch_contracts.ts',
    'esm/native/platform/three_geometry_cache_patch_constructors.ts',
    'esm/native/services/boot_seeds_part02_shared.ts',
    'esm/native/services/cloud_sync_owner_context_runtime_shared.ts',
    'esm/native/services/cloud_sync_support_storage_shared.ts',
    'esm/native/features/door_style_overrides.ts',
    'esm/native/platform/platform.ts',
    'esm/native/services/scene_view.ts',
    'esm/native/services/textures_cache.ts',
    'esm/native/services/config_compounds.ts',
    'esm/native/ui/react/boot_react_ui.tsx',
    'esm/native/features/modules_configuration/calc_module_structure.ts',
    'esm/native/runtime/default_state.ts',
    'esm/native/runtime/ui_raw_selectors.ts',
    'esm/native/runtime/ui_raw_selectors_shared.ts',
    'esm/native/runtime/ui_raw_selectors_snapshot.ts',
    'esm/native/runtime/ui_raw_selectors_canonical.ts',
    'esm/native/runtime/ui_raw_selectors_store.ts',
    'esm/native/ui/react/selectors/ui_raw_selectors.ts',
  ]) {
    assert.equal(audit.summary.byFile[file]?.total || 0, 0, `${file} should stay out of the inventory`);
  }
  const uiRawSelectorInventoryTotal = [
    'esm/native/runtime/ui_raw_selectors.ts',
    'esm/native/runtime/ui_raw_selectors_snapshot.ts',
    'esm/native/runtime/ui_raw_selectors_canonical.ts',
    'esm/native/runtime/ui_raw_selectors_store.ts',
  ].reduce((sum, file) => sum + (audit.summary.byFile[file]?.total || 0), 0);
  assert.equal(uiRawSelectorInventoryTotal, 0);
  assert.equal(audit.summary.byFile['esm/native/services/render_surface_runtime.ts']?.total || 0, 0);
  assert.match(markdown, /Legacy \/ fallback audit/);

  const result = spawnSync(
    process.execPath,
    ['tools/wp_legacy_fallback_audit.mjs', '--check', '--no-print'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  assert.equal(
    result.status,
    0,
    `legacy fallback audit failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
});
