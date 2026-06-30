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

  for (const category of [
    'domain-default',
    'error-message-default',
    'external-api-compat',
    'compat-boundary',
  ]) {
    assert.ok(
      Object.hasOwn(audit.summary.byCategory, category),
      `audit must expose reviewed ${category} category`
    );
  }

  for (const file of [
    'esm/native/builder/core_carcass_cornice.ts',
    'esm/native/builder/corner_connector_cornice_profile.ts',
    'esm/native/builder/corner_wing_cornice_profile.ts',
    'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts',
    'esm/native/builder/module_loop_pipeline_runtime_shared.ts',
    'esm/native/features/door_authoring/internal/trim_map.ts',
    'esm/native/features/stack_split/stack_split.ts',
    'esm/native/services/canvas_picking_sketch_free_box_gap.ts',
    'esm/native/services/render_surface_runtime_support.ts',
    'esm/native/services/render_surface_runtime_support_readers.ts',
    'esm/native/services/render_surface_runtime_support_shared.ts',
    'esm/shared/wardrobe_dimension_tokens_shared.ts',
  ]) {
    assert.equal(
      audit.summary.byFile[file]?.total || 0,
      0,
      `${file} should use current default/runtime naming without fallback or compat vocabulary`
    );
  }

  assert.equal(
    audit.summary.byFile['esm/native/ui/react/tabs/design_tab_color_action_result_reason.ts']?.total || 0,
    0,
    'design tab color action result reasons should use default-message naming without fallback vocabulary'
  );
  assert.equal(
    audit.summary.byFile['esm/native/ui/react/tabs/settings_visual_shared_room.ts']?.total || 0,
    0,
    'settings visual room shared data should use default room palettes without fallback vocabulary'
  );
  assert.equal(
    audit.summary.byFile['esm/native/ui/react/tabs/settings_visual_shared_room_defaults.ts']?.total || 0,
    0,
    'settings visual room defaults module should not use fallback vocabulary'
  );

  assert.equal(
    audit.summary.byFile['esm/native/kernel/domain_api_modules_corner_shared.ts']?.total || 0,
    0,
    'domain module corner shared JSON cloning should use safe/current naming without compatible vocabulary'
  );

  for (const file of [
    'esm/native/kernel/domain_api_surface_sections_map_writes.ts',
    'esm/native/kernel/domain_api_surface_sections_contracts.ts',
    'esm/native/kernel/domain_api_surface_sections_state.ts',
  ]) {
    assert.equal(
      audit.summary.byFile[file]?.total || 0,
      0,
      `${file} should use canonical cfg-write naming without fallback vocabulary`
    );
  }

  for (const file of [
    'esm/entry_pro.ts',
    'esm/entry_pro_overlay.ts',
    'esm/entry_pro_shared.ts',
    'esm/entry_pro_start_runtime.ts',
  ]) {
    assert.equal(
      audit.summary.byFile[file]?.total || 0,
      0,
      `${file} should use current boot overlay naming without fallback vocabulary`
    );
  }

  assert.equal(
    audit.summary.byFile['esm/native/services/autosave_shared.ts']?.total || 0,
    0,
    'autosave shared scheduler state should use current idle-timeout naming'
  );
  assert.equal(
    audit.summary.byFile['esm/native/services/cloud_sync_panel_api_snapshots_sources.ts']?.categories?.[
      'compat-boundary'
    ] || 0,
    0,
    'cloud sync snapshot source timers should use current deadline naming'
  );

  assert.equal(
    audit.summary.byFile['esm/boot/boot_manifest_steps.ts']?.total || 0,
    0,
    'boot manifest steps should use current builder install naming'
  );

  assert.equal(audit.summary.byFile['esm/native/runtime/ui_raw_selectors.ts']?.total || 0, 0);
  assert.equal(audit.summary.byFile['esm/native/runtime/ui_raw_selectors_snapshot.ts']?.total || 0, 0);
  assert.equal(audit.summary.byFile['esm/native/runtime/ui_raw_selectors_canonical.ts']?.total || 0, 0);
  assert.equal(audit.summary.byFile['esm/native/runtime/ui_raw_selectors_store.ts']?.total || 0, 0);
  assert.equal(audit.summary.byFile['esm/native/services/render_surface_runtime.ts']?.total || 0, 0);
  assert.equal(
    audit.summary.byFile['esm/native/ui/export/export_order_pdf_composite_image_slots_runtime.ts']?.total ||
      0,
    0,
    'order PDF composite-image slot runtime should stay canonical slot-bytes only'
  );

  for (const file of [
    'esm/native/runtime/maps_access_writers.ts',
    'esm/native/kernel/maps_api_named_maps.ts',
    'esm/native/kernel/domain_api_surface_sections_prefixed_maps.ts',
  ]) {
    assert.equal(
      audit.summary.byFile[file]?.total || 0,
      0,
      `${file} should keep prefixed-map alias compatibility without legacy vocabulary`
    );
  }

  for (const [file, forbidden] of [
    [
      'esm/native/runtime/maps_access_writers.ts',
      /readLegacyPrefixedAliasKey|clearLegacyPrefixedAlias|clearLegacyAlias/,
    ],
    ['esm/native/kernel/maps_api_named_maps.ts', /readLegacyPrefixedAliasKey/],
    ['esm/native/kernel/domain_api_surface_sections_prefixed_maps.ts', /readLegacyPrefixedAliasKey/],
    [
      'esm/native/builder/core_carcass_cornice.ts',
      /buildLegacyCorniceEnvelope|LegacyCorniceEnvelopeParams|legacyEnvelope/,
    ],
    ['esm/shared/wardrobe_dimension_tokens_shared.ts', /legacyEnvelope/],
    [
      'esm/native/services/scene_view_lighting_renderer.ts',
      /applyRendererCompatibility|ensureRendererCompatDefaults|restoreRendererCompatDefaults|applyNormalModeRendererCompat|rendererCompat/,
    ],
    [
      'esm/native/ui/export/export_order_pdf_composite_image_slots_runtime.ts',
      /Legacy|legacy|pngRenderSketch|pngOpenClosed|readOrderPdfCompositeImageSlotBytesFromLegacy|buildOrderPdfCompositeImageLegacyBytes/,
    ],
  ]) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), forbidden, `${file} should use current naming`);
  }

  assert.match(markdown, /Legacy \/ fallback audit/);
  assert.match(markdown, /camelCase/);
  assert.match(markdown, /compat-boundary/);

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
