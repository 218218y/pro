import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const owner = read('esm/native/services/canvas_picking_core.ts');
const clickFlow = read('esm/native/services/canvas_picking_click_flow.ts');
const clickModeState = read('esm/native/services/canvas_picking_click_mode_state.ts');
const clickModuleRefs = read('esm/native/services/canvas_picking_click_module_refs.ts');
const clickRoute = read('esm/native/services/canvas_picking_click_route.ts');
const clickRouteShared = read('esm/native/services/canvas_picking_click_route_shared.ts');
const clickRouteManual = read('esm/native/services/canvas_picking_click_route_manual.ts');
const clickRouteLayout = read('esm/native/services/canvas_picking_click_route_layout.ts');
const clickRouteActions = read('esm/native/services/canvas_picking_click_route_actions.ts');
const cellDims = read('esm/native/services/canvas_picking_cell_dims_flow.ts');
const cellDimsCorner = read('esm/native/services/canvas_picking_cell_dims_corner.ts');
const cellDimsCornerCell = read('esm/native/services/canvas_picking_cell_dims_corner_cell.ts');
const cellDimsCornerGlobal = read('esm/native/services/canvas_picking_cell_dims_corner_global.ts');
const cellDimsCornerShared = read('esm/native/services/canvas_picking_cell_dims_corner_shared.ts');
const cellDimsCornerContracts = read('esm/native/services/canvas_picking_cell_dims_corner_contracts.ts');
const cellDimsCornerContext = read('esm/native/services/canvas_picking_cell_dims_corner_context.ts');
const cellDimsCornerEffects = read('esm/native/services/canvas_picking_cell_dims_corner_effects.ts');
const cellDimsCornerGlobalState = read('esm/native/services/canvas_picking_cell_dims_corner_global_state.ts');
const cellDimsCornerGlobalApply = read('esm/native/services/canvas_picking_cell_dims_corner_global_apply.ts');
const cellDimsLinear = read('esm/native/services/canvas_picking_cell_dims_linear.ts');
const cellDimsLinearApply = read('esm/native/services/canvas_picking_cell_dims_linear_apply.ts');
const layoutFlow = read('esm/native/services/canvas_picking_layout_edit_flow.ts');
const layoutFlowManual = read('esm/native/services/canvas_picking_layout_edit_flow_manual.ts');
const layoutFlowBrace = read('esm/native/services/canvas_picking_layout_edit_flow_brace.ts');
const layoutFlowShared = read('esm/native/services/canvas_picking_layout_edit_flow_shared.ts');
const drawerFlow = read('esm/native/services/canvas_picking_drawer_mode_flow.ts');
const drawerFlowInternal = read('esm/native/services/canvas_picking_drawer_mode_flow_internal.ts');
const drawerFlowExternal = read('esm/native/services/canvas_picking_drawer_mode_flow_external.ts');
const drawerFlowDivider = read('esm/native/services/canvas_picking_drawer_mode_flow_divider.ts');
const doorEdit = read('esm/native/services/canvas_picking_door_edit_flow.ts');
const paintFlow = read('esm/native/services/canvas_picking_paint_flow.ts');
const paintApply = read('esm/native/services/canvas_picking_paint_flow_apply.ts');
const paintApplyState = read('esm/native/services/canvas_picking_paint_flow_apply_state.ts');
const paintApplyCommit = read('esm/native/services/canvas_picking_paint_flow_apply_commit.ts');
const paintTargets = read('esm/native/services/canvas_picking_paint_targets.ts');
const handleFlow = read('esm/native/services/canvas_picking_handle_assign_flow.ts');
const toggleFlow = read('esm/native/services/canvas_picking_toggle_flow.ts');
const toggleFlowShared = read('esm/native/services/canvas_picking_toggle_flow_shared.ts');
const toggleFlowSketchBox = read('esm/native/services/canvas_picking_toggle_flow_sketch_box.ts');
const toggleFlowSketchBoxTarget = read('esm/native/services/canvas_picking_toggle_flow_sketch_box_target.ts');
const toggleFlowSketchBoxRuntime = read(
  'esm/native/services/canvas_picking_toggle_flow_sketch_box_runtime.ts'
);
const toggleFlowSketchBoxToggle = read('esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.ts');
const audit = read('docs/layering_completion_audit.md');

