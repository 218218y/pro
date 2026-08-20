import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';
import {
  getCallFacts,
  getFunctionSignatureFact,
  getInterfacePropertyFacts,
} from './_semantic_source_contracts.js';

const readRaw = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const read = rel => normalizeWhitespace(readRaw(rel));

const clickFlow = read('esm/native/services/canvas_picking_click_flow.ts');
const clickRouteRaw = [
  readRaw('esm/native/services/canvas_picking_click_route.ts'),
  readRaw('esm/native/services/canvas_picking_click_route_layout.ts'),
  readRaw('esm/native/services/canvas_picking_click_route_actions.ts'),
].join('\n');
const cellDimsLinear = read('esm/native/services/canvas_picking_cell_dims_linear.ts');
const cellDimsLinearShared = read('esm/native/services/canvas_picking_cell_dims_linear_shared.ts');
const cellDimsLinearApply = read('esm/native/services/canvas_picking_cell_dims_linear_apply.ts');
const cellDimsLinearApplyRaw = readRaw('esm/native/services/canvas_picking_cell_dims_linear_apply.ts');
const cellDimsCornerEffects = read('esm/native/services/canvas_picking_cell_dims_corner_effects.ts');
const cellDimsMetaRaw = readRaw('esm/native/services/canvas_picking_cell_dims_meta.ts');
const paintFlow = read('esm/native/services/canvas_picking_paint_flow.ts');
const paintApply = read('esm/native/services/canvas_picking_paint_flow_apply.ts');
const paintApplyState = read('esm/native/services/canvas_picking_paint_flow_apply_state.ts');
const paintApplyCommit = read('esm/native/services/canvas_picking_paint_flow_apply_commit.ts');
const paintApplyCommitRaw = readRaw('esm/native/services/canvas_picking_paint_flow_apply_commit.ts');
const _paintShared = read('esm/native/services/canvas_picking_paint_flow_shared.ts');
const paintMeta = read('esm/native/services/canvas_picking_paint_meta.ts');
const paintMetaRaw = readRaw('esm/native/services/canvas_picking_paint_meta.ts');
const configActions = read('esm/native/services/canvas_picking_config_actions.ts');
const configActionsRaw = readRaw('esm/native/services/canvas_picking_config_actions.ts');
const handleFlow = read('esm/native/services/canvas_picking_handle_assign_flow.ts');
const coreHelpersRaw = [
  readRaw('esm/native/services/canvas_picking_core_helpers.ts'),
  readRaw('esm/native/services/canvas_picking_core_shared.ts'),
  readRaw('esm/native/services/canvas_picking_core_support.ts'),
  readRaw('esm/native/services/canvas_picking_core_support_errors.ts'),
  readRaw('esm/native/services/canvas_picking_core_support_meta.ts'),
  readRaw('esm/native/services/canvas_picking_core_support_numbers.ts'),
  readRaw('esm/native/services/canvas_picking_core_support_records.ts'),
  readRaw('esm/native/services/canvas_picking_core_runtime.ts'),
  readRaw('esm/native/services/canvas_picking_core_raycast.ts'),
].join('\n');
const actionsAccess = [
  read('esm/native/runtime/actions_access.ts'),
  read('esm/native/runtime/actions_access_core.ts'),
  read('esm/native/runtime/actions_access_domains.ts'),
  read('esm/native/runtime/actions_access_mutations.ts'),
].join('\n');
const stateApiRaw = readRaw('esm/native/kernel/state_api.ts');
const stateApiConfigNamespace = [
  read('esm/native/kernel/state_api_config_namespace.ts'),
  read('esm/native/kernel/state_api_config_namespace_core.ts'),
  read('esm/native/kernel/state_api_config_namespace_maps.ts'),
  read('esm/native/kernel/state_api_config_namespace_scalars.ts'),
].join('\n');
const kernelTypes = read('types/kernel.ts');

