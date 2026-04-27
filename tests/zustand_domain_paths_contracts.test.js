import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

const clickFlow = read('esm/native/services/canvas_picking_click_flow.ts');
const clickModuleRefs = read('esm/native/services/canvas_picking_click_module_refs.ts');
const cellDimsFlow = read('esm/native/services/canvas_picking_cell_dims_flow.ts');
const cellDimsLinear = read('esm/native/services/canvas_picking_cell_dims_linear.ts');
const cellDimsLinearApply = read('esm/native/services/canvas_picking_cell_dims_linear_apply.ts');
const cellDimsCorner = read('esm/native/services/canvas_picking_cell_dims_corner.ts');
const cellDimsCornerCell = read('esm/native/services/canvas_picking_cell_dims_corner_cell.ts');
const cellDimsCornerGlobal = read('esm/native/services/canvas_picking_cell_dims_corner_global.ts');
const cellDimsCornerShared = read('esm/native/services/canvas_picking_cell_dims_corner_shared.ts');
const cellDimsCornerContext = read('esm/native/services/canvas_picking_cell_dims_corner_context.ts');
const cellDimsCornerEffects = read('esm/native/services/canvas_picking_cell_dims_corner_effects.ts');
const cellDimsCornerGlobalState = read('esm/native/services/canvas_picking_cell_dims_corner_global_state.ts');
const cellDimsCornerGlobalApply = read('esm/native/services/canvas_picking_cell_dims_corner_global_apply.ts');
const canvasPicking = [
  clickFlow,
  clickModuleRefs,
  cellDimsFlow,
  cellDimsLinear,
  cellDimsLinearApply,
  cellDimsCorner,
  cellDimsCornerCell,
  cellDimsCornerGlobal,
  cellDimsCornerShared,
  cellDimsCornerContext,
  cellDimsCornerEffects,
  cellDimsCornerGlobalState,
  cellDimsCornerGlobalApply,
].join('\n');
const mapsApi = bundleSources(
  [
    '../esm/native/kernel/maps_api.ts',
    '../esm/native/kernel/maps_api_shared.ts',
    '../esm/native/kernel/maps_api_named_maps.ts',
    '../esm/native/kernel/maps_api_saved_colors.ts',
  ],
  import.meta.url
);
const domainApi = read('esm/native/kernel/domain_api.ts');
const domainApiColors = read('esm/native/kernel/domain_api_colors_section.ts');
const domainModulesCorner = bundleSources(
  [
    '../esm/native/kernel/domain_api_modules_corner.ts',
    '../esm/native/kernel/domain_api_modules_corner_selectors.ts',
    '../esm/native/kernel/domain_api_modules_corner_module_patch.ts',
    '../esm/native/kernel/domain_api_modules_corner_corner_patch.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_shared.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_no_main.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_template.ts',
    '../esm/native/kernel/domain_api_modules_corner_shared.ts',
  ],
  import.meta.url
);
const sceneViewSrc = bundleSources(
  [
    '../esm/native/services/scene_view.ts',
    '../esm/native/services/scene_view_store_sync.ts',
    '../esm/native/services/scene_view_store_sync_runtime.ts',
  ],
  import.meta.url
);