test('canvas picking click owner stays thin and routes edit families through focused helper modules', () => {
  assert.match(owner, /canvas_picking_click_flow\.js/);
  assert.match(clickFlow, /canvas_picking_click_mode_state\.js/);
  assert.match(clickFlow, /canvas_picking_click_module_refs\.js/);
  assert.match(clickFlow, /canvas_picking_click_route\.js/);
  assert.match(clickFlow, /resolveCanvasPickingClickHitState\(\{/);
  assert.match(clickFlow, /createCanvasPickingClickModuleRefs\(\{/);
  assert.match(clickFlow, /routeCanvasPickingClick\(\{/);

  assert.match(
    clickModeState,
    /export function resolveCanvasPickingClickModeState\(App: AppContainer\): CanvasPickingClickModeState/
  );
  assert.match(clickModeState, /__isManualLayoutMode:/);
  assert.match(clickModeState, /__isDoorTrimMode:/);

  assert.match(clickModuleRefs, /export function createCanvasPickingClickModuleRefs\(/);
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

  assert.match(clickRoute, /export function routeCanvasPickingClick\(/);
  assert.match(clickRoute, /canvas_picking_click_route_shared\.js/);
  assert.match(clickRoute, /canvas_picking_click_route_manual\.js/);
  assert.match(clickRoute, /canvas_picking_click_route_layout\.js/);
  assert.match(clickRoute, /canvas_picking_click_route_actions\.js/);
  assert.match(clickRoute, /tryHandleCanvasPickingManualOrEmptyRoute\(args\)/);
  assert.match(clickRoute, /tryHandleCanvasPickingLayoutRoute\(args\)/);
  assert.match(clickRoute, /tryHandleCanvasPickingActionRoute\(args\)/);
  assert.doesNotMatch(clickRoute, /tryHandleCanvasLayoutEditClick\(\{/);
  assert.doesNotMatch(clickRoute, /handleCanvasDoorToggleClick\(\{/);
  assert.doesNotMatch(clickRoute, /source: 'manualLayout\.fillAllShelves'/);
  assert.doesNotMatch(clickRoute, /const __tools_paint = getTools\(App\);/);
  assert.doesNotMatch(clickRoute, /writeHandle\(App, partId, __ht, \{/);

  assert.match(clickRouteShared, /export type CanvasPickingClickRouteArgs = \{/);
  assert.match(clickRouteManual, /export function tryHandleCanvasPickingManualOrEmptyRoute\(/);
  assert.match(clickRouteManual, /tryHandleCanvasManualSketchFreeClick\(\{/);
  assert.match(clickRouteManual, /resetCanvasPickingEmptyClick\(\{/);
  assert.match(clickRouteLayout, /export function tryHandleCanvasPickingLayoutRoute\(/);
  assert.match(clickRouteLayout, /tryHandleCanvasLayoutEditClick\(\{/);
  assert.match(clickRouteLayout, /handleCanvasCellDimsClick\(\{/);
  assert.match(clickRouteLayout, /tryHandleCanvasDrawerModeClick\(\{/);
  assert.match(clickRouteActions, /export function tryHandleCanvasPickingActionRoute\(/);
  assert.match(clickRouteActions, /tryHandleCanvasDoorEditClick\(\{/);
  assert.match(clickRouteActions, /tryHandleCanvasPaintClick\(\{/);
  assert.match(clickRouteActions, /tryHandleCanvasHandleAssignClick\(\{/);
  assert.match(clickRouteActions, /handleCanvasDoorToggleClick\(\{/);

  assert.match(cellDims, /export function handleCanvasCellDimsClick\(args: CanvasCellDimsClickArgs\): void/);
  assert.match(cellDims, /handleCanvasCornerCellDimsClick\(\{/);
  assert.match(cellDims, /handleCanvasLinearCellDimsClick\(\{/);
  assert.match(
    cellDimsCorner,
    /import \{ handleCornerPerCellDimsClick \} from '\.\/canvas_picking_cell_dims_corner_cell\.js';/
  );
  assert.match(
    cellDimsCorner,
    /import \{ handleCornerGlobalDimsClick \} from '\.\/canvas_picking_cell_dims_corner_global\.js';/
  );
  assert.match(
    cellDimsCorner,
    /import \{[\s\S]*buildCornerCellDimsContext[\s\S]*\} from '\.\/canvas_picking_cell_dims_corner_shared\.js';/
  );
  assert.match(cellDimsCorner, /const ctx = buildCornerCellDimsContext\(args\);/);
  assert.match(cellDimsCorner, /handleCornerPerCellDimsClick\(ctx\)/);
  assert.match(cellDimsCorner, /handleCornerGlobalDimsClick\(ctx\)/);
  assert.doesNotMatch(cellDimsCorner, /setCfgCornerConfiguration\(/);
  assert.doesNotMatch(cellDimsCorner, /requestBuilderBuild\(/);
  assert.match(
    cellDimsCornerCell,
    /export function handleCornerPerCellDimsClick\(ctx: CornerCellDimsContext\): boolean/
  );
  assert.match(cellDimsCornerCell, /canvas_picking_cell_dims_corner_cell_height_depth\.js/);
  assert.match(cellDimsCornerCell, /canvas_picking_cell_dims_corner_cell_width\.js/);
  assert.match(cellDimsCornerGlobal, /canvas_picking_cell_dims_corner_global_state\.js/);
  assert.match(cellDimsCornerGlobal, /canvas_picking_cell_dims_corner_global_apply\.js/);
  assert.doesNotMatch(cellDimsCornerGlobal, /applyOverrideToSpecialDims\(/);
  assert.match(cellDimsCornerShared, /canvas_picking_cell_dims_corner_contracts\.js/);
  assert.match(cellDimsCornerShared, /canvas_picking_cell_dims_corner_context\.js/);
  assert.match(cellDimsCornerShared, /canvas_picking_cell_dims_corner_effects\.js/);
  assert.doesNotMatch(cellDimsCornerShared, /requestBuilderBuild\(/);
  assert.match(cellDimsCornerContracts, /export interface CornerCellDimsContext/);
  assert.match(
    cellDimsCornerContext,
    /export function buildCornerCellDimsContext\(args: CanvasCornerCellDimsArgs\): CornerCellDimsContext/
  );
  assert.match(
    cellDimsCornerEffects,
    /export function patchCornerConfig\(App: AppContainer, nextCornerCfg: CornerConfigShape, source: string, op: string\): void/
  );
  assert.match(
    cellDimsCornerGlobalState,
    /export function resolveCornerGlobalDimsTargetState\(ctx: CornerCellDimsContext\): CornerGlobalDimsTargetState/
  );
  assert.match(cellDimsCornerGlobalApply, /export function applyCornerGlobalDimsTargetState\(/);
  assert.match(
    cellDimsLinear,
    /export function handleCanvasLinearCellDimsClick\(args: CanvasLinearCellDimsArgs\): void/
  );
  assert.match(cellDimsLinearApply, /export function applyCanvasLinearCellDimsContext\(/);

  assert.match(layoutFlow, /export function tryHandleCanvasLayoutEditClick\(/);
  assert.match(layoutFlow, /tryHandleCanvasLayoutPresetClick\(/);
  assert.match(layoutFlow, /tryHandleCanvasManualLayoutClick\(args\)/);
  assert.match(layoutFlow, /tryHandleCanvasBraceShelvesClick\(args\)/);
  assert.match(
    layoutFlowManual,
    /export function tryHandleCanvasManualLayoutClick\(args: CanvasLayoutEditClickArgs\): boolean/
  );
  assert.match(layoutFlowManual, /source: 'manualLayout\.fillAllShelves'/);
  assert.match(layoutFlowManual, /source: 'manualLayout\.toggleItem'/);
  assert.match(layoutFlowManual, /tryHandleManualLayoutSketchToolClick\(\{/);
  assert.match(
    layoutFlowBrace,
    /export function tryHandleCanvasBraceShelvesClick\(args: CanvasLayoutEditClickArgs\): boolean/
  );
  assert.match(layoutFlowBrace, /source: 'braceShelves\.toggle'/);
  assert.match(layoutFlowShared, /export type CanvasLayoutEditClickArgs = \{/);
  assert.match(layoutFlowShared, /export function ensureCustomData\(/);

  assert.match(
    drawerFlow,
    /export function tryHandleCanvasDrawerModeClick\(args: CanvasDrawerModeClickArgs\): boolean/
  );
  assert.match(drawerFlow, /tryHandleInternalDrawerModeClick\(\{/);
  assert.match(drawerFlow, /tryHandleExternalDrawerModeClick\(\{/);
  assert.match(drawerFlow, /tryHandleDrawerDividerModeClick\(\{/);
  assert.match(drawerFlowInternal, /source: 'intDrawers\.toggle'/);
  assert.match(drawerFlowExternal, /source: 'extDrawers\.toggle'/);
  assert.match(drawerFlowDivider, /source: 'divider:click'/);

  assert.match(
    doorEdit,
    /export function tryHandleCanvasDoorEditClick\(args: CanvasDoorEditClickArgs\): boolean/
  );
  assert.match(
    doorEdit,
    /import \{ handleCanvasDoorTrimClick \} from '\.\/canvas_picking_door_trim_click\.js';/
  );
  assert.match(
    doorEdit,
    /import \{ handleCanvasDoorSplitClick \} from '\.\/canvas_picking_door_split_click\.js';/
  );
  assert.match(
    doorEdit,
    /import \{ handleCanvasDoorRemoveClick \} from '\.\/canvas_picking_door_remove_click\.js';/
  );
  assert.match(doorEdit, /handleCanvasDoorTrimClick\(\{/);
  assert.match(doorEdit, /handleCanvasDoorSplitClick\(\{/);
  assert.match(doorEdit, /handleCanvasDoorRemoveClick\(\{/);
  assert.match(doorEdit, /handleCanvasDoorHingeClick\(\{/);
  assert.match(doorEdit, /handleCanvasDoorGrooveClick\(\{/);
  assert.doesNotMatch(doorEdit, /const __splitVariant = readSplitVariant\(App\);/);
  assert.doesNotMatch(doorEdit, /const familyPartIds = \(\(\) => \{/);
  assert.doesNotMatch(doorEdit, /const nextGroove = !\(current\.groove === true\);/);

  assert.match(
    paintFlow,
    /export \{ tryHandleCanvasPaintClick \} from '\.\/canvas_picking_paint_flow_apply\.js';/
  );
  assert.match(paintFlow, /export \{ resolvePaintTargetKeys \} from '\.\/canvas_picking_paint_targets\.js';/);
  assert.match(
    paintApply,
    /export function tryHandleCanvasPaintClick\(args: CanvasPaintClickArgs\): boolean/
  );
  assert.match(paintApplyState, /export function createPaintFlowMutableState\(/);
  assert.match(paintApplyCommit, /applyPaintConfigSnapshot\(\{/);
  assert.match(paintTargets, /export function resolvePaintTargetKeys\(/);
  assert.match(
    handleFlow,
    /export function tryHandleCanvasHandleAssignClick\(args: CanvasHandleAssignClickArgs\): boolean/
  );
  assert.match(
    toggleFlow,
    /export function handleCanvasDoorToggleClick\(args: CanvasDoorToggleClickArgs\): void/
  );
  assert.match(toggleFlow, /canvas_picking_toggle_flow_shared\.js/);
  assert.match(toggleFlow, /canvas_picking_toggle_flow_sketch_box\.js/);
  assert.match(toggleFlowShared, /export function toggleDoorsState\(App: AppContainer\): void/);
  assert.match(
    toggleFlowShared,
    /export function tryHandleDirectDoorOrDrawerToggle\(args: CanvasDirectDoorToggleArgs\): boolean/
  );
  assert.match(toggleFlowSketchBox, /canvas_picking_toggle_flow_sketch_box_target\.js/);
  assert.match(toggleFlowSketchBox, /canvas_picking_toggle_flow_sketch_box_toggle\.js/);
  assert.match(toggleFlowSketchBoxTarget, /export function resolveSketchBoxToggleTarget\(/);
  assert.match(toggleFlowSketchBoxTarget, /export function resolveSketchBoxPatchTargets\(/);
  assert.match(
    toggleFlowSketchBoxRuntime,
    /export const __SKETCH_BOX_DOOR_MOTION_SEED_KEY = '__wpSketchBoxDoorMotionSeed';/
  );
  assert.match(toggleFlowSketchBoxToggle, /export function toggleSketchBoxDoor\(/);

  assert.ok(
    audit.includes(
      '`canvas_picking_click_flow.ts` layout preset/manual-layout/brace-shelves flows now live in `services/canvas_picking_layout_edit_flow.ts`'
    )
  );
  assert.ok(
    audit.includes(
      '`services/canvas_picking_layout_edit_flow.ts` now stays a thin routing seam while manual-layout grid/toggle/sketch-tool policy lives in `services/canvas_picking_layout_edit_flow_manual.ts`, brace-shelf hit/validation/toggle policy lives in `services/canvas_picking_layout_edit_flow_brace.ts`, and shared grid/config record helpers live in `services/canvas_picking_layout_edit_flow_shared.ts`'
    )
  );
  assert.ok(
    audit.includes(
      '`canvas_picking_click_flow.ts` internal/external drawer + divider flows now live in `services/canvas_picking_drawer_mode_flow.ts`'
    )
  );
  assert.ok(
    audit.includes(
      '`canvas_picking_click_flow.ts` split/remove/hinge/groove door edit routing now lives in `services/canvas_picking_door_edit_flow.ts`, while focused trim/split/remove/hinge/groove policy lives in `services/canvas_picking_door_trim_click.ts`, `services/canvas_picking_door_split_click.ts`, `services/canvas_picking_door_remove_click.ts`, and `services/canvas_picking_door_hinge_groove_click.ts`'
    )
  );
  assert.ok(
    audit.includes(
      '`canvas_picking_click_flow.ts` paint flows now live in `services/canvas_picking_paint_flow.ts`'
    )
  );
  assert.ok(
    audit.includes(
      '`canvas_picking_click_flow.ts` handle-assign flows now live in `services/canvas_picking_handle_assign_flow.ts`'
    )
  );
  assert.ok(
    audit.includes(
      '`canvas_picking_click_flow.ts` none/screen-note door toggle flows now live in `services/canvas_picking_toggle_flow.ts`'
    )
  );
  assert.ok(
    audit.includes(
      '`canvas_picking_click_flow.ts` cell-dims click flows now live in `services/canvas_picking_cell_dims_flow.ts`'
    )
  );
  assert.ok(
    audit.includes(
      '`services/canvas_picking_click_flow.ts` is now a thin canonical seam over focused click-mode, module-ref, hit-resolution, and route owners'
    )
  );
  assert.ok(
    audit.includes(
      '`services/canvas_picking_cell_dims_corner.ts` now stays a thin seam while the canonical corner contracts/context/effects surface lives behind `services/canvas_picking_cell_dims_corner_shared.ts`, per-cell corner width/height/depth policy lives in `services/canvas_picking_cell_dims_corner_cell.ts`, and global wing/connector width policy lives in the focused `services/canvas_picking_cell_dims_corner_global_state.ts` + `services/canvas_picking_cell_dims_corner_global_apply.ts` owners behind `services/canvas_picking_cell_dims_corner_global.ts`'
    )
  );
});