test('canvas picking config snapshots and typed meta/map surfaces stay centralized behind canonical helpers', () => {
  assert.match(clickFlow, /canvas_picking_click_route\.js/);
  assert.equal(getCallFacts(clickRouteRaw, 'handleCanvasCellDimsClick').length, 1);
  assert.equal(getCallFacts(clickRouteRaw, 'tryHandleCanvasPaintClick').length, 1);

  assert.match(cellDimsLinear, /canvas_picking_cell_dims_linear_apply\.js/);
  assert.match(cellDimsLinearApply, /from '\.\/canvas_picking_config_actions\.js'/);
  assert.equal(getCallFacts(cellDimsLinearApplyRaw, 'applyCellDimsConfigSnapshot').length, 1);
  assert.match(cellDimsLinearApply, /createCanvasPickingCellDimsRefreshGatedMeta\(App, source\)/);
  assert.match(cellDimsCornerEffects, /createCanvasPickingCellDimsRefreshGatedMeta\(App, source\)/);
  assert.deepEqual(
    getFunctionSignatureFact(
      cellDimsMetaRaw,
      'createCanvasPickingCellDimsRefreshGatedMeta',
      'esm/native/services/canvas_picking_cell_dims_meta.ts'
    ),
    {
      name: 'createCanvasPickingCellDimsRefreshGatedMeta',
      async: false,
      params: [
        { name: 'App', optional: false, type: 'AppContainer' },
        { name: 'source', optional: false, type: 'string' },
        { name: 'baseMeta', optional: true, type: 'CanvasPickingCellDimsMeta' },
      ],
      returnType: 'ActionMetaLike',
    }
  );
  assert.doesNotMatch(
    cellDimsLinearShared + cellDimsLinearApply + cellDimsCornerEffects,
    /__wp_metaNoBuild\(/
  );
  assert.equal(
    getCallFacts(cellDimsLinearApplyRaw, 'setCfgModulesConfiguration').length,
    0,
    'cell-dims apply should delegate config persistence through applyCellDimsConfigSnapshot'
  );

  assert.match(paintFlow, /canvas_picking_paint_flow_apply\.js/);
  assert.match(paintApply, /createPaintFlowMutableState\(App\)/);
  assert.match(paintApplyState, /readIndividualColorsMap\(App\)/);
  assert.match(paintApplyState, /readCurtainMap\(App\)/);
  assert.match(paintApplyState, /readDoorSpecialMap\(App\)/);
  assert.match(paintApplyCommit, /from '\.\/canvas_picking_config_actions\.js'/);
  assert.equal(getCallFacts(paintApplyCommitRaw, 'applyPaintConfigSnapshot').length, 1);
  assert.deepEqual(
    getFunctionSignatureFact(
      paintMetaRaw,
      'createCanvasPickingPaintStructuralMeta',
      'esm/native/services/canvas_picking_paint_meta.ts'
    ),
    {
      name: 'createCanvasPickingPaintStructuralMeta',
      async: false,
      params: [{ name: 'source', optional: false, type: 'string' }],
      returnType: 'CanvasPickingPaintMeta',
    }
  );
  assert.match(paintMeta, /createCanvasPickingPaintMaterialRefreshMeta/);
  assert.match(paintMeta, /Canvas picking paint meta requires a source/);
  assert.doesNotMatch(paintApply, /\bAnyRecord\b/);

  assert.deepEqual(
    getInterfacePropertyFacts(
      configActionsRaw,
      'PaintConfigSnapshotArgs',
      'esm/native/services/canvas_picking_config_actions.ts'
    ),
    [
      { name: 'App', optional: false, readonly: false, type: 'AppContainer' },
      { name: 'individualColors', optional: false, readonly: false, type: 'IndividualColorsMap' },
      { name: 'curtainMap', optional: false, readonly: false, type: 'CurtainMap' },
      { name: 'doorSpecialMap', optional: true, readonly: false, type: 'DoorSpecialMap' },
      { name: 'doorStyleMap', optional: true, readonly: false, type: 'DoorStyleMap|undefined' },
      { name: 'mirrorLayoutMap', optional: true, readonly: false, type: 'MirrorLayoutMap' },
      { name: 'meta', optional: true, readonly: false, type: 'ActionMetaLike' },
    ]
  );
  assert.match(configActions, /cloneIndividualColorsMap/);
  assert.match(configActions, /cloneCurtainMap/);
  assert.match(configActions, /cloneDoorSpecialMap/);
  assert.deepEqual(
    getFunctionSignatureFact(
      configActionsRaw,
      'applyCellDimsConfigSnapshot',
      'esm/native/services/canvas_picking_config_actions.ts'
    ),
    {
      name: 'applyCellDimsConfigSnapshot',
      async: false,
      params: [{ name: 'args', optional: false, type: 'CellDimsConfigSnapshotArgs' }],
      returnType: 'void',
    }
  );
  assert.match(configActions, /applyModulesGeometrySnapshotViaActions\(App, snapshot, meta\)/);
  assert.match(configActions, /setCfgModulesConfiguration\(App, snapshot\.modulesConfiguration, meta\)/);
  assert.deepEqual(
    getFunctionSignatureFact(
      configActionsRaw,
      'applyPaintConfigSnapshot',
      'esm/native/services/canvas_picking_config_actions.ts'
    ),
    {
      name: 'applyPaintConfigSnapshot',
      async: false,
      params: [{ name: 'args', optional: false, type: 'PaintConfigSnapshotArgs' }],
      returnType: 'void',
    }
  );
  assert.deepEqual(
    getCallFacts(
      configActionsRaw,
      'applyPaintViaActions',
      'esm/native/services/canvas_picking_config_actions.ts'
    ),
    [
      {
        callee: 'applyPaintViaActions',
        args: [
          { kind: 'identifier', name: 'App' },
          { kind: 'identifier', name: 'individualColors' },
          { kind: 'identifier', name: 'curtainMap' },
          { kind: 'identifier', name: 'meta' },
          { kind: 'identifier', name: 'doorSpecialMap' },
          { kind: 'identifier', name: 'mirrorLayoutMap' },
          {
            kind: 'binary',
            operator: '??',
            left: { kind: 'identifier', name: 'doorStyleMap' },
            right: { kind: 'identifier', name: 'undefined' },
          },
        ],
      },
    ]
  );
  assert.doesNotMatch(configActions, /\bAnyRecord\b/);

  assert.match(handleFlow, /function readModeOpts\(App: AppContainer\): UnknownRecord \| null/);
  assert.match(handleFlow, /const __modeOpts = readModeOpts\(App\);/);
  assert.doesNotMatch(handleFlow, /\bAnyRecord\b/);

  for (const helperName of ['__wp_metaUiOnly', '__wp_metaNoBuild']) {
    assert.deepEqual(
      getFunctionSignatureFact(coreHelpersRaw, helperName, 'canvas_picking_core_helpers.bundle.ts'),
      {
        name: helperName,
        async: false,
        params: [
          { name: 'App', optional: false, type: 'AppContainer' },
          { name: 'source', optional: false, type: 'string' },
          { name: 'meta', optional: true, type: 'ActionMetaLike|UnknownRecord' },
        ],
        returnType: 'ActionMetaLike',
      }
    );
  }

  assert.match(actionsAccess, /export function applyModulesGeometrySnapshotViaActions\(/);
  assert.match(actionsAccess, /'applyModulesGeometrySnapshot'/);
  assert.match(kernelTypes, /export interface ModulesGeometrySnapshotLike \{/);
  assert.doesNotMatch(
    kernelTypes,
    /export interface ModulesGeometrySnapshotLike extends (?:AnyRecord|UnknownRecord)/
  );
  assert.match(
    kernelTypes,
    /applyModulesGeometrySnapshot\?: \(snapshot: ModulesGeometrySnapshotLike, meta\?: ActionMetaLike\) => unknown;/
  );

  assert.equal(getCallFacts(stateApiRaw, 'installStateApiConfigNamespace').length, 1);
  assert.match(
    stateApiConfigNamespace,
    /configNs\.applyModulesGeometrySnapshot = function applyModulesGeometrySnapshot\(/
  );
  assert.match(stateApiConfigNamespace, /actions\.config:applyModulesGeometrySnapshot/);
});
