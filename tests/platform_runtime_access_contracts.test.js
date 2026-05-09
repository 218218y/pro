import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';
import { readServicesApiPublicSurface } from './_services_api_bundle.js';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function stripNoise(input) {
  return String(input || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, '``');
}

const api = readServicesApiPublicSurface(import.meta.url);
const platformAccessEntry = readSource('../esm/native/runtime/platform_access.ts', import.meta.url);
const platformAccessBundle = bundleSources(
  [
    '../esm/native/runtime/platform_access.ts',
    '../esm/native/runtime/platform_access_shared.ts',
    '../esm/native/runtime/platform_access_state.ts',
    '../esm/native/runtime/platform_access_ops.ts',
  ],
  import.meta.url
);
const notesAccess = bundleSources(
  [
    '../esm/native/runtime/notes_access.ts',
    '../esm/native/runtime/notes_access_shared.ts',
    '../esm/native/runtime/notes_access_services.ts',
    '../esm/native/runtime/notes_access_actions.ts',
  ],
  import.meta.url
);
const servicesRootAccess = readSource('../esm/native/runtime/services_root_access.ts', import.meta.url);
const commandsAccess = readSource('../esm/native/runtime/commands_access.ts', import.meta.url);
const storageAccess = readSource('../esm/native/runtime/storage_access.ts', import.meta.url);
const threeAccess = readSource('../esm/native/runtime/three_access.ts', import.meta.url);
const bootEntry = readSource('../esm/native/runtime/boot_entry_access.ts', import.meta.url);
const bootMain = readSource('../esm/native/platform/boot_main.ts', import.meta.url);
const bootFinalizers = read('esm/native/services/boot_finalizers.ts');

const smokeBundlePaths = [
  'esm/native/platform/smoke_checks.ts',
  'esm/native/platform/smoke_checks_core.ts',
  'esm/native/platform/smoke_checks_scenario.ts',
  'esm/native/platform/smoke_checks_shared.ts',
];