const serviceCfgBundle = bundleSources(
  [
    '../esm/native/services/boot_seeds_part02.ts',
    '../esm/native/services/boot_seeds_part02_flags.ts',
    '../esm/native/services/config_compounds.ts',
    '../esm/native/ui/settings_backup.ts',
    '../esm/native/ui/settings_backup_import_support.ts',
    '../esm/native/ui/multicolor_service.ts',
    '../esm/native/kernel/maps_api.ts',
    '../esm/native/kernel/maps_api_shared.ts',
    '../esm/native/kernel/maps_api_named_maps.ts',
    '../esm/native/kernel/maps_api_saved_colors.ts',
    '../esm/native/ui/react/actions/store_actions_config_modes.ts',
    '../esm/native/ui/react/tabs/design_tab_color_command_flows_saved.ts',
    '../esm/native/services/canvas_picking_config_actions.ts',
  ],
  import.meta.url
);
const projectBundle = bundleSources(
  [
    '../esm/native/io/project_io.ts',
    '../esm/native/io/project_io_orchestrator.ts',
    '../esm/native/io/project_io_load_helpers.ts',
    '../esm/native/io/project_io_save_helpers.ts',
    '../esm/native/ui/interactions/project_save_load.ts',
    '../esm/native/ui/interactions/project_save_load_controller_runtime.ts',
    '../esm/native/ui/interactions/project_save_load_controller_save.ts',
    '../esm/native/ui/interactions/project_save_load_controller_load.ts',
    '../esm/native/ui/project_load_runtime.ts',
    '../esm/native/ui/project_load_runtime_action.ts',
    '../esm/native/ui/project_save_runtime.ts',
    '../esm/native/ui/project_save_runtime_contracts.ts',
    '../esm/native/ui/project_save_runtime_prompt.ts',
    '../esm/native/ui/project_save_runtime_results.ts',
    '../esm/native/ui/project_save_runtime_action.ts',
    '../esm/native/ui/react/actions/project_actions.ts',
    '../esm/native/platform/dirty_flag.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const runtimeBundle = bundleSources(
  [
    '../esm/native/ui/boot_main.ts',
    '../esm/native/runtime/store_boot_access.ts',
    '../esm/native/runtime/store_reactivity_access.ts',
    '../esm/native/runtime/history_system_access.ts',
    '../esm/native/runtime/history_system_access_actions.ts',
    '../esm/native/runtime/history_system_access_services.ts',
    '../esm/native/runtime/history_system_access_system.ts',
    '../esm/native/runtime/history_system_access_actions.ts',
    '../esm/native/runtime/history_system_access_services.ts',
    '../esm/native/runtime/history_system_access_system.ts',
    '../esm/native/kernel/domain_api.ts',
    '../esm/native/kernel/domain_api_shared.ts',
    '../esm/native/kernel/domain_api_install_helpers.ts',
    '../esm/native/kernel/domain_api_surface_sections.ts',
    '../esm/native/kernel/domain_api_surface_sections_shared.ts',
    '../esm/native/kernel/domain_api_surface_sections_state.ts',
    '../esm/native/kernel/domain_api_surface_sections_bindings.ts',
    '../esm/native/kernel/domain_api_modules_corner.ts',
    '../esm/native/kernel/domain_api_modules_corner_selectors.ts',
    '../esm/native/kernel/domain_api_modules_corner_module_patch.ts',
    '../esm/native/kernel/domain_api_modules_corner_corner_patch.ts',
    '../esm/native/kernel/domain_api_room_section.ts',
    '../esm/native/kernel/domain_api_room_section_shared.ts',
    '../esm/native/kernel/domain_api_room_section_wardrobe.ts',
    '../esm/native/kernel/domain_api_room_section_manual_width.ts',
  ],
  import.meta.url
);
const historyBundle = bundleSources(
  [
    '../esm/native/runtime/history_system_access.ts',
    '../esm/native/runtime/history_system_access_actions.ts',
    '../esm/native/runtime/history_system_access_services.ts',
    '../esm/native/runtime/history_system_access_system.ts',
    '../esm/native/runtime/history_system_access_actions.ts',
    '../esm/native/runtime/history_system_access_services.ts',
    '../esm/native/runtime/history_system_access_system.ts',
    '../esm/native/services/canvas_picking_core_helpers.ts',
    '../esm/native/services/canvas_picking_core_shared.ts',
    '../esm/native/services/canvas_picking_core_support.ts',
    '../esm/native/services/canvas_picking_core_support_errors.ts',
    '../esm/native/services/canvas_picking_core_support_meta.ts',
    '../esm/native/services/canvas_picking_core_support_numbers.ts',
    '../esm/native/services/canvas_picking_core_support_records.ts',
    '../esm/native/services/canvas_picking_core_runtime.ts',
    '../esm/native/services/canvas_picking_core_raycast.ts',
    '../esm/native/services/canvas_picking_cell_dims_linear.ts',
    '../esm/native/services/canvas_picking_cell_dims_linear_apply.ts',
    '../esm/native/services/canvas_picking_cell_dims_corner.ts',
    '../esm/native/services/canvas_picking_cell_dims_corner_cell.ts',
    '../esm/native/services/canvas_picking_cell_dims_corner_global.ts',
    '../esm/native/services/canvas_picking_cell_dims_corner_global_state.ts',
    '../esm/native/services/canvas_picking_cell_dims_corner_global_apply.ts',
    '../esm/native/services/canvas_picking_cell_dims_corner_shared.ts',
    '../esm/native/services/canvas_picking_cell_dims_corner_context.ts',
    '../esm/native/services/canvas_picking_cell_dims_corner_effects.ts',
  ],
  import.meta.url
);

test('[zustand-domain] module/corner stack and config paths stay on canonical actions/config seams', () => {
  assert.match(clickFlow, /canvas_picking_click_module_refs\.js/);
  assert.match(clickModuleRefs, /const __patchConfigForKey = \(/);
  assert.match(
    clickModuleRefs,
    /const __ensureCornerCellConfigRef = \(cellIdx: number\): ModuleConfigLike \| null => \{/
  );
  assert.match(clickModuleRefs, /typeof mods\.ensureCornerCellAt === 'function'/);
  assert.match(clickModuleRefs, /mods\.ensureCornerCellAt\(cellIdx\)/);
  assert.match(clickModuleRefs, /typeof mods\.ensureForStack === 'function'/);
  assert.match(clickModuleRefs, /mods\.ensureForStack\('top', `corner:\$\{cellIdx\}`\)/);
  assert.match(clickModuleRefs, /mods\.patchForStack\(__activeStack, mk, patchFn, meta\)/);
  assert.doesNotMatch(canvasPicking, /if \(App\.stateKernel\) \{\s*__patchConfigForKey\(/);
  assert.doesNotMatch(canvasPicking, /App\?\.stateKernel\?\.ensureCornerCellConfig/);
  assert.doesNotMatch(canvasPicking, /sk\.ensureModuleConfigForStack\(__activeStack, mk\)/);
  assert.doesNotMatch(canvasPicking, /sk\.patchModuleConfigForStack\(__activeStack, mk, patchFn, meta\)/);

  assert.match(domainModulesCorner, /const __tryCanonicalStackPatch = \(/);
  assert.match(
    domainModulesCorner,
    /modulesActions\.patchAt[\s\S]*__tryCanonicalStackPatch\('top', i, patch, m\)/
  );
  assert.match(
    domainModulesCorner,
    /modulesActions\.patchLowerAt[\s\S]*__tryCanonicalStackPatch\('bottom', i, patch, m\)/
  );
  assert.match(
    domainModulesCorner,
    /actions\.modules\.patchForStack is required before stack patch delegation/
  );
});

test('[zustand-domain] history, config scalar, and applyPaint flows stay centralized', () => {
  assert.match(cellDimsLinear, /buildCanvasLinearCellDimsContext/);
  assert.match(cellDimsLinearApply, /__wp_commitHistoryTouch\(App, 'cellDims\.apply'\);/);
  assert.match(cellDimsCorner, /handleCornerPerCellDimsClick\(ctx\)/);
  assert.match(cellDimsCorner, /handleCornerGlobalDimsClick\(ctx\)/);
  assert.match(cellDimsCornerCell, /handleCornerCellHeightDepthOnly\(ctx\)/);
  assert.match(cellDimsCornerCell, /handleCornerCellWidthAndDims\(ctx\)/);
  assert.match(cellDimsCornerGlobal, /resolveCornerGlobalDimsTargetState\(ctx\)/);
  assert.match(cellDimsCornerGlobalApply, /commitCornerHistory\('cellDims\.apply\.corner', App\);/);
  assertMatchesAll(
    assert,
    historyBundle,
    [/pushHistoryStateMaybe\(/, /flushHistoryPendingPushMaybe\(/, /__wp_commitHistoryTouch\(/],
    'historyBundle'
  );

  assertMatchesAll(
    assert,
    serviceCfgBundle,
    [
      /setCfgSavedColors\((?:App|app), nextSaved, meta\)|setCfgSavedColorsApi\(app, normalized, meta\)/,
      /setCfgColorSwatchesOrder\((?:App|app), colorSwatchesOrder(?:\.slice\(\))?, meta\)|setCfgColorSwatchesOrderApi\(app, normalized, meta\)/,
      /setCfgMultiColorMode\((?:App|app), !!next, m\)/,
      /setCfgWardrobeType\(App, 'hinged', meta\)/,
      /setCfgManualWidth\(App, false, meta\)/,
      /setCfgModulesConfiguration\(App, snapshot\.modulesConfiguration, meta\)/,
      /setCfgDoorSpecialMap\(App,\s*doorSpecialMap(?:\s*\|\|\s*\{\})?,\s*meta\)/,
      /from ['"]\.\.\/runtime\/cfg_access\.js['"]/,
    ],
    'serviceCfgBundle'
  );
  assertLacksAll(
    assert,
    serviceCfgBundle,
    [
      /cfgSetScalar\(App, 'savedColors'/,
      /cfgSetScalar\(App, 'colorSwatchesOrder'/,
      /cfgSetScalar\(App, 'isMultiColorMode'/,
      /cfgSetMap\(App, '(individualColors|curtainMap|doorSpecialMap)'/,
      /from ['"][^'"]*kernel\/config_write\.js['"]/,
    ],
    'serviceCfgBundle'
  );

  assert.match(domainApi, /installDomainApiColorsSection\(\{/);
  assert.match(domainApiColors, /colorsActions\.applyPaint[\s\S]*configActions\.applyPaintSnapshot/);
  assert.doesNotMatch(domainApiColors, /colorsActions\.applyPaint[\s\S]{0,260}stateKernel\.patchConfigMaps/);
  assert.doesNotMatch(domainApiColors, /colorsActions\.applyPaint[\s\S]{0,260}cfgPatchWithReplaceKeys\(/);
  assert.doesNotMatch(domainApiColors, /colorsActions\.applyPaint[\s\S]{0,260}applyConfigPatch\(App,/);

  assert.match(mapsApi, /patchConfigMap/);
  assert.match(mapsApi, /setCfgSavedColors/);
  assert.match(mapsApi, /setCfgColorSwatchesOrder/);
  assert.doesNotMatch(mapsApi, /applyConfigPatch/);
  assert.doesNotMatch(mapsApi, /from '\.\/config_write\.js'/);
});

test('[zustand-domain] project/runtime flows avoid raw kernel fallbacks and use canonical snapshot helpers', () => {
  assertMatchesAll(
    assert,
    projectBundle,
    [
      /setDirtyViaActions\(App, false, (?:meta|__dirtyMeta)\)/,
      /saveProjectResultViaActions\((?:App|app)\)|saveProjectViaActions\((?:App|app)\)/,
    ],
    'projectBundle'
  );
  assertLacksAll(
    assert,
    projectBundle,
    [
      /stateKernel\.setDirty\(false, meta\)/,
      /actions\.setCfgScalar\('dirty', false, meta\)/,
      /App\.stateKernel[\s\S]{0,140}captureConfig\(/,
    ],
    'projectBundle'
  );

  assertMatchesAll(
    assert,
    runtimeBundle,
    [
      /const captureConfigSnapshot = \(\): UnknownRecord => \{/,
      /typeof configActions\.captureSnapshot === 'function'/,
      /const snap = configActions\.captureSnapshot\(\);/,
      /return asDomainObject\(snap\) \|\| \{\};/,
      /(?:const cfgSnap0 = captureConfigSnapshot\(\);|const cfgSnap0 = _captureConfigSnapshot\(\);)/,
      /export function installStoreReactivityOrThrow\(/,
      /export function canCommitBootSeedUiSnapshot\(/,
      /export function commitBootSeedUiSnapshotOrThrow\(/,
      /actions\.store\.hasReactivityInstalled surface only/,
      /actionsHistoryNs/,
      /servicesHistoryNs/,
    ],
    'runtimeBundle'
  );
  assertLacksAll(
    assert,
    runtimeBundle,
    [/commitFromSnapshot/, /_didInstallStoreReactivity/],
    'runtimeBundle'
  );

  assert.match(sceneViewSrc, /getStoreSelectorSubscriber\(App\)|installSceneViewStoreSync\(App\)/);
  assert.match(
    sceneViewSrc,
    /throw new Error\('\[WardrobePro\]\[sceneView\] Missing store\.subscribeSelector'\)/
  );
  assert.doesNotMatch(sceneViewSrc, /const subscribeAny = subscribeState \|\| subscribeMeta/);
});
