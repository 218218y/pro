import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const owner = read('esm/native/services/canvas_picking_core.ts');
const localHelpers = read('esm/native/services/canvas_picking_local_helpers.ts');
const localHelpersHover = read('esm/native/services/canvas_picking_local_helpers_hover.ts');
const hoverFlow = read('esm/native/services/canvas_picking_hover_flow.ts');
const hoverFlowCore = read('esm/native/services/canvas_picking_hover_flow_core.ts');
const hoverFlowShared = read('esm/native/services/canvas_picking_hover_flow_shared.ts');
const hoverFlowNonSplit = read('esm/native/services/canvas_picking_hover_flow_nonsplit.ts');
const hoverFlowNonSplitContracts = read(
  'esm/native/services/canvas_picking_hover_flow_nonsplit_contracts.ts'
);
const hoverFlowNonSplitFace = read('esm/native/services/canvas_picking_hover_flow_nonsplit_face.ts');
const hoverFlowNonSplitPreview = read('esm/native/services/canvas_picking_hover_flow_nonsplit_preview.ts');
const hoverFlowNonSplitPreviewDoor = read(
  'esm/native/services/canvas_picking_hover_flow_nonsplit_preview_door.ts'
);
const hoverFlowNonSplitPreviewPaint = read(
  'esm/native/services/canvas_picking_hover_flow_nonsplit_preview_paint.ts'
);
const hoverFlowNonSplitPreviewInterior = read(
  'esm/native/services/canvas_picking_hover_flow_nonsplit_preview_interior.ts'
);
const hoverFlowNonSplitSketch = read('esm/native/services/canvas_picking_hover_flow_nonsplit_sketch.ts');
const hoverFlowSplit = read('esm/native/services/canvas_picking_hover_flow_split.ts');
const hoverTargets = read('esm/native/services/canvas_picking_hover_targets.ts');
const hoverTargetsShared = read('esm/native/services/canvas_picking_hover_targets_shared.ts');
const hoverTargetsInterior = read('esm/native/services/canvas_picking_hover_targets_interior.ts');
const hoverTargetsInteriorScan = read('esm/native/services/canvas_picking_hover_targets_interior_scan.ts');
const hoverTargetsInteriorTarget = read(
  'esm/native/services/canvas_picking_hover_targets_interior_target.ts'
);
const interiorHoverContracts = read('esm/native/services/canvas_picking_interior_hover_contracts.ts');
const interiorHoverPreview = read('esm/native/services/canvas_picking_interior_hover_preview.ts');
const interiorHoverState = read('esm/native/services/canvas_picking_interior_hover_state.ts');
const interiorHoverConfig = read('esm/native/services/canvas_picking_interior_hover_config.ts');
const hoverTargetsDrawer = read('esm/native/services/canvas_picking_hover_targets_drawer.ts');
const hoverTargetsConfig = read('esm/native/services/canvas_picking_hover_targets_config.ts');
const hoverModes = read('esm/native/services/canvas_picking_hover_preview_modes.ts');
const hoverModesShared = read('esm/native/services/canvas_picking_hover_preview_modes_shared.ts');
const hoverModesExtDrawers = read('esm/native/services/canvas_picking_hover_preview_modes_ext_drawers.ts');
const hoverModesDivider = read('esm/native/services/canvas_picking_hover_preview_modes_divider.ts');
const hoverModesCellDims = read('esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts');
const hoverModesCellDimsInputs = read(
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_inputs.ts'
);
const hoverModesCellDimsState = read(
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_state.ts'
);
const hoverModesCellDimsTarget = read(
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_target.ts'
);
const doorHoverModes = read('esm/native/services/canvas_picking_door_hover_modes.ts');
const doorHoverTargets = read('esm/native/services/canvas_picking_door_hover_targets.ts');
const doorHoverTargetsShared = read('esm/native/services/canvas_picking_door_hover_targets_shared.ts');
const doorHoverTargetsContracts = read('esm/native/services/canvas_picking_door_hover_targets_contracts.ts');
const doorHoverTargetsRuntime = read('esm/native/services/canvas_picking_door_hover_targets_runtime.ts');
const doorHoverTargetsPolicy = read('esm/native/services/canvas_picking_door_hover_targets_policy.ts');
const doorHoverTargetsHit = read('esm/native/services/canvas_picking_door_hover_targets_hit.ts');
const doorHoverTargetsFace = read('esm/native/services/canvas_picking_door_hover_targets_preferred_face.ts');
const doorActionHover = read('esm/native/services/canvas_picking_door_action_hover_flow.ts');
const doorActionHoverState = read('esm/native/services/canvas_picking_door_action_hover_state.ts');
const doorActionHoverMarker = read('esm/native/services/canvas_picking_door_action_hover_marker.ts');
const doorActionHoverRemove = read('esm/native/services/canvas_picking_door_action_hover_remove.ts');
const doorSplitHover = read('esm/native/services/canvas_picking_door_split_hover_flow.ts');
const interiorHover = read('esm/native/services/canvas_picking_interior_hover_flow.ts');
const interiorHoverShared = read('esm/native/services/canvas_picking_interior_hover_shared.ts');
const interiorHoverIntDrawer = read('esm/native/services/canvas_picking_interior_hover_int_drawer.ts');
const interiorHoverLayoutFamily = read('esm/native/services/canvas_picking_interior_hover_layout_family.ts');
const interiorHoverLayoutMode = read('esm/native/services/canvas_picking_interior_hover_layout_mode.ts');
const interiorHoverManualMode = read('esm/native/services/canvas_picking_interior_hover_manual_mode.ts');
const interiorHoverBraceMode = read('esm/native/services/canvas_picking_interior_hover_brace_mode.ts');
const interiorHoverLayoutShared = read(
  'esm/native/services/canvas_picking_interior_hover_layout_family_shared.ts'
);
const manualSketchHover = read('esm/native/services/canvas_picking_manual_layout_sketch_hover_tools.ts');
const manualSketchHoverShared = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_shared.ts'
);
const manualSketchHoverSelector = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_selector.ts'
);
const manualSketchHoverRouter = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_router.ts'
);
const manualSketchHoverFree = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_free_flow.ts'
);
const manualSketchHoverModule = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_flow.ts'
);
const manualSketchHoverModuleContext = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context.ts'
);
const manualSketchHoverModuleDivider = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_divider_flow.ts'
);
const manualSketchHoverModulePreview = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_flow.ts'
);
const manualSketchHoverModulePreviewShared = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_shared.ts'
);
const manualSketchHoverModulePreviewBox = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_box.ts'
);
const manualSketchHoverModulePreviewStack = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_stack.ts'
);
const manualSketchHoverModulePreviewSurface = read(
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_module_preview_surface.ts'
);
const audit = read('docs/layering_completion_audit.md');