const touchedBundle = bundleSources(
  [
    '../esm/native/services/boot_finalizers.ts',
    '../esm/native/services/edit_state.ts',
    '../esm/native/services/edit_state_shared.ts',
    '../esm/native/services/edit_state_reset.ts',
    '../esm/native/services/edit_state_sync.ts',
    '../esm/native/services/edit_state_runtime.ts',
    '../esm/native/services/canvas_picking_core.ts',
    '../esm/native/services/canvas_picking_click_flow.ts',
    '../esm/native/services/canvas_picking_core_helpers.ts',
    '../esm/native/services/canvas_picking_core_shared.ts',
    '../esm/native/services/canvas_picking_core_support.ts',
    '../esm/native/services/canvas_picking_core_support_errors.ts',
    '../esm/native/services/canvas_picking_core_support_meta.ts',
    '../esm/native/services/canvas_picking_core_support_numbers.ts',
    '../esm/native/services/canvas_picking_core_support_records.ts',
    '../esm/native/services/canvas_picking_core_runtime.ts',
    '../esm/native/services/canvas_picking_core_raycast.ts',
    '../esm/native/services/canvas_picking_door_part_helpers.ts',
    '../esm/native/services/canvas_picking_split_hover_helpers.ts',
    '../esm/native/services/canvas_picking_split_hover_bounds.ts',
    '../esm/native/services/canvas_picking_split_hover_preview_line.ts',
    '../esm/native/services/canvas_picking_split_hover_roots.ts',
    '../esm/native/ui/feedback.ts',
    '../esm/native/ui/modes.ts',
    '../esm/native/ui/modes_transition_policy.ts',
    '../esm/native/ui/boot_main.ts',
    '../esm/native/io/project_io_orchestrator.ts',
    '../esm/native/ui/react/panels/ProjectPanel.tsx',
    '../esm/native/services/scene_view.ts',
    '../esm/native/builder/materials_factory.ts',
    '../esm/native/builder/materials_factory_shared.ts',
    '../esm/native/builder/render_ops_extras.ts',
    '../esm/native/builder/render_ops_extras_shared.ts',
    '../esm/native/builder/render_ops_extras_dimensions.ts',
    '../esm/native/builder/render_ops_extras_outlines.ts',
    '../esm/native/builder/visuals_and_contents.ts',
    '../esm/native/builder/visuals_and_contents_shared.ts',
    '../esm/native/builder/visuals_and_contents_door_visual.ts',
    '../esm/native/builder/handle_factory.ts',
    '../esm/native/builder/board_factory.ts',
    '../esm/native/builder/material_resolver.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const platformBundle = bundleSources(
  [
    '../esm/native/builder/room.ts',
    '../esm/native/builder/room_internal_shared.ts',
    '../esm/native/builder/room_floor_texture.ts',
    '../esm/native/builder/room_scene_primitives.ts',
    '../esm/native/platform/platform.ts',
    '../esm/native/ui/boot_main.ts',
    '../esm/native/services/edit_state.ts',
    '../esm/native/services/edit_state_shared.ts',
    '../esm/native/services/edit_state_reset.ts',
    '../esm/native/services/edit_state_sync.ts',
    '../esm/native/services/edit_state_runtime.ts',
    '../esm/native/services/canvas_picking_core.ts',
    '../esm/native/services/canvas_picking_core_helpers.ts',
    '../esm/native/services/canvas_picking_core_shared.ts',
    '../esm/native/services/canvas_picking_core_support.ts',
    '../esm/native/services/canvas_picking_core_support_errors.ts',
    '../esm/native/services/canvas_picking_core_support_meta.ts',
    '../esm/native/services/canvas_picking_core_support_numbers.ts',
    '../esm/native/services/canvas_picking_core_support_records.ts',
    '../esm/native/services/canvas_picking_core_runtime.ts',
    '../esm/native/services/canvas_picking_core_raycast.ts',
    '../esm/native/services/canvas_picking_door_part_helpers.ts',
    '../esm/native/services/canvas_picking_split_hover_helpers.ts',
    '../esm/native/services/canvas_picking_split_hover_bounds.ts',
    '../esm/native/services/canvas_picking_split_hover_preview_line.ts',
    '../esm/native/services/canvas_picking_split_hover_roots.ts',
    '../esm/native/services/canvas_picking_click_flow.ts',
    '../esm/native/services/canvas_picking_hover_flow.ts',
    '../esm/native/services/scene_view.ts',
    '../esm/native/services/build_reactions.ts',
    '../esm/native/services/autosave.ts',
    '../esm/native/services/autosave_shared.ts',
    '../esm/native/services/autosave_snapshot.ts',
    '../esm/native/services/autosave_runtime.ts',
    '../esm/native/services/autosave_schedule.ts',
    '../esm/native/services/boot_finalizers.ts',
    '../esm/native/ui/feedback.ts',
    '../esm/native/ui/modes.ts',
    '../esm/native/platform/dirty_flag.ts',
    '../esm/native/ui/react/hooks.tsx',
    '../esm/native/ui/react/actions/project_actions.ts',
    '../esm/native/ui/interactions/project_save_load.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const serviceRootHardeningBundle = bundleSources(
  [
    '../esm/native/services/history.ts',
    '../esm/native/services/cloud_sync_support.ts',
    '../esm/native/services/cloud_sync_support_shared.ts',
    '../esm/native/services/cloud_sync_support_feedback.ts',
    '../esm/native/services/cloud_sync_support_storage.ts',
    '../esm/native/services/cloud_sync_support_capture.ts',
    '../esm/native/services/doors_runtime.ts',
    '../esm/native/services/doors_runtime_shared.ts',
    '../esm/native/services/doors_runtime_visuals.ts',
    '../esm/native/services/doors_runtime_visuals_shared.ts',
    '../esm/native/services/doors_runtime_visuals_doors.ts',
    '../esm/native/services/doors_runtime_visuals_drawers.ts',
    '../esm/native/services/models_registry_storage.ts',
    '../esm/native/ui/notes_service.ts',
    '../esm/native/ui/modes_shared.ts',
    '../esm/native/ui/primary_mode.ts',
    '../esm/native/builder/materials_factory.ts',
    '../esm/native/builder/materials_factory_shared.ts',
    '../esm/native/platform/platform.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const platformConsumerBundle = bundleSources(
  [
    '../esm/native/builder/room.ts',
    '../esm/native/builder/room_internal_shared.ts',
    '../esm/native/builder/room_floor_texture.ts',
    '../esm/native/builder/room_scene_primitives.ts',
    '../esm/native/ui/boot_main.ts',
    '../esm/native/services/edit_state.ts',
    '../esm/native/services/edit_state_shared.ts',
    '../esm/native/services/edit_state_reset.ts',
    '../esm/native/services/edit_state_sync.ts',
    '../esm/native/services/edit_state_runtime.ts',
    '../esm/native/services/canvas_picking_core.ts',
    '../esm/native/services/canvas_picking_core_helpers.ts',
    '../esm/native/services/canvas_picking_core_shared.ts',
    '../esm/native/services/canvas_picking_core_support.ts',
    '../esm/native/services/canvas_picking_core_support_errors.ts',
    '../esm/native/services/canvas_picking_core_support_meta.ts',
    '../esm/native/services/canvas_picking_core_support_numbers.ts',
    '../esm/native/services/canvas_picking_core_support_records.ts',
    '../esm/native/services/canvas_picking_core_runtime.ts',
    '../esm/native/services/canvas_picking_core_raycast.ts',
    '../esm/native/services/canvas_picking_door_part_helpers.ts',
    '../esm/native/services/canvas_picking_split_hover_helpers.ts',
    '../esm/native/services/canvas_picking_split_hover_bounds.ts',
    '../esm/native/services/canvas_picking_split_hover_preview_line.ts',
    '../esm/native/services/canvas_picking_split_hover_roots.ts',
    '../esm/native/services/canvas_picking_click_flow.ts',
    '../esm/native/services/canvas_picking_hover_flow.ts',
    '../esm/native/services/scene_view.ts',
    '../esm/native/services/build_reactions.ts',
    '../esm/native/services/autosave.ts',
    '../esm/native/services/autosave_shared.ts',
    '../esm/native/services/autosave_snapshot.ts',
    '../esm/native/services/autosave_runtime.ts',
    '../esm/native/services/autosave_schedule.ts',
    '../esm/native/services/boot_finalizers.ts',
    '../esm/native/ui/feedback.ts',
    '../esm/native/ui/modes.ts',
    '../esm/native/platform/dirty_flag.ts',
    '../esm/native/ui/react/hooks.tsx',
    '../esm/native/ui/react/actions/project_actions.ts',
    '../esm/native/ui/interactions/project_save_load.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const threeTargets = {
  buildStateResolver: read('esm/native/builder/build_state_resolver.ts'),
  builderDepsResolver: read('esm/native/builder/builder_deps_resolver.ts'),
  moduleLayout: read('esm/native/builder/module_layout_pipeline.ts'),
  preBuildReset: read('esm/native/builder/pre_build_reset.ts'),
  externalDrawers: read('esm/native/builder/external_drawers_pipeline.ts'),
  interior: [
    read('esm/native/builder/interior_pipeline.ts'),
    read('esm/native/builder/interior_pipeline_shared.ts'),
    read('esm/native/builder/interior_pipeline_custom.ts'),
    read('esm/native/builder/interior_pipeline_preset.ts'),
  ].join('\n'),
  internalDrawers: read('esm/native/builder/internal_drawers_pipeline.ts'),
  buildWardrobeFlow: [
    read('esm/native/builder/build_wardrobe_flow.ts'),
    read('esm/native/builder/build_wardrobe_flow_runtime.ts'),
  ].join('\n'),
  stackSplitPipeline: [
    read('esm/native/builder/build_stack_split_pipeline.ts'),
    read('esm/native/builder/build_stack_split_shared.ts'),
    read('esm/native/builder/build_stack_split_contracts.ts'),
    read('esm/native/builder/build_stack_split_bottom_layout.ts'),
    read('esm/native/builder/build_stack_split_bottom_handles.ts'),
    read('esm/native/builder/build_stack_split_lower_setup.ts'),
    read('esm/native/builder/build_stack_split_shift.ts'),
    read('esm/native/builder/build_stack_split_context.ts'),
  ].join('\n'),
  core: read('esm/native/builder/core.ts'),
  bootstrap: [
    read('esm/native/builder/bootstrap.ts'),
    read('esm/native/builder/bootstrap_bindings.ts'),
    read('esm/native/builder/bootstrap_drawer_meta.ts'),
  ].join('\n'),
  renderScheduler: read('esm/native/platform/render_scheduler.ts'),
  lifecycleVisibility: read('esm/native/platform/lifecycle_visibility.ts'),
  handles: [
    read('esm/native/builder/handles.ts'),
    read('esm/native/builder/handles_apply.ts'),
    read('esm/native/builder/handles_apply_shared.ts'),
    read('esm/native/builder/handles_apply_doors.ts'),
    read('esm/native/builder/handles_apply_drawers.ts'),
  ].join('\n'),
  materialsApply: read('esm/native/builder/materials_apply.ts'),
  finalize: [
    read('esm/native/builder/post_build_finalize.ts'),
    read('esm/native/builder/post_build_finalize_runtime.ts'),
  ].join('\n'),
  kernel: [read('esm/native/kernel/kernel.ts'), read('esm/native/kernel/kernel_install_support.ts')].join(
    '\n'
  ),
  kernelSnapshotStore: [
    read('esm/native/kernel/kernel_snapshot_store_system.ts'),
    read('esm/native/kernel/kernel_snapshot_store_shared.ts'),
    read('esm/native/kernel/kernel_snapshot_store_build_state.ts'),
    read('esm/native/kernel/kernel_snapshot_store_commits.ts'),
    read('esm/native/kernel/kernel_snapshot_store_commits_shared.ts'),
    read('esm/native/kernel/kernel_snapshot_store_commits_ops.ts'),
  ].join('\n'),
  doorsRuntime: [
    read('esm/native/services/doors_runtime.ts'),
    read('esm/native/services/doors_runtime_shared.ts'),
    read('esm/native/services/doors_runtime_state.ts'),
    read('esm/native/services/doors_runtime_visuals.ts'),
    read('esm/native/services/doors_runtime_visuals_shared.ts'),
    read('esm/native/services/doors_runtime_visuals_doors.ts'),
    read('esm/native/services/doors_runtime_visuals_drawers.ts'),
  ].join('\n'),
  canvasPicking: [
    read('esm/native/services/canvas_picking_core.ts'),
    read('esm/native/services/canvas_picking_core_helpers.ts'),
    read('esm/native/services/canvas_picking_core_shared.ts'),
    read('esm/native/services/canvas_picking_core_support.ts'),
    read('esm/native/services/canvas_picking_core_support_errors.ts'),
    read('esm/native/services/canvas_picking_core_support_meta.ts'),
    read('esm/native/services/canvas_picking_core_support_numbers.ts'),
    read('esm/native/services/canvas_picking_core_support_records.ts'),
    read('esm/native/services/canvas_picking_core_runtime.ts'),
    read('esm/native/services/canvas_picking_core_raycast.ts'),
    read('esm/native/services/canvas_picking_click_flow.ts'),
    read('esm/native/services/canvas_picking_hover_flow.ts'),
    read('esm/native/services/canvas_picking_hover_flow_core.ts'),
  ].join('\n'),
  sceneView: [
    read('esm/native/services/scene_view.ts'),
    read('esm/native/services/scene_view_shared.ts'),
    read('esm/native/services/scene_view_shared_contracts.ts'),
    read('esm/native/services/scene_view_shared_runtime.ts'),
    read('esm/native/services/scene_view_shared_snapshot.ts'),
    read('esm/native/services/scene_view_lighting.ts'),
    read('esm/native/services/scene_view_lighting_shared.ts'),
    read('esm/native/services/scene_view_lighting_renderer.ts'),
    read('esm/native/services/scene_view_lighting_runtime.ts'),
    read('esm/native/services/scene_view_store_sync.ts'),
    read('esm/native/services/scene_view_store_sync_selectors.ts'),
    read('esm/native/services/scene_view_store_sync_runtime.ts'),
  ].join('\n'),
  uiBoot: [
    read('esm/native/ui/ui_boot_controller_runtime.ts'),
    read('esm/native/ui/ui_boot_controller_viewport.ts'),
    read('esm/native/ui/ui_boot_controller_store.ts'),
    read('esm/native/ui/ui_boot_controller_interactions.ts'),
  ].join('\n'),
  exportCanvas: [
    read('esm/native/ui/export_canvas.ts'),
    read('esm/native/ui/export/export_canvas_shared.ts'),
    read('esm/native/ui/export/export_canvas_core.ts'),
    read('esm/native/ui/export/export_canvas_scene.ts'),
    read('esm/native/ui/export/export_canvas_viewport.ts'),
    read('esm/native/ui/export/export_canvas_viewport_shared.ts'),
    read('esm/native/ui/export/export_canvas_delivery.ts'),
  ].join('\n'),
  smokeChecks: smokeBundlePaths.map(read).join('\n'),
};
const threeClean = Object.fromEntries(Object.entries(threeTargets).map(([k, v]) => [k, stripNoise(v)]));

test('[platform-runtime] service-root helper centralizes canonical service slot ownership', () => {
  assertMatchesAll(
    assert,
    servicesRootAccess,
    [
      /export function getServicesRootMaybe\(/,
      /export function ensureServicesRoot\(/,
      /export function getServiceSlotMaybe(?:<[^>]+>)?\(/,
      /export function ensureServiceSlot(?:<[^>]+>)?\(/,
    ],
    'servicesRootAccess'
  );

  assertMatchesAll(
    assert,
    `${storageAccess}\n${bootEntry}\n${notesAccess}`,
    [/from '\.\/services_root_access\.js';/],
    'runtimeAccessBundle'
  );
  assertLacksAll(
    assert,
    serviceRootHardeningBundle,
    [/ensureServicesRoot\(/, /getServicesRootMaybe\(/],
    'serviceRootHardeningBundle'
  );
});

test('[platform-runtime] canonical runtime access helpers stay centralized and re-exported', () => {
  assertMatchesAll(
    assert,
    `${platformAccessEntry}\n${platformAccessBundle}`,
    [
      /export function getPlatformReportError\(/,
      /export function triggerRenderViaPlatform\(/,
      /export function createCanvasViaPlatform\(/,
      /export function getPlatformComputePerfFlags\(/,
      /export function computePerfFlagsViaPlatform\(/,
      /export function getPlatformSetAnimate\(/,
      /export function installRenderAnimateViaPlatform\(/,
      /export function ensurePlatformHash32\(/,
      /export function cloneViaPlatform(?:<[^>]+>)?\(/,
      /export function cleanGroupViaPlatform\(/,
      /export function getPlatformPruneCachesSafe\(/,
    ],
    'platformAccess'
  );
  assertMatchesAll(
    assert,
    platformAccessEntry,
    [
      /export \* from '\.\/platform_access_shared\.js';/,
      /export \* from '\.\/platform_access_state\.js';/,
      /export \* from '\.\/platform_access_ops\.js';/,
    ],
    'platformAccessEntry'
  );
  assertMatchesAll(
    assert,
    notesAccess,
    [
      /export function getUiNotesServiceMaybe\(/,
      /export function isNotesScreenDrawMode\(/,
      /export function exitNotesDrawModeViaService\(/,
    ],
    'notesAccess'
  );
  assertLacksAll(
    assert,
    platformAccessBundle,
    [/ensureServicesRoot\(/, /getServicesRootMaybe\(/],
    'platformAccessRootBagProbing'
  );
  assertMatchesAll(assert, commandsAccess, [/export function getCommandsServiceMaybe\(/], 'commandsAccess');
  assertMatchesAll(
    assert,
    storageAccess,
    [/export function getStorageKey\(/, /export function getStorageString\(/],
    'storageAccess'
  );
  assertMatchesAll(
    assert,
    threeAccess,
    [/export function getThreeMaybe\(/, /export function assertThreeViaDeps\(/],
    'threeAccess'
  );
  assertMatchesAll(
    assert,
    api,
    [
      /reportErrorViaPlatform/,
      /triggerRenderViaPlatform/,
      /runPlatformRenderFollowThrough/,
      /runPlatformWakeupFollowThrough/,
      /createCanvasViaPlatform/,
      /computePerfFlagsViaPlatform/,
      /installRenderAnimateViaPlatform/,
      /getUiNotesServiceMaybe/,
      /exitNotesDrawModeViaService/,
      /ensureCommandsService/,
      /getStorageString/,
      /getThreeMaybe/,
      /assertThreeViaDeps/,
    ],
    'servicesApi'
  );
});

test('[platform-runtime] bundles route through canonical platform, notes, commands, storage, and THREE helpers', () => {
  assertMatchesAll(
    assert,
    touchedBundle,
    [
      /ensureCommandsService\(App\)/,
      /getCommandsServiceMaybe\(App\)/,
      /runPlatformRenderFollowThrough\((?:App|app),\s*\{[\s\S]*ensureRenderLoop:\s*false[\s\S]*\}\)/,
      /exitNotesDrawModeViaService\(App\)/,
      /isNotesScreenDrawMode\(App\)/,
      /reportErrorViaPlatform\(App,\s*(?:e|err|error),\s*(?:''|'ui\\.(?:togglePrimaryMode|enterPrimaryMode)'|'builder\.buildWardrobe')\)/,
      /readAutosaveInfoFromStorage\(app\)/,
      /ensurePlatformHash32\(App\)/,
      /createCanvasViaPlatform\(App, (?:128|width), (?:128|height)\)/,
      /ensurePlatformUtil\(App\)/,
      /getPlatformReportError\(App\)/,
    ],
    'touchedBundle'
  );
  assertLacksAll(
    assert,
    touchedBundle,
    [
      /App\.services\.commands/,
      /App\.services\.storage/,
      /App\.services\.notes/,
      /App\.notes/,
      /App\.platform\./,
    ],
    'touchedBundle'
  );

  assertMatchesAll(
    assert,
    platformBundle,
    [/runPlatformRenderFollowThrough\((?:App|app|root|A),/],
    'platformBundle'
  );
  assertLacksAll(assert, platformConsumerBundle, [/App\.services\.platform/], 'platformConsumerBundle');
});

test('[platform-runtime] app start and major callsites prefer canonical boot entry and platform/THREE seams', () => {
  assert.match(bootEntry, /export function getBootStartEntry\(App: unknown\): UnknownCallable \| null \{/);
  assert.match(bootEntry, /if \(appStart && typeof appStart\.start === 'function'\)/);
  assert.match(bootEntry, /return appStart\.start\.bind\(appStart\);/);
  assert.match(bootEntry, /if \(uiBoot && typeof uiBoot\.bootMain === 'function'\)/);
  assert.match(bootEntry, /return uiBoot\.bootMain\.bind\(uiBoot\);/);

  assert.match(
    threeTargets.buildStateResolver,
    /reportErrorViaPlatform\(App, err, 'builder\.buildWardrobe'\)/
  );
  assert.match(threeTargets.builderDepsResolver, /getPlatformPruneCachesSafe\(App\)/);
  assert.match(threeTargets.moduleLayout, /reportErrorViaPlatform\(App, err, \{ where, fatal: true \}\)/);
  assert.match(threeTargets.preBuildReset, /cleanGroupViaPlatform\(App, wardrobeGroup\)/);
  assert.match(threeTargets.preBuildReset, /reportErrorViaPlatform\(App, err, 'builder\.preBuildReset'\)/);
  assert.match(
    bootFinalizers,
    /export function wardrobeClean\(App: AppContainer, group: unknown\): unknown \{/
  );
  assert.match(bootFinalizers, /cleanGroupViaPlatform\(App, group\)/);
  assert.match(bootFinalizers, /return \(group: unknown\) => wardrobeClean\((?:App|context\.App), group\);/);
  assert.match(threeTargets.externalDrawers, /reportErrorViaPlatform\(App, error, meta\)/);
  assert.match(threeTargets.interior, /reportErrorViaPlatform\(App,/);
  assert.match(threeTargets.internalDrawers, /reportErrorViaPlatform\(App,/);
  assert.match(threeTargets.stackSplitPipeline, /cloneViaPlatform\(args\.App, lower0, seed\)/);
  assert.match(
    threeTargets.buildWardrobeFlow,
    /reportErrorViaPlatform\(App, error, \{ where: label, fatal: true \}\)/
  );
  assert.match(
    threeTargets.core,
    /reportErrorViaPlatform\(App, err, \{ where: 'native\/builder\/core\.buildWardrobe', fatal: true \}\)/
  );
  assert.match(threeTargets.bootstrap, /getPlatformTriggerRender\((?:App|context\.App)\)/);
  assert.match(threeTargets.bootstrap, /getPlatformCleanGroup\((?:App|context\.App)\)/);
  assert.match(threeTargets.bootstrap, /getPlatformPruneCachesSafe\((?:App|context\.App)\)/);
  assert.match(threeTargets.bootstrap, /runPlatformWakeupFollowThrough\(App\)/);
  assert.match(threeTargets.renderScheduler, /runPlatformWakeupFollowThrough\(A, \{/);
  assert.match(threeTargets.lifecycleVisibility, /runPlatformWakeupFollowThrough\(root, \{/);
  assert.match(threeTargets.handles, /runPlatformRenderFollowThrough\(App, \{ updateShadows: false \}\)/);
  assert.match(
    threeTargets.materialsApply,
    /refreshBuilderHandles\(App, \{ triggerRender: true, updateShadows: false \}\)/
  );
  assert.match(threeTargets.finalize, /runBuilderPostBuildFollowThrough\((?:App|resolved\.App), \{/);
  assert.match(threeTargets.kernel, /createKernelInstallSupport\(App\)/);
  assert.match(
    threeTargets.kernel,
    /const cloneKernelValue = \(value: unknown, defaultValue\?: unknown\): unknown => \{/
  );
  assert.match(threeTargets.kernel, /const snapshotStore = createKernelSnapshotStoreSystem\(\{/);
  assert.match(
    threeTargets.kernel,
    /const reportKernelError = \(error: unknown, ctx: unknown\): boolean => \{/
  );
  assert.match(threeTargets.kernel, /reportErrorViaPlatform\(App, error, ctx\)/);
  assert.match(
    threeTargets.kernelSnapshotStore,
    /args\.reportKernelError\(err, 'kernel\.getBuildState\.override'\)/
  );
  assert.match(threeTargets.kernelSnapshotStore, /args\.reportKernelError\(err, 'kernel\.getBuildState'\)/);
  assert.match(threeTargets.doorsRuntime, /runPlatformActivityRenderTouch\(App, \{/);
  assert.match(threeTargets.canvasPicking, /getThreeMaybe\(App\)/);
  assert.match(threeTargets.sceneView, /getThreeMaybe\(App\)/);
  assert.match(threeTargets.sceneView, /runPlatformActivityRenderTouch\(App, \{/);
  assert.match(
    threeTargets.canvasPicking,
    /runPlatformRenderFollowThrough\(App, \{ updateShadows, ensureRenderLoop: false \}\)/
  );
  assert.match(threeTargets.uiBoot, /assertThreeViaDeps\(App,/);
  assert.match(threeTargets.exportCanvas, /getThreeMaybe\(App\)/);
  assert.match(threeTargets.smokeChecks, /getThreeMaybe\(App\)/);

  for (const [label, src] of Object.entries(threeClean)) {
    assert.doesNotMatch(src, /App\.platform\./, `${label} should not probe App.platform directly`);
    assert.doesNotMatch(src, /deps\?\.THREE/, `${label} should not probe deps?.THREE`);
  }
});
