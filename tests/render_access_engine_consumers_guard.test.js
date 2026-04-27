import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleSources, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const engineConsumersRaw = bundleSources(
  [
    '../esm/native/services/scene_view.ts',
    '../esm/native/services/scene_view_shared.ts',
    '../esm/native/services/scene_view_lighting.ts',
    '../esm/native/services/scene_view_lighting_shared.ts',
    '../esm/native/services/scene_view_lighting_renderer.ts',
    '../esm/native/services/scene_view_lighting_runtime.ts',
    '../esm/native/services/scene_view_store_sync.ts',
    '../esm/native/builder/materials_factory.ts',
    '../esm/native/builder/materials_factory_shared.ts',
    '../esm/native/builder/render_ops_extras.ts',
    '../esm/native/builder/render_ops_extras_shared.ts',
    '../esm/native/builder/render_ops_extras_dimensions.ts',
    '../esm/native/builder/render_ops_extras_outlines.ts',
  ],
  import.meta.url
);
const engineConsumers = bundleSources(
  [
    '../esm/native/services/scene_view.ts',
    '../esm/native/services/scene_view_shared.ts',
    '../esm/native/services/scene_view_lighting.ts',
    '../esm/native/services/scene_view_lighting_shared.ts',
    '../esm/native/services/scene_view_lighting_renderer.ts',
    '../esm/native/services/scene_view_lighting_runtime.ts',
    '../esm/native/services/scene_view_store_sync.ts',
    '../esm/native/builder/materials_factory.ts',
    '../esm/native/builder/materials_factory_shared.ts',
    '../esm/native/builder/render_ops_extras.ts',
    '../esm/native/builder/render_ops_extras_shared.ts',
    '../esm/native/builder/render_ops_extras_dimensions.ts',
    '../esm/native/builder/render_ops_extras_outlines.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const renderAccess = bundleSources(
  [
    '../esm/native/runtime/render_access.ts',
    '../esm/native/runtime/render_access_surface.ts',
    '../esm/native/runtime/render_access_state.ts',
    '../esm/native/runtime/render_access_state_bags.ts',
    '../esm/native/runtime/render_access_state_runtime.ts',
    '../esm/native/runtime/render_access_shared.ts',
  ],
  import.meta.url
);

test('engine consumers use canonical render access helpers instead of raw App.render probing', () => {
  assertLacksAll(assert, engineConsumers, [/App\.render/], 'engine render bundle');
  assertMatchesAll(
    assert,
    engineConsumersRaw,
    [
      /getAmbientLight\(/,
      /getDirectionalLight\(/,
      /getShadowMap\(/,
      /readRendererCompatDefaults\(/,
      /ensureRenderCacheMaps\(/,
      /ensureRenderMetaMaps\(/,
      /ensureRenderMaterialSlots\(/,
      /bindLegacyRenderCompatRefs\(/,
      /getWardrobeGroup\(/,
    ],
    'engine render bundle'
  );

  assertMatchesAll(
    assert,
    renderAccess,
    [
      /getRenderCache\(/,
      /getRenderMeta\(/,
      /getRenderMaterials\(/,
      /bindLegacyRenderCompatRefs\(/,
      /ensureRenderCacheMaps\(/,
      /ensureRenderMetaMaps\(/,
      /ensureRenderMaterialSlots\(/,
      /readRendererCompatDefaults\(/,
      /getAmbientLight\(/,
      /getDirectionalLight\(/,
      /getShadowMap\(/,
    ],
    'render access surface'
  );
});
