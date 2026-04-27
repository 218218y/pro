import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const clickFlow = read('esm/native/services/canvas_picking_click_flow.ts');
const clickRoute = [
  read('esm/native/services/canvas_picking_click_route.ts'),
  read('esm/native/services/canvas_picking_click_route_layout.ts'),
  read('esm/native/services/canvas_picking_click_route_actions.ts'),
].join('\n');
const cellDimsLinear = read('esm/native/services/canvas_picking_cell_dims_linear.ts');
const cellDimsLinearApply = read('esm/native/services/canvas_picking_cell_dims_linear_apply.ts');
const paintFlow = read('esm/native/services/canvas_picking_paint_flow.ts');
const paintApply = read('esm/native/services/canvas_picking_paint_flow_apply.ts');
const paintApplyState = read('esm/native/services/canvas_picking_paint_flow_apply_state.ts');
const paintApplyCommit = read('esm/native/services/canvas_picking_paint_flow_apply_commit.ts');
const paintShared = read('esm/native/services/canvas_picking_paint_flow_shared.ts');
const configActions = read('esm/native/services/canvas_picking_config_actions.ts');
const handleFlow = read('esm/native/services/canvas_picking_handle_assign_flow.ts');
const coreHelpers = [
  read('esm/native/services/canvas_picking_core_helpers.ts'),
  read('esm/native/services/canvas_picking_core_shared.ts'),
  read('esm/native/services/canvas_picking_core_support.ts'),
  read('esm/native/services/canvas_picking_core_support_errors.ts'),
  read('esm/native/services/canvas_picking_core_support_meta.ts'),
  read('esm/native/services/canvas_picking_core_support_numbers.ts'),
  read('esm/native/services/canvas_picking_core_support_records.ts'),
  read('esm/native/services/canvas_picking_core_runtime.ts'),
  read('esm/native/services/canvas_picking_core_raycast.ts'),
].join('\n');
const actionsAccess = [
  read('esm/native/runtime/actions_access.ts'),
  read('esm/native/runtime/actions_access_core.ts'),
  read('esm/native/runtime/actions_access_domains.ts'),
  read('esm/native/runtime/actions_access_mutations.ts'),
].join('\n');
const stateApi = read('esm/native/kernel/state_api.ts');
const stateApiConfigNamespace = [
  read('esm/native/kernel/state_api_config_namespace.ts'),
  read('esm/native/kernel/state_api_config_namespace_core.ts'),
  read('esm/native/kernel/state_api_config_namespace_maps.ts'),
  read('esm/native/kernel/state_api_config_namespace_scalars.ts'),
].join('\n');
const kernelTypes = read('types/kernel.ts');

test('canvas picking config snapshots and typed meta/map surfaces stay centralized behind canonical helpers', () => {
  assert.match(clickFlow, /canvas_picking_click_route\.js/);
  assert.match(clickRoute, /handleCanvasCellDimsClick\(\{/);
  assert.match(clickRoute, /tryHandleCanvasPaintClick\(\{/);

  assert.match(cellDimsLinear, /canvas_picking_cell_dims_linear_apply\.js/);
  assert.match(cellDimsLinearApply, /from '\.\/canvas_picking_config_actions\.js'/);
  assert.match(cellDimsLinearApply, /applyCellDimsConfigSnapshot\(\{/);
  assert.doesNotMatch(
    cellDimsLinearApply,
    /cfgBatch\(\s*App,\s*function \(\) \{[\s\S]{0,400}setCfgModulesConfiguration\(App, nextModsCfg, metaCfg\)/
  );

  assert.match(paintFlow, /canvas_picking_paint_flow_apply\.js/);
  assert.match(paintApply, /createPaintFlowMutableState\(App\)/);
  assert.match(paintApplyState, /readIndividualColorsMap\(App\)/);
  assert.match(paintApplyState, /readCurtainMap\(App\)/);
  assert.match(paintApplyState, /readDoorSpecialMap\(App\)/);
  assert.match(paintApplyCommit, /from '\.\/canvas_picking_config_actions\.js'/);
  assert.match(paintApplyCommit, /applyPaintConfigSnapshot\(\{/);
  assert.match(paintShared, /export type PaintMetaLike = ActionMetaLike & \{ immediate\?: boolean \};/);
  assert.match(paintShared, /export function createImmediateMeta\(source: string\): PaintMetaLike/);
  assert.doesNotMatch(paintApply, /\bAnyRecord\b/);

  assert.match(configActions, /export interface PaintConfigSnapshotArgs \{/);
  assert.match(configActions, /individualColors: IndividualColorsMap;/);
  assert.match(configActions, /curtainMap: CurtainMap;/);
  assert.match(configActions, /doorSpecialMap\?: DoorSpecialMap;/);
  assert.match(configActions, /cloneIndividualColorsMap/);
  assert.match(configActions, /cloneCurtainMap/);
  assert.match(configActions, /cloneDoorSpecialMap/);
  assert.match(
    configActions,
    /export function applyCellDimsConfigSnapshot\(args: CellDimsConfigSnapshotArgs\): void/
  );
  assert.match(configActions, /applyModulesGeometrySnapshotViaActions\(App, snapshot, meta\)/);
  assert.match(configActions, /setCfgModulesConfiguration\(App, snapshot\.modulesConfiguration, meta\)/);
  assert.match(
    configActions,
    /export function applyPaintConfigSnapshot\(args: PaintConfigSnapshotArgs\): void/
  );
  assert.match(
    configActions,
    /applyPaintViaActions\(App, individualColors, curtainMap, meta, doorSpecialMap(?:, mirrorLayoutMap)?\)/
  );
  assert.doesNotMatch(configActions, /\bAnyRecord\b/);

  assert.match(handleFlow, /function readModeOpts\(App: AppContainer\): UnknownRecord \| null/);
  assert.match(handleFlow, /const __modeOpts = readModeOpts\(App\);/);
  assert.doesNotMatch(handleFlow, /\bAnyRecord\b/);

  assert.match(
    coreHelpers,
    /function __wp_metaUiOnly\(App: AppContainer, source: string, meta\?: ActionMetaLike \| UnknownRecord\): ActionMetaLike/
  );
  assert.match(
    coreHelpers,
    /function __wp_metaNoBuild\(App: AppContainer, source: string, meta\?: ActionMetaLike \| UnknownRecord\): ActionMetaLike/
  );

  assert.match(actionsAccess, /export function applyModulesGeometrySnapshotViaActions\(/);
  assert.match(actionsAccess, /'applyModulesGeometrySnapshot'/);
  assert.match(kernelTypes, /export interface ModulesGeometrySnapshotLike extends (AnyRecord|UnknownRecord)/);
  assert.match(
    kernelTypes,
    /applyModulesGeometrySnapshot\?: \(snapshot: ModulesGeometrySnapshotLike, meta\?: ActionMetaLike\) => unknown;/
  );

  assert.match(stateApi, /installStateApiConfigNamespace\(\{/);
  assert.match(
    stateApiConfigNamespace,
    /configNs\.applyModulesGeometrySnapshot = function applyModulesGeometrySnapshot\(/
  );
  assert.match(stateApiConfigNamespace, /actions\.config:applyModulesGeometrySnapshot/);
});
