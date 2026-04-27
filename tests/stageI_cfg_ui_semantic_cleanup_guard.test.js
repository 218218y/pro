import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const storeUiActionFiles = [
  '../esm/native/ui/react/actions/store_actions_ui.ts',
  '../esm/native/ui/react/actions/store_actions_ui_writes.ts',
  '../esm/native/ui/react/actions/store_actions_ui_project.ts',
  '../esm/native/ui/react/actions/store_actions_ui_structure.ts',
  '../esm/native/ui/react/actions/store_actions_ui_render.ts',
];

const storeConfigActionFiles = [
  '../esm/native/ui/react/actions/store_actions_config.ts',
  '../esm/native/ui/react/actions/store_actions_config_contracts.ts',
  '../esm/native/ui/react/actions/store_actions_config_project.ts',
  '../esm/native/ui/react/actions/store_actions_config_maps.ts',
  '../esm/native/ui/react/actions/store_actions_config_modes.ts',
];
const cfgAccessBundle = bundleSources(
  [
    '../esm/native/runtime/cfg_access.ts',
    '../esm/native/runtime/cfg_access_core.ts',
    '../esm/native/runtime/cfg_access_maps.ts',
    '../esm/native/runtime/cfg_access_scalars.ts',
  ],
  import.meta.url
);
const semanticCallsitesBundle = bundleSources(
  [
    '../esm/native/ui/react/actions/store_actions.ts',
    ...storeConfigActionFiles,
    ...storeUiActionFiles,
    '../esm/native/ui/react/tabs/RenderTab.view.tsx',
    '../esm/native/ui/react/tabs/use_render_tab_controller.ts',
    '../esm/native/ui/react/tabs/use_render_tab_room_design.ts',
    '../esm/native/ui/react/tabs/render_tab_room_design_controller_runtime.ts',
    '../esm/native/ui/react/tabs/use_render_tab_lighting.ts',
    '../esm/native/ui/react/tabs/render_tab_lighting_controller_runtime.ts',
    '../esm/native/ui/settings_backup.ts',
    '../esm/native/ui/multicolor_service.ts',
    '../esm/native/services/boot_seeds_part02.ts',
    '../esm/native/services/boot_seeds_part02_flags.ts',
    '../esm/native/kernel/maps_api.ts',
    '../esm/native/kernel/maps_api_shared.ts',
    '../esm/native/kernel/maps_api_named_maps.ts',
    '../esm/native/kernel/maps_api_saved_colors.ts',
    '../esm/native/services/canvas_picking_config_actions.ts',
  ],
  import.meta.url
);

const canvasOwnerBundle = bundleSources(
  [
    '../esm/native/services/canvas_picking_click_flow.ts',
    '../esm/native/services/canvas_picking_cell_dims_flow.ts',
    '../esm/native/services/canvas_picking_cell_dims_linear_apply.ts',
    '../esm/native/services/canvas_picking_paint_flow.ts',
    '../esm/native/services/canvas_picking_paint_flow_apply.ts',
    '../esm/native/services/canvas_picking_paint_flow_apply_commit.ts',
  ],
  import.meta.url
);

const canvasConfigBundle = bundleSources(
  [
    '../esm/native/services/canvas_picking_cell_dims_linear.ts',
    '../esm/native/services/canvas_picking_cell_dims_linear_apply.ts',
    '../esm/native/services/canvas_picking_paint_flow.ts',
    '../esm/native/services/canvas_picking_paint_flow_apply.ts',
    '../esm/native/services/canvas_picking_config_actions.ts',
  ],
  import.meta.url
);

