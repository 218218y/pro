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

  for (const entry of [
    ['esm/entry_pro_overlay.ts', 'browser-adapter'],
    ['esm/native/builder/core_carcass_cornice.ts', 'domain-default'],
    ['esm/native/services/scene_view_lighting_renderer.ts', 'external-api-compat'],
    ['esm/native/ui/export/export_order_pdf_composite_image_slots_runtime.ts', 'compat-boundary'],
    ['esm/native/ui/react/tabs/design_tab_color_action_result_reason.ts', 'error-message-default'],
    ['esm/shared/wardrobe_dimension_tokens_shared.ts', 'domain-default'],
  ]) {
    const [file, category] = entry;
    assert.ok(
      audit.summary.byFile[file]?.categories?.[category] > 0,
      `${file} must be categorized as ${category}`
    );
  }

  assert.equal(audit.summary.byFile['esm/native/runtime/ui_raw_selectors.ts']?.total || 0, 0);
  assert.equal(audit.summary.byFile['esm/native/runtime/ui_raw_selectors_snapshot.ts']?.total || 0, 0);
  assert.equal(audit.summary.byFile['esm/native/runtime/ui_raw_selectors_canonical.ts']?.total || 0, 0);
  assert.equal(audit.summary.byFile['esm/native/runtime/ui_raw_selectors_store.ts']?.total || 0, 0);
  assert.equal(audit.summary.byFile['esm/native/services/render_surface_runtime.ts']?.total || 0, 0);

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
