import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function exists(rel) {
  return fs.existsSync(new URL(`../${rel}`, import.meta.url));
}

const smokeBundlePaths = [
  '../esm/native/platform/smoke_checks.ts',
  '../esm/native/platform/smoke_checks_core.ts',
  '../esm/native/platform/smoke_checks_scenario.ts',
  '../esm/native/platform/smoke_checks_shared.ts',
];

function stripNoise(input) {
  return String(input || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, '``');
}

const servicesApi = readSource('../esm/native/services/api.ts', import.meta.url);
const servicesPlatformSurface = readSource(
  '../esm/native/services/api_services_platform_surface.ts',
  import.meta.url
);
const runtimeBuilderAccess = readSource('../esm/native/runtime/builder_service_access.ts', import.meta.url);
const runtimeBuilderAccessShared = readSource(
  '../esm/native/runtime/builder_service_access_shared.ts',
  import.meta.url
);
const runtimeBuilderAccessSlots = readSource(
  '../esm/native/runtime/builder_service_access_slots.ts',
  import.meta.url
);
const runtimeBuilderAccessCalls = readSource(
  '../esm/native/runtime/builder_service_access_calls.ts',
  import.meta.url
);
const runtimeBuilderAccessBuild = readSource(
  '../esm/native/runtime/builder_service_access_build.ts',
  import.meta.url
);
const builderDepsAccess = readSource('../esm/native/runtime/builder_deps_access.ts', import.meta.url);
const roomAccess = readSource('../esm/native/runtime/room_design_access.ts', import.meta.url);
const builderBundle = bundleSources(
  [
    '../esm/native/builder/sliding_doors_pipeline.ts',
    '../esm/native/builder/external_drawers_pipeline.ts',
    '../esm/native/builder/pre_build_reset.ts',
    '../esm/native/builder/interior_pipeline.ts',
    '../esm/native/builder/materials_apply.ts',
    '../esm/native/builder/module_loop_pipeline.ts',
    '../esm/native/builder/module_loop_pipeline_shared.ts',
    '../esm/native/builder/module_loop_pipeline_runtime.ts',
    '../esm/native/builder/module_loop_pipeline_module.ts',
    '../esm/native/builder/module_loop_pipeline_module_depth.ts',
    '../esm/native/builder/module_loop_pipeline_module_frame.ts',
    '../esm/native/builder/module_loop_pipeline_module_dividers.ts',
    '../esm/native/builder/module_loop_pipeline_module_registry.ts',
    '../esm/native/builder/module_loop_pipeline_module_contents.ts',
    '../esm/native/builder/post_build_finalize.ts',
    '../esm/native/builder/build_runner.ts',
    '../esm/native/builder/build_wardrobe_flow.ts',
    '../esm/native/builder/build_wardrobe_flow_prepare.ts',
    '../esm/native/builder/build_wardrobe_flow_execute.ts',
    '../esm/native/builder/build_wardrobe_flow_context.ts',
    '../esm/native/builder/post_build_extras_pipeline.ts',
    '../esm/native/builder/post_build_dimensions.ts',
    '../esm/native/builder/post_build_visual_overlays.ts',
    '../esm/native/builder/visuals_and_contents.ts',
    '../esm/native/builder/visuals_and_contents_shared.ts',
    '../esm/native/builder/visuals_and_contents_door_visual.ts',
    '../esm/native/builder/visuals_chest_mode.ts',
    '../esm/native/builder/visuals_contents.ts',
    '../esm/native/builder/hinged_doors_pipeline.ts',
    '../esm/native/builder/internal_drawers_pipeline.ts',
    '../esm/native/builder/material_resolver.ts',
    '../esm/native/builder/handle_factory.ts',
    '../esm/native/builder/board_factory.ts',
    '../esm/native/builder/state_sanitize_pipeline.ts',
    '../esm/native/builder/render_adapter.ts',
    '../esm/native/builder/handles.ts',
    '../esm/native/builder/plan.ts',
    '../esm/native/builder/registry.ts',
    '../esm/native/builder/scheduler.ts',
    '../esm/native/builder/corner_wing.ts',
    '../esm/native/builder/corner_wing_runtime.ts',
    '../esm/native/builder/corner_wing_context.ts',
    '../esm/native/builder/corner_wing_shadows.ts',
    '../esm/native/builder/corner_wing_install.ts',
    '../esm/native/builder/provide.ts',
    '../esm/native/builder/core_pure.ts',
    '../esm/native/builder/core_pure_compute.ts',
    '../esm/native/builder/core_layout_compute.ts',
    '../esm/native/builder/core_doors_compute.ts',
    '../esm/native/builder/core_storage_compute.ts',
    '../esm/native/builder/core_carcass_compute.ts',
    '../esm/native/builder/core_carcass_shared.ts',
    '../esm/native/builder/core_carcass_shell.ts',
    '../esm/native/builder/core_carcass_cornice.ts',
    '../esm/native/builder/core_pure_shared.ts',
    '../esm/native/builder/materials_factory.ts',
    '../esm/native/builder/render_ops_extras.ts',
    '../esm/native/builder/render_ops.ts',
    ...smokeBundlePaths,
  ],
  import.meta.url,
  { stripNoise: true }
);
const platformBundle = bundleSources(
  [
    '../esm/native/platform/platform.ts',
    '../esm/native/platform/platform_shared.ts',
    '../esm/native/platform/platform_util.ts',
    '../esm/native/platform/platform_services.ts',
    '../esm/native/platform/platform_boot.ts',
    '../esm/native/platform/boot_main.ts',
    '../esm/native/ui/react/actions/builder_actions.ts',
    '../esm/native/ui/react/actions/handles_actions.ts',
    '../esm/native/services/viewport_runtime.ts',
    '../esm/native/services/canvas_picking_core.ts',
    '../esm/native/services/edit_state.ts',
    '../esm/native/services/edit_state_shared.ts',
    '../esm/native/services/edit_state_reset.ts',
    '../esm/native/services/edit_state_sync.ts',
    '../esm/native/services/edit_state_runtime.ts',
    '../esm/native/builder/room.ts',
    '../esm/native/builder/room_internal_shared.ts',
    '../esm/native/builder/room_floor_texture.ts',
    '../esm/native/builder/room_scene_primitives.ts',
    '../esm/native/services/build_reactions.ts',
    '../esm/native/runtime/app_helpers.ts',
    '../esm/native/services/autosave.ts',
    '../esm/native/services/autosave_shared.ts',
    '../esm/native/services/autosave_snapshot.ts',
    '../esm/native/services/autosave_runtime.ts',
    '../esm/native/services/autosave_schedule.ts',
    '../esm/native/ui/export_canvas.ts',
    '../esm/native/ui/export/export_canvas_shared.ts',
    '../esm/native/ui/export/export_canvas_core.ts',
    '../esm/native/ui/export/export_canvas_scene.ts',
    '../esm/native/ui/export/export_canvas_viewport.ts',
    '../esm/native/ui/export/export_canvas_delivery.ts',
    '../esm/native/ui/react/tabs/RenderTab.view.tsx',
    '../esm/native/ui/react/tabs/use_render_tab_controller.ts',
    '../esm/native/ui/react/tabs/use_render_tab_room_design.ts',
    '../esm/native/ui/react/tabs/render_tab_shared.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_contracts.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_normalize.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_lighting.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_room.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_room_fallbacks.ts',
    '../esm/native/ui/react/tabs/render_tab_shared_interactions.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const autosaveBundle = bundleSources(
  [
    '../esm/native/services/autosave.ts',
    '../esm/native/services/autosave_shared.ts',
    '../esm/native/services/autosave_snapshot.ts',
    '../esm/native/services/autosave_runtime.ts',
    '../esm/native/services/autosave_schedule.ts',
    '../esm/native/services/autosave_shared.ts',
    '../esm/native/services/autosave_snapshot.ts',
    '../esm/native/services/autosave_runtime.ts',
    '../esm/native/services/autosave_schedule.ts',
    '../esm/native/runtime/autosave_access.ts',
    '../esm/native/runtime/project_capture_access.ts',
    '../esm/native/runtime/storage_access.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const room = read('esm/native/builder/room.ts');
const roomActiveState = read('esm/native/builder/room_active_state.ts');
const roomLifecycle = read('esm/native/builder/room_lifecycle.ts');
const roomDesignSurface = read('esm/native/builder/room_design_surface.ts');
const roomBundle = [
  read('esm/native/builder/room.ts'),
  read('esm/native/builder/room_active_state.ts'),
  read('esm/native/builder/room_design_surface.ts'),
  read('esm/native/builder/room_lifecycle.ts'),
  read('esm/native/builder/room_internal_shared.ts'),
  read('esm/native/builder/room_shared_types.ts'),
  read('esm/native/builder/room_shared_utils.ts'),
  read('esm/native/builder/room_shared_state.ts'),
  read('esm/native/builder/room_floor_texture.ts'),
  read('esm/native/builder/room_scene_primitives.ts'),
].join('\n');
const visuals = [
  read('esm/native/builder/visuals_and_contents.ts'),
  read('esm/native/builder/visuals_and_contents_shared.ts'),
].join('\n');
const sceneRuntime = read('esm/native/services/scene_runtime.ts');
const pureApi = read('esm/native/builder/pure_api.ts');
const cornerWing = [
  read('esm/native/builder/corner_wing.ts'),
  read('esm/native/builder/corner_wing_runtime.ts'),
  read('esm/native/builder/corner_wing_context.ts'),
  read('esm/native/builder/corner_wing_shadows.ts'),
  read('esm/native/builder/corner_wing_install.ts'),
].join('\n');

test('[builder-access] shared runtime access surfaces own builder, deps, and room-design seams', () => {
  assertMatchesAll(
    assert,
    runtimeBuilderAccess,
    [
      /from '\.\/builder_service_access_shared\.js';/,
      /from '\.\/builder_service_access_slots\.js';/,
      /from '\.\/builder_service_access_calls\.js';/,
      /from '\.\/builder_service_access_build\.js';/,
      /ensureBuilderService/,
      /getBuilderMirrorMaterialFactory/,
      /requestBuilderImmediateBuild/,
      /requestBuilderForcedBuild/,
      /requestBuilderDebouncedBuild/,
      /requestBuilderBuildFromActionMeta/,
      /requestBuilderBuildWithUiFromActionMeta/,
      /requestBuilderStructuralRefresh/,
      /requestBuilderBuildWithUi/,
    ],
    'runtimeBuilderAccess'
  );
  assertLacksAll(
    assert,
    runtimeBuilderAccess,
    [
      /function bindBuilderMethod\(/,
      /function cloneBuilderRequestMeta\(/,
      /function getBuilderMirrorMaterialFactory\(/,
      /function requestBuilderBuild\(/,
    ],
    'runtimeBuilderAccess'
  );
  assertMatchesAll(
    assert,
    runtimeBuilderAccessShared,
    [
      /export function ensureBuilderService\(/,
      /export function getBuilderService\(/,
      /export function requireBuilderService\(/,
      /export function bindBuilderMethod/,
      /export function cloneBuilderRequestMeta/,
    ],
    'runtimeBuilderAccessShared'
  );
  assertMatchesAll(
    assert,
    runtimeBuilderAccessSlots,
    [
      /export function getBuilderHandlesService\(/,
      /export function getBuilderRenderOps\(/,
      /export function requireBuilderRenderOps\(/,
      /export function getBuilderRegistry\(/,
      /export function finalizeBuilderRegistry\(/,
      /export function getBuilderRenderAdapterService\(/,
      /export function getBuilderMaterialsService\(/,
      /export function getBuilderContentsService\(/,
      /export function getBuilderScheduler\(/,
    ],
    'runtimeBuilderAccessSlots'
  );
  assertMatchesAll(
    assert,
    runtimeBuilderAccessCalls,
    [
      /export function getBuilderAddOutlines\(/,
      /export function getBuilderGetMaterial\(/,
      /export function requireBuilderGetMaterial\(/,
      /export function getBuilderMirrorMaterialFactory\(/,
      /export function resolveBuilderMirrorMaterial\(/,
      /export function getBuilderCreateDoorVisual\(/,
      /export function requireBuilderCreateDoorVisual\(/,
      /export function getBuilderAddFoldedClothes\(/,
      /export function requireBuilderAddFoldedClothes\(/,
    ],
    'runtimeBuilderAccessCalls'
  );
  assertMatchesAll(
    assert,
    runtimeBuilderAccessBuild,
    [
      /from '\.\/builder_service_access_build_ui\.js';/,
      /from '\.\/builder_service_access_build_render\.js';/,
      /from '\.\/builder_service_access_build_handles\.js';/,
      /from '\.\/builder_service_access_build_followthrough\.js';/,
      /from '\.\/builder_service_access_build_request\.js';/,
      /from '\.\/builder_service_access_build_shared\.js';/,
      /export\s*\{[\s\S]*getBuilderBuildUi,[\s\S]*clearBuilderBuildUi,[\s\S]*\}\s*from '\.\/builder_service_access_build_ui\.js';/s,
      /export\s*\{[\s\S]*runBuilderRenderFollowThrough[\s\S]*\}\s*from '\.\/builder_service_access_build_render\.js';/s,
      /export\s*\{[\s\S]*applyBuilderHandles,[\s\S]*refreshBuilderHandles,[\s\S]*\}\s*from '\.\/builder_service_access_build_handles\.js';/s,
      /export\s*\{[\s\S]*runBuilderPostBuildFollowThrough,[\s\S]*runBuilderChestModeFollowThrough,[\s\S]*\}\s*from '\.\/builder_service_access_build_followthrough\.js';/s,
      /export\s*\{[\s\S]*getBuilderBuildWardrobe,[\s\S]*requestBuilderBuild,[\s\S]*refreshBuilderAfterDoorOps,[\s\S]*requestBuilderBuildWithUi,[\s\S]*\}\s*from '\.\/builder_service_access_build_request\.js';/s,
    ],
    'runtimeBuilderAccessBuild'
  );
  assertMatchesAll(
    assert,
    builderDepsAccess,
    [
      /export function getBuilderDepsRoot\(/,
      /export function ensureBuilderDepsNamespace\(/,
      /export function isBuilderDepsReady\(/,
      /export function setBuilderDepsReady\(/,
    ],
    'builderDepsAccess'
  );
  assertMatchesAll(
    assert,
    roomAccess,
    [
      /export function ensureRoomDesignService\(/,
      /export function getRoomDesignServiceMaybe\(/,
      /export function requireRoomDesignService\(/,
    ],
    'roomAccess'
  );
  assertMatchesAll(
    assert,
    servicesApi,
    [
      /getBuilderDepsRoot/,
      /ensureBuilderDepsNamespace/,
      /ensureRoomDesignService/,
      /getRoomDesignServiceMaybe/,
      /requireRoomDesignService/,
      /from '\.\/api_services_surface\.js';/,
    ],
    'servicesApi'
  );
  assertMatchesAll(
    assert,
    servicesPlatformSurface,
    [
      /export \{[\s\S]*ensureRoomDesignService,[\s\S]*getRoomDesignServiceMaybe,[\s\S]*requireRoomDesignService,[\s\S]*\} from '\.\.\/runtime\/room_design_access\.js';/s,
      /from '\.\/camera_access\.js';/,
    ],
    'servicesPlatformSurface'
  );
});

test('[builder-access] migrated builder and cross-layer callsites use runtime helpers without legacy bag probing', () => {
  assertLacksAll(
    assert,
    builderBundle,
    [
      /App\.services\.builder/,
      /App\.deps\.builder/,
      /app\.deps\.builder/,
      /deps\.builder/,
      /from ['"]\.\/ns\.js['"]/,
      /export default\s+/,
    ],
    'builderBundle'
  );
  assertMatchesAll(
    assert,
    platformBundle,
    [
      /getBuilderBuildUi\(App\)/,
      /ensureBuilderBuildUi\(app,/,
      /getBuilderScheduler\(root\)/,
      /(?:const container = asViewportRuntimeAppContainer\(App\);[\s\S]*runBuilderBuildWardrobe\(container\)|runBuilderBuildWardrobe\(asAppContainer\(App\)\))/,
      /getRoomDesignServiceMaybe\((?:App|app)\)/,
      /runPlatformRenderFollowThrough\b/,
      /reportErrorViaPlatform\b/,
      /stringifyViaPlatform\(/,
      /logViaPlatform\(/,
      /idleViaPlatform\(/,
    ],
    'platformBundle'
  );
  assertLacksAll(assert, platformBundle, [/services\.builder/, /localStorage\./], 'platformBundle');
  assertMatchesAll(
    assert,
    pureApi,
    [/from '\.\/core_pure\.js';/, /export const corePure = builderCorePureObject;/, /computeCarcassOps/],
    'pureApi'
  );
  assert.doesNotMatch(pureApi, /export default\s+/);
});

test('[builder-access] deleted helper duplicates stay removed and critical callsites stay on canonical seams', () => {
  for (const rel of [
    'esm/native/ui/builder_access.ts',
    'esm/native/platform/builder_access.ts',
    'esm/native/services/builder_access.ts',
    'esm/native/io/builder_access.ts',
    'esm/native/kernel/builder_access.ts',
    'esm/native/builder/service_access.ts',
    'esm/native/ui/room_design_access.ts',
    'esm/native/runtime/camera_access.ts',
    'esm/native/runtime/scene_view_access.ts',
  ]) {
    assert.equal(exists(rel), false, `expected deleted file: ${rel}`);
  }

  assert.match(roomLifecycle, /export function setRoomDesignActive\(/);
  assert.match(roomDesignSurface, /ensureRoomDesignService\(A\)/);
  assert.doesNotMatch(roomBundle, /A\.services\s*=\s*/);
  assert.doesNotMatch(roomBundle, /services\.roomDesign\s*=\s*/);
  assert.match(
    roomDesignSurface,
    /setActive:\s*\{[\s\S]*?stableKey:\s*'__wpRoomSetActive'[\s\S]*?setRoomDesignActive\(on, meta, context\.App\)/
  );
  assert.match(roomActiveState, /__readRoomDesignRuntimeFlags\(A\)/);
  assert.doesNotMatch(roomBundle, /deps\.builder\.modules/);
  assert.match(roomBundle, /assertThreeViaDeps\(/);
  assert.match(visuals, /assertThreeViaDeps\(/);
  assert.doesNotMatch(roomBundle, /assertTHREE\(/);
  assert.doesNotMatch(visuals, /assertTHREE\(/);

  assert.match(cornerWing, /from '\.\.\/runtime\/builder_service_access\.js'/);
  assert.match(cornerWing, /from '\.\/corner_wing_runtime\.js'/);
  assert.match(cornerWing, /from '\.\/corner_wing_context\.js'/);
  assert.match(cornerWing, /from '\.\/corner_wing_shadows\.js'/);
  assert.ok(
    /from '\.\/corner_wing_install\.js'/.test(cornerWing) ||
      /Install seam lives in \.\/corner_wing_install\.js and is wired by provide\.ts\./.test(cornerWing),
    'expected corner wing install seam to stay split into corner_wing_install.js'
  );
  assert.match(cornerWing, /requireBuilderRenderOps\(App,/);
  assert.match(cornerWing, /getBuilderAddOutlines\(App\)/);
  assert.match(cornerWing, /requireBuilderGetMaterial\(App,/);
  assert.match(cornerWing, /requireBuilderCreateDoorVisual\(\s*App,/);
  assert.match(cornerWing, /requireBuilderCreateInternalDrawerBox\(\s*App,/);
  assert.match(cornerWing, /requireBuilderAddRealisticHanger\(\s*App,/);
  assert.match(cornerWing, /requireBuilderAddHangingClothes\(\s*App,/);
  assert.match(cornerWing, /requireBuilderAddFoldedClothes\(\s*App,/);
  assert.match(cornerWing, /installStableSurfaceMethod\(modules,\s*'buildCornerWing'/);
  assert.match(cornerWing, /__wpBuilderBuildCornerWing/);
  assert.match(sceneRuntime, /from '\.\/scene_view_access\.js'/);
});