test('[stageI] cfg_access exports semantic config writers for upgraded hot paths', () => {
  assertMatchesAll(
    assert,
    cfgAccessBundle,
    [
      /export function setCfgModulesConfiguration\(/,
      /export function setCfgCornerConfiguration\(/,
      /export function setCfgManualWidth\(/,
      /export function setCfgSavedColors\(/,
      /export function setCfgColorSwatchesOrder\(/,
      /export function setCfgIndividualColors\(/,
      /export function setCfgCurtainMap\(/,
      /export function setCfgDoorSpecialMap\(/,
    ],
    'cfgAccessBundle'
  );
});

test('[stageI] semantic UI/config callsites preserve lighting + hot config writer seams', () => {
  assertMatchesAll(
    assert,
    semanticCallsitesBundle,
    [
      /function setUiLastSelectedWallColor\(/,
      /function setUiLightScalar\(/,
      /function patchUiLightingState\(/,
      /(?:setCfgSavedColors\((?:App|app), nextSaved, meta\)|setCfgSavedColorsApi\(app, normalized, meta\))/,
      /(?:setCfgColorSwatchesOrder\((?:App|app), colorSwatchesOrder(?:\.slice\(\))?, meta\)|setCfgColorSwatchesOrderApi\(app, normalized, meta\))/,
      /setCfgMultiColorMode\((?:App|app), !!next, m\)/,
      /setCfgWardrobeType\((?:App|app), 'hinged', meta\)|room\.setWardrobeType\('hinged', meta\)|boot:defaultWardrobeType/,
      /setCfgManualWidth\((?:App|app), false, meta\)|room\.setManualWidth\(false, meta\)|boot:defaultManualWidth/,
      /setCfgModulesConfiguration\((?:App|app), snapshot\.modulesConfiguration, meta\)/,
      /(?:setCfgDoorSpecialMap\((?:App|app),\s*doorSpecialMap(?:\s*\|\|\s*\{\})?,\s*meta\)|setCfgDoorSpecialMapApi\(app, readStringMap\(value\), meta\))/,
      /setUiLastSelectedWallColor\((?:app|args\.app), value, (?:meta|args\.meta)\.uiOnlyImmediate\('react:renderTab:wallColor'\)\)/,
      /patchUiLightingState\((?:app|args\.app), patch, (?:meta|args\.meta)\.uiOnlyImmediate\('react:renderTab:(?:lightingControl|lightPreset)'\)\)/,
    ],
    'semanticCallsitesBundle'
  );

  // Smarter than owner-file text checks:
  // - owner flow must still delegate to focused helpers
  // - config-heavy writes may now live in focused sub-helpers beneath the owner
  assertMatchesAll(
    assert,
    canvasOwnerBundle,
    [
      /export function handleCanvasCellDimsClick\(/,
      /export \{ tryHandleCanvasPaintClick \} from '\.\/canvas_picking_paint_flow_apply\.js';/,
      /canvas_picking_cell_dims_linear\.js/,
      /canvas_picking_config_actions\.js/,
      /createCanvasPickingClickModuleRefs\(/,
      /routeCanvasPickingClick\(\{/,
      /applyPaintConfigSnapshot/,
    ],
    'canvasOwnerBundle'
  );

  assertMatchesAll(
    assert,
    canvasConfigBundle,
    [/canvas_picking_config_actions\.js/, /applyCellDimsConfigSnapshot/, /applyPaintConfigSnapshot/],
    'canvasConfigBundle'
  );

  assertLacksAll(
    assert,
    semanticCallsitesBundle,
    [
      /cfgSetScalar\((?:App|app), 'savedColors'/,
      /cfgSetScalar\((?:App|app), 'colorSwatchesOrder'/,
      /cfgSetScalar\((?:App|app), 'isMultiColorMode'/,
      /cfgSetScalar\((?:App|app), '(isMultiColorMode|wardrobeType|isManualWidth)'/,
      /cfgSetMap\((?:App|app), '(individualColors|curtainMap|doorSpecialMap)'/,
      /from ['"][^'"]*kernel\/config_write\.js['"]/,
      /setUiScalarSoftAction\(/,
    ],
    'semanticCallsitesBundle'
  );
});