test('canvas picking hover owners stay thin and delegate preview/target/interior helpers to focused modules', () => {
  assert.match(owner, /from '\.\/canvas_picking_hover_flow\.js';/);

  assert.match(
    hoverFlow,
    /import \{ handleCanvasHoverNDCImpl \} from '\.\/canvas_picking_hover_flow_core\.js';/
  );
  assert.match(
    hoverFlow,
    /export function __coreHandleCanvasHoverNDC\(App: AppContainer, ndcX: number, ndcY: number\): boolean/
  );

  assert.match(
    hoverFlowCore,
    /import \{ tryHandleCanvasNonSplitHover \} from '\.\/canvas_picking_hover_flow_nonsplit\.js';/
  );
  assert.match(
    hoverFlowCore,
    /import \{ tryHandleCanvasSplitHover \} from '\.\/canvas_picking_hover_flow_split\.js';/
  );
  assert.match(
    hoverFlowCore,
    /import \{[\s\S]*asHoverRenderOps,[\s\S]*asPreviewCallback,[\s\S]*createPreviewOpsArgs,[\s\S]*readSplitVariant,[\s\S]*\} from '\.\/canvas_picking_hover_flow_shared\.js';/
  );
  assert.match(
    hoverFlowCore,
    /const __isSplitEditMode = __pm === \(getModeId\(App, 'SPLIT'\) \|\| 'split'\);/
  );
  assert.match(
    hoverFlowCore,
    /const __isDividerEditMode = __pm === \(getModeId\(App, 'DIVIDER'\) \|\| 'divider'\);/
  );
  assert.match(
    hoverFlowCore,
    /const __isCellDimsMode = __pm === \(getModeId\(App, 'CELL_DIMS'\) \|\| 'cell_dims'\);/
  );
  assert.match(hoverFlowCore, /return tryHandleCanvasNonSplitHover\(\{/);
  assert.match(hoverFlowCore, /return tryHandleCanvasSplitHover\(\{/);

  assert.match(hoverFlowShared, /export type HoverRenderOpsLike = \{/);
  assert.match(hoverFlowShared, /export function createPreviewOpsArgs\(/);
  assert.match(hoverFlowShared, /export function readSplitVariant\(App: AppContainer\): string/);
  assert.match(hoverFlowShared, /export function normalizeDoorBaseKeyFromGroup\(/);

  assert.match(hoverFlowNonSplit, /canvas_picking_hover_flow_nonsplit_face\.js/);
  assert.match(hoverFlowNonSplit, /canvas_picking_hover_flow_nonsplit_preview\.js/);
  assert.match(hoverFlowNonSplit, /canvas_picking_hover_flow_nonsplit_sketch\.js/);
  assert.match(hoverFlowNonSplit, /resolveNonSplitPreferredFacePreviewState\(args\)/);
  assert.match(
    hoverFlowNonSplit,
    /tryHandleCanvasNonSplitPreviewRoutes\(\{ hoverArgs: args, facePreviewState \}\)/
  );
  assert.match(hoverFlowNonSplit, /tryHandleCanvasNonSplitSketchHover\(args\)/);
  assert.match(hoverFlowNonSplitContracts, /export type HandleCanvasNonSplitHoverArgs = \{/);
  assert.match(hoverFlowNonSplitContracts, /export type NonSplitPreviewRouteArgs = \{/);
  assert.match(hoverFlowNonSplitFace, /export function resolveNonSplitPreferredFacePreviewState\(/);
  assert.match(hoverFlowNonSplitFace, /const facePreviewHitState = resolveCanvasPickingClickHitState\(\{/);
  assert.match(hoverFlowNonSplitPreview, /canvas_picking_hover_flow_nonsplit_preview_door\.js/);
  assert.match(hoverFlowNonSplitPreview, /canvas_picking_hover_flow_nonsplit_preview_paint\.js/);
  assert.match(hoverFlowNonSplitPreview, /canvas_picking_hover_flow_nonsplit_preview_interior\.js/);
  assert.match(hoverFlowNonSplitPreview, /tryHandleCanvasNonSplitDoorPreviewRoute\(args\)/);
  assert.match(hoverFlowNonSplitPreview, /tryHandleCanvasNonSplitPaintPreviewRoute\(args\.hoverArgs\)/);
  assert.match(hoverFlowNonSplitPreview, /tryHandleCanvasNonSplitInteriorPreviewRoutes\(args\.hoverArgs\)/);
  assert.match(
    hoverFlowNonSplitPreviewDoor,
    /import \{ tryHandleDoorActionHover \} from '\.\/canvas_picking_door_hover_modes\.js';/
  );
  assert.match(hoverFlowNonSplitPreviewDoor, /tryHandleDoorActionHover\(\{/);
  assert.match(
    hoverFlowNonSplitPreviewPaint,
    /import \{ tryHandleGenericPartPaintHover \} from '\.\/canvas_picking_generic_paint_hover\.js';/
  );
  assert.match(hoverFlowNonSplitPreviewPaint, /tryHandleGenericPartPaintHover\(\{/);
  assert.match(
    hoverFlowNonSplitPreviewInterior,
    /import \{[\s\S]*tryHandleCellDimsHoverPreview,[\s\S]*tryHandleDrawerDividerHoverPreview,[\s\S]*tryHandleExtDrawersHoverPreview,[\s\S]*\} from '\.\/canvas_picking_hover_preview_modes\.js';/
  );
  assert.match(
    hoverFlowNonSplitPreviewInterior,
    /import \{[\s\S]*tryHandleCanvasIntDrawerHover,[\s\S]*tryHandleCanvasLayoutFamilyHover,[\s\S]*\} from '\.\/canvas_picking_interior_hover_flow\.js';/
  );
  assert.match(hoverFlowNonSplitPreviewInterior, /tryHandleExtDrawersHoverPreview\(\{/);
  assert.match(hoverFlowNonSplitPreviewInterior, /tryHandleDrawerDividerHoverPreview\(\{/);
  assert.match(hoverFlowNonSplitPreviewInterior, /tryHandleCellDimsHoverPreview\(\{/);
  assert.match(hoverFlowNonSplitPreviewInterior, /tryHandleCanvasIntDrawerHover\(\{/);
  assert.match(hoverFlowNonSplitPreviewInterior, /tryHandleCanvasLayoutFamilyHover\(\{/);
  assert.match(
    hoverFlowNonSplitSketch,
    /import \{\s*tryHandleManualLayoutSketchHoverPreview\s*,?\s*\} from '\.\/canvas_picking_manual_layout_sketch_hover_tools\.js';/
  );
  assert.match(hoverFlowNonSplitSketch, /tryHandleManualLayoutSketchHoverPreview\(\{/);

  assert.match(
    hoverFlowSplit,
    /import \{ tryHandleSplitDoorHover \} from '\.\/canvas_picking_door_hover_modes\.js';/
  );
  assert.match(hoverFlowSplit, /tryHandleSplitDoorHover\(\{/);

  assert.doesNotMatch(hoverFlowCore, /const\s+frontPlaneZ\s*=\s*centerZ\s*\+\s*outerD\s*\/\s*2\s*;/);
  assert.doesNotMatch(
    hoverFlowCore,
    /doorMarker\.material = willRestore \? markerUd\.__matGroove : markerUd\.__matRemove;/
  );
  assert.doesNotMatch(hoverFlowCore, /const\s+isSplitCustom = splitVariant === 'custom';/);
  assert.match(manualSketchHover, /canvas_picking_manual_layout_sketch_hover_tools_router\.js/);
  assert.match(manualSketchHoverShared, /export function readManualLayoutSketchHoverRuntime\(/);
  assert.match(manualSketchHoverSelector, /export function resolvePreferredManualLayoutSketchSelectorHit\(/);
  assert.match(manualSketchHoverRouter, /tryHandleManualLayoutSketchHoverFreeFlow\(\{/);
  assert.match(manualSketchHoverRouter, /tryHandleManualLayoutSketchHoverModuleFlow\(\{/);
  assert.doesNotMatch(manualSketchHoverRouter, /__wp_findSketchModuleBoxAtPoint\(\{/);
  assert.doesNotMatch(manualSketchHoverRouter, /__wp_resolveSketchFreeBoxHoverPlacement\(\{/);

  assert.match(
    hoverModes,
    /export \{ tryHandleExtDrawersHoverPreview \} from '\.\/canvas_picking_hover_preview_modes_ext_drawers\.js';/
  );
  assert.match(
    hoverModes,
    /export \{ tryHandleDrawerDividerHoverPreview \} from '\.\/canvas_picking_hover_preview_modes_divider\.js';/
  );
  assert.match(
    hoverModes,
    /export \{ tryHandleCellDimsHoverPreview \} from '\.\/canvas_picking_hover_preview_modes_cell_dims\.js';/
  );
  assert.match(
    hoverModes,
    /export type \{[\s\S]*CellDimsHoverPreviewArgs,[\s\S]*DrawerDividerHoverPreviewArgs,[\s\S]*ExtDrawersHoverPreviewArgs,[\s\S]*\} from '\.\/canvas_picking_hover_preview_modes_shared\.js';/
  );
  assert.match(hoverModesShared, /export type ExtDrawersHoverPreviewArgs = HoverPreviewModeBaseArgs & \{/);
  assert.match(hoverModesShared, /export type DrawerDividerHoverPreviewArgs = HoverPreviewModeBaseArgs & \{/);
  assert.match(hoverModesShared, /export type CellDimsHoverPreviewArgs = HoverPreviewModeBaseArgs & \{/);
  assert.match(hoverModesShared, /export function __getSketchPlacementPreviewFns\(App: AppContainer\): \{/);
  assert.match(
    hoverModesExtDrawers,
    /export function tryHandleExtDrawersHoverPreview\(args: ExtDrawersHoverPreviewArgs\): boolean/
  );
  assert.match(hoverModesExtDrawers, /const\s+frontPlaneZ\s*=\s*centerZ\s*\+\s*outerD\s*\/\s*2\s*;/);
  assert.match(
    hoverModesDivider,
    /export function tryHandleDrawerDividerHoverPreview\(args: DrawerDividerHoverPreviewArgs\): boolean/
  );
  assert.match(
    hoverModesCellDims,
    /export function tryHandleCellDimsHoverPreview\(args: CellDimsHoverPreviewArgs\): boolean/
  );
  assert.match(
    hoverModesCellDims,
    /resolveCellDimsTargetBox\(App, target, selectorBox, applyW, applyH, applyD\)/
  );
  assert.match(hoverModesCellDimsInputs, /export function readLinearSelectorBoundaryInsetsCm\(/);
  assert.match(hoverModesCellDimsInputs, /export function toCellDimsPreviewWidthM\(/);
  assert.match(hoverModesCellDimsState, /export function readCellDimsSpecialDims\(/);
  assert.match(hoverModesCellDimsTarget, /export function resolveCellDimsTargetBox\(/);

  assert.match(
    doorHoverModes,
    /export \{ tryHandleDoorActionHover \} from '\.\/canvas_picking_door_action_hover_flow\.js';/
  );
  assert.match(
    doorHoverModes,
    /export \{ tryHandleSplitDoorHover \} from '\.\/canvas_picking_door_split_hover_flow\.js';/
  );
  assert.match(
    doorActionHover,
    /export function tryHandleDoorActionHover\(args: DoorActionHoverArgs\): boolean/
  );
  assert.match(doorActionHover, /canvas_picking_door_action_hover_state\.js/);
  assert.match(doorActionHover, /canvas_picking_door_action_hover_marker\.js/);
  assert.match(doorActionHover, /canvas_picking_door_action_hover_remove\.js/);
  assert.match(doorActionHoverState, /const preferredFaceHit =/);
  assert.match(doorActionHoverMarker, /tryHandleDoorPaintHoverPreview\(\{/);
  assert.match(
    doorActionHoverRemove,
    /doorMarker\.material = willRestore \? state\.markerUd\.__matGroove : state\.markerUd\.__matRemove;/
  );
  assert.match(
    doorSplitHover,
    /export function tryHandleSplitDoorHover\(args: SplitDoorHoverArgs\): boolean/
  );
  assert.match(doorSplitHover, /const isSplitCustom = splitVariant === 'custom';/);
  assert.match(
    doorHoverTargets,
    /export \{ __resolveHoverHit \} from '\.\/canvas_picking_door_hover_targets_hit\.js';/
  );
  assert.match(
    doorHoverTargets,
    /export \{ __resolvePreferredFacePreviewHit \} from '\.\/canvas_picking_door_hover_targets_preferred_face\.js';/
  );
  assert.match(doorHoverTargetsShared, /canvas_picking_door_hover_targets_contracts\.js/);
  assert.match(doorHoverTargetsShared, /canvas_picking_door_hover_targets_runtime\.js/);
  assert.match(doorHoverTargetsShared, /canvas_picking_door_hover_targets_policy\.js/);
  assert.match(doorHoverTargetsContracts, /export type DoorHoverResolverArgs = \{/);
  assert.match(doorHoverTargetsRuntime, /export function __readHoverThree\(/);
  assert.match(
    doorHoverTargetsPolicy,
    /export function __scopeCornerHoverPartKey\(partId: unknown, stackKey: unknown\): string/
  );
  assert.match(doorHoverTargetsPolicy, /export function __isSingleDoorHingeTarget\(/);
  assert.match(doorHoverTargetsHit, /export function __resolveHoverHit\(/);
  assert.match(doorHoverTargetsFace, /export function __resolvePreferredFacePreviewHit\(/);

  assert.match(
    interiorHover,
    /export \{ tryHandleCanvasIntDrawerHover \} from '\.\/canvas_picking_interior_hover_int_drawer\.js';/
  );
  assert.match(
    interiorHover,
    /export \{ tryHandleCanvasLayoutFamilyHover \} from '\.\/canvas_picking_interior_hover_layout_family\.js';/
  );
  assert.match(
    interiorHover,
    /export type \{ CanvasInteriorHoverFlowArgs \} from '\.\/canvas_picking_interior_hover_shared\.js';/
  );
  assert.doesNotMatch(interiorHover, /const\s+__intDrawerMode\s*=\s*getModeId\(App, 'INT_DRAWER'/);
  assert.doesNotMatch(interiorHover, /const\s+__layoutMode\s*=\s*getModeId\(App, 'LAYOUT'/);
  assert.doesNotMatch(interiorHover, /const\s+__manualMode\s*=\s*getModeId\(App, 'MANUAL_LAYOUT'/);
  assert.doesNotMatch(interiorHover, /const\s+__braceMode\s*=\s*getModeId\(App, 'BRACE_SHELVES'/);
  assert.match(interiorHoverShared, /canvas_picking_interior_hover_contracts\.js/);
  assert.match(interiorHoverContracts, /export interface CanvasInteriorHoverFlowArgs/);
  assert.match(interiorHoverPreview, /export function getSketchPreviewFns\(/);
  assert.match(interiorHoverState, /export function readLayoutType\(/);
  assert.match(interiorHoverConfig, /export function readHoverModuleConfig\(/);
  assert.match(
    interiorHoverShared,
    /export \{ readHoverModuleConfig \} from '\.\/canvas_picking_interior_hover_config\.js';/
  );
  assert.match(
    interiorHoverIntDrawer,
    /export function tryHandleCanvasIntDrawerHover\(args: CanvasInteriorHoverFlowArgs\): boolean/
  );
  assert.match(interiorHoverIntDrawer, /const\s+__intDrawerMode\s*=\s*getModeId\(App, 'INT_DRAWER'/);
  assert.match(
    interiorHoverLayoutFamily,
    /export function tryHandleCanvasLayoutFamilyHover\(args: CanvasInteriorHoverFlowArgs\): boolean/
  );
  assert.match(interiorHoverLayoutFamily, /canvas_picking_interior_hover_layout_mode\.js/);
  assert.match(interiorHoverLayoutFamily, /canvas_picking_interior_hover_manual_mode\.js/);
  assert.match(interiorHoverLayoutFamily, /canvas_picking_interior_hover_brace_mode\.js/);
  assert.match(interiorHoverLayoutMode, /export function tryHandleCanvasPresetLayoutHover\(/);
  assert.match(interiorHoverLayoutMode, /computeInteriorPresetOps\(/);
  assert.match(interiorHoverManualMode, /export function tryHandleCanvasManualLayoutHover\(/);
  assert.match(interiorHoverManualMode, /readExistingShelfVariant\(/);
  assert.match(interiorHoverBraceMode, /export function tryHandleCanvasBraceShelvesHover\(/);
  assert.match(interiorHoverBraceMode, /hasShelfAtIndex\(/);
  assert.match(interiorHoverLayoutShared, /export function buildLayoutPreviewPayload\(/);
  assert.match(interiorHoverLayoutShared, /export function hasShelfAtIndex\(/);

  assert.match(manualSketchHoverRouter, /tryHandleManualLayoutSketchHoverFreeFlow\(\{/);
  assert.match(manualSketchHoverRouter, /tryHandleManualLayoutSketchHoverModuleFlow\(\{/);
  assert.match(manualSketchHoverFree, /export function tryHandleManualLayoutSketchHoverFreeFlow/);
  assert.match(manualSketchHoverModule, /export function tryHandleManualLayoutSketchHoverModuleFlow/);
  assert.match(
    manualSketchHoverModule,
    /from '\.\/canvas_picking_manual_layout_sketch_hover_module_context\.js';/
  );
  assert.match(
    manualSketchHoverModule,
    /from '\.\/canvas_picking_manual_layout_sketch_hover_module_divider_flow\.js';/
  );
  assert.match(
    manualSketchHoverModule,
    /from '\.\/canvas_picking_manual_layout_sketch_hover_module_preview_flow\.js';/
  );
  assert.match(manualSketchHoverModuleContext, /export function resolveManualLayoutSketchHoverModuleContext/);
  assert.match(
    manualSketchHoverModuleDivider,
    /export function tryHandleManualLayoutSketchHoverModuleDividerFlow/
  );
  assert.match(
    manualSketchHoverModulePreview,
    /export function tryHandleManualLayoutSketchHoverModulePreviewFlow/
  );
  assert.match(
    manualSketchHoverModulePreview,
    /from '\.\/canvas_picking_manual_layout_sketch_hover_module_preview_box\.js';/
  );
  assert.match(
    manualSketchHoverModulePreview,
    /from '\.\/canvas_picking_manual_layout_sketch_hover_module_preview_stack\.js';/
  );
  assert.match(
    manualSketchHoverModulePreview,
    /from '\.\/canvas_picking_manual_layout_sketch_hover_module_preview_surface\.js';/
  );
  assert.match(manualSketchHoverModulePreviewShared, /export function writeManualLayoutSketchHoverPreview/);
  assert.match(
    manualSketchHoverModulePreviewBox,
    /export function tryHandleManualLayoutSketchHoverModuleBoxPreview/
  );
  assert.match(manualSketchHoverModulePreviewBox, /resolveSketchBoxVerticalContentPreview\(\{/);
  assert.match(manualSketchHoverModulePreviewBox, /resolveSketchBoxDoorPreview\(\{/);
  assert.match(
    manualSketchHoverModulePreviewStack,
    /export function tryHandleManualLayoutSketchHoverModuleStackPreview/
  );
  assert.match(manualSketchHoverModulePreviewStack, /resolveSketchBoxStackPreview\(\{/);
  assert.match(manualSketchHoverModulePreviewStack, /resolveSketchModuleStackPreview\(\{/);
  assert.match(
    manualSketchHoverModulePreviewSurface,
    /export function handleManualLayoutSketchHoverModuleSurfacePreview/
  );
  assert.match(manualSketchHoverModulePreviewSurface, /resolveSketchModuleSurfacePreview\(\{/);
});

test('canvas picking hover target resolution and local helper aliases stay centralized behind dedicated modules', () => {
  assert.match(localHelpers, /canvas_picking_local_helpers_hover\.js/);
  assert.match(
    localHelpersHover,
    /import \{[\s\S]*estimateVisibleModuleFrontZ\s*,?[\s\S]*readInteriorModuleConfigRef\s*,?[\s\S]*resolveDrawerHoverPreviewTarget\s*,?[\s\S]*resolveInteriorHoverTarget\s*,?[\s\S]*\} from '\.\/canvas_picking_hover_targets\.js';/
  );
  assert.match(localHelpersHover, /export const __wp_resolveInteriorHoverTarget = \(/);
  assert.match(localHelpersHover, /resolveInteriorHoverTarget\(\{/);
  assert.match(
    localHelpersHover,
    /export const __wp_readInteriorModuleConfigRef = readInteriorModuleConfigRef;/
  );
  assert.match(localHelpersHover, /export const __wp_estimateVisibleModuleFrontZ = \(/);
  assert.match(localHelpersHover, /export const __wp_resolveDrawerHoverPreviewTarget = \(/);

  assert.match(
    hoverTargets,
    /export \{[\s\S]*estimateVisibleModuleFrontZ,[\s\S]*resolveInteriorHoverTarget,[\s\S]*\} from '\.\/canvas_picking_hover_targets_interior\.js';/
  );
  assert.match(
    hoverTargets,
    /export \{ resolveDrawerHoverPreviewTarget \} from '\.\/canvas_picking_hover_targets_drawer\.js';/
  );
  assert.match(
    hoverTargets,
    /export \{ readInteriorModuleConfigRef \} from '\.\/canvas_picking_hover_targets_config\.js';/
  );
  assert.match(
    hoverTargets,
    /export type \{[\s\S]*DrawerHoverPreviewTarget,[\s\S]*InteriorHoverTarget,[\s\S]*ModuleKey,[\s\S]*ResolveInteriorHoverTargetArgs,[\s\S]*\} from '\.\/canvas_picking_hover_targets_shared\.js';/
  );
  assert.match(hoverTargetsShared, /export type InteriorHoverTarget = \{/);
  assert.match(hoverTargetsShared, /export type DrawerHoverPreviewTarget = \{/);
  assert.match(hoverTargetsShared, /export function readLocalHitY\(/);
  assert.match(
    hoverTargetsInterior,
    /export function resolveInteriorHoverTarget\(args: ResolveInteriorHoverTargetArgs\): InteriorHoverTarget \| null/
  );
  assert.match(
    hoverTargetsInterior,
    /export function estimateVisibleModuleFrontZ\(args: EstimateVisibleModuleFrontZArgs\): number/
  );
  assert.match(hoverTargetsInterior, /canvas_picking_hover_targets_interior_scan\.js/);
  assert.match(hoverTargetsInterior, /canvas_picking_hover_targets_interior_target\.js/);
  assert.match(hoverTargetsInteriorScan, /from '\.\/canvas_picking_module_selector_hits\.js';/);
  assert.match(hoverTargetsInteriorTarget, /findModuleSelectorObject\(\{/);
  assert.doesNotMatch(hoverTargetsInteriorScan, /function __findModuleSelector\(/);
  assert.match(hoverTargetsDrawer, /export function resolveDrawerHoverPreviewTarget\(/);
  assert.match(hoverTargetsConfig, /export function readInteriorModuleConfigRef\(/);

  assert.ok(
    audit.includes(
      '`canvas_picking_hover_flow.ts` is now a thin canonical seam over focused hover-flow core/non-split/split owners'
    )
  );
  assert.ok(
    audit.includes(
      '`canvas_picking_hover_flow.ts` generic part paint hover now routes through `services/canvas_picking_generic_paint_hover.ts`'
    )
  );
  assert.ok(
    audit.includes(
      '`canvas_picking_hover_flow.ts` int-drawer + layout/manual/brace interior hover flows now live in `services/canvas_picking_interior_hover_flow.ts`'
    )
  );
});
