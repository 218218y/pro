import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeWhitespace } from './_source_bundle.js';

const read = rel => normalizeWhitespace(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

const canvasPicking = read('esm/native/services/canvas_picking.ts');
const buildFlow = normalizeWhitespace(
  [
    read('esm/native/builder/build_wardrobe_flow.ts'),
    read('esm/native/builder/build_wardrobe_flow_prepare.ts'),
    read('esm/native/builder/build_wardrobe_flow_execute.ts'),
    read('esm/native/builder/build_wardrobe_flow_context.ts'),
  ].join('\n')
);
const buildFlowReaders = read('esm/native/builder/build_flow_readers.ts');
const buildFlowPlan = normalizeWhitespace(
  [
    read('esm/native/builder/build_flow_plan.ts'),
    read('esm/native/builder/build_flow_plan_contracts.ts'),
    read('esm/native/builder/build_flow_plan_dimensions.ts'),
    read('esm/native/builder/build_flow_plan_inputs.ts'),
    read('esm/native/builder/build_flow_plan_materials.ts'),
    read('esm/native/builder/build_flow_plan_layout.ts'),
  ].join('\n')
);
const buildStackSplit = normalizeWhitespace(
  [
    read('esm/native/builder/build_stack_split_shared.ts'),
    read('esm/native/builder/build_stack_split_contracts.ts'),
    read('esm/native/builder/build_stack_split_bottom_layout.ts'),
    read('esm/native/builder/build_stack_split_bottom_handles.ts'),
    read('esm/native/builder/build_stack_split_lower_setup.ts'),
    read('esm/native/builder/build_stack_split_shift.ts'),
    read('esm/native/builder/build_stack_split_pipeline.ts'),
    read('esm/native/builder/build_stack_split_context.ts'),
  ].join('\n')
);
const configCompounds = normalizeWhitespace(
  [
    read('esm/native/services/config_compounds.ts'),
    read('esm/native/services/config_compounds_shared.ts'),
    read('esm/native/services/config_compounds_seed.ts'),
    read('esm/native/services/config_compounds_runtime.ts'),
  ].join('\n')
);
const directHit = normalizeWhitespace(
  [
    read('esm/native/services/canvas_picking_sketch_direct_hit_workflow.ts'),
    read('esm/native/services/canvas_picking_sketch_direct_hit_workflow_shared.ts'),
    read('esm/native/services/canvas_picking_sketch_direct_hit_workflow_contracts.ts'),
    read('esm/native/services/canvas_picking_sketch_direct_hit_workflow_records.ts'),
    read('esm/native/services/canvas_picking_sketch_direct_hit_workflow_objects.ts'),
  ].join('\n')
);
const cornerWingCarcass = read('esm/native/builder/corner_wing_carcass_emit.ts');
const cornerWingCarcassShared = read('esm/native/builder/corner_wing_carcass_shared.ts');
const cornerWingCarcassShell = normalizeWhitespace(
  [
    read('esm/native/builder/corner_wing_carcass_shell.ts'),
    read('esm/native/builder/corner_wing_carcass_shell_metrics.ts'),
    read('esm/native/builder/corner_wing_carcass_shell_floor_base.ts'),
    read('esm/native/builder/corner_wing_carcass_shell_panels.ts'),
    read('esm/native/builder/corner_wing_carcass_shell_dividers.ts'),
    read('esm/native/builder/corner_wing_carcass_shell_ceiling.ts'),
  ].join('\n')
);
const cornerWingCarcassSelectors = read('esm/native/builder/corner_wing_carcass_selectors.ts');
const cornerWingCellOwner = read('esm/native/builder/corner_wing_cell_emit.ts');
const cornerWingCellShared = read('esm/native/builder/corner_wing_cell_shared.ts');
const cornerWingCellDoors = normalizeWhitespace(
  [
    read('esm/native/builder/corner_wing_cell_doors.ts'),
    read('esm/native/builder/corner_wing_cell_doors_shared.ts'),
    read('esm/native/builder/corner_wing_cell_doors_contracts.ts'),
    read('esm/native/builder/corner_wing_cell_doors_context.ts'),
    read('esm/native/builder/corner_wing_cell_doors_scope.ts'),
    read('esm/native/builder/corner_wing_cell_doors_state.ts'),
    read('esm/native/builder/corner_wing_cell_doors_rendering.ts'),
    read('esm/native/builder/corner_wing_cell_doors_split_policy.ts'),
    read('esm/native/builder/corner_wing_cell_doors_split.ts'),
    read('esm/native/builder/corner_wing_cell_doors_full.ts'),
  ].join('\n')
);
const cornerWingCell = normalizeWhitespace(
  [
    read('esm/native/builder/corner_wing_cell_emit.ts'),
    read('esm/native/builder/corner_wing_cell_interiors.ts'),
    read('esm/native/builder/corner_wing_cell_layouts.ts'),
    read('esm/native/builder/corner_wing_cell_sketch_extras.ts'),
    read('esm/native/builder/corner_wing_cell_doors.ts'),
    read('esm/native/builder/corner_wing_cell_doors_shared.ts'),
    read('esm/native/builder/corner_wing_cell_doors_contracts.ts'),
    read('esm/native/builder/corner_wing_cell_doors_context.ts'),
    read('esm/native/builder/corner_wing_cell_doors_scope.ts'),
    read('esm/native/builder/corner_wing_cell_doors_state.ts'),
    read('esm/native/builder/corner_wing_cell_doors_rendering.ts'),
    read('esm/native/builder/corner_wing_cell_doors_split_policy.ts'),
    read('esm/native/builder/corner_wing_cell_doors_split.ts'),
    read('esm/native/builder/corner_wing_cell_doors_full.ts'),
  ].join('\n')
);
const cornerConnectorCornice = normalizeWhitespace(
  [
    read('esm/native/builder/corner_connector_cornice_emit.ts'),
    read('esm/native/builder/corner_connector_cornice_shared.ts'),
    read('esm/native/builder/corner_connector_cornice_wave.ts'),
    read('esm/native/builder/corner_connector_cornice_profile.ts'),
  ].join('\n')
);
const cornerConnectorInterior = read('esm/native/builder/corner_connector_interior_emit.ts');
const cornerConnectorInteriorShared = read('esm/native/builder/corner_connector_interior_shared.ts');
const cornerConnectorOwner = read('esm/native/builder/corner_connector_emit.ts');
const cornerConnectorShared = read('esm/native/builder/corner_connector_emit_shared.ts');
const cornerConnectorDoor = normalizeWhitespace(
  [
    read('esm/native/builder/corner_connector_door_emit.ts'),
    read('esm/native/builder/corner_connector_door_emit_shared.ts'),
    read('esm/native/builder/corner_connector_door_emit_context.ts'),
    read('esm/native/builder/corner_connector_door_emit_state.ts'),
    read('esm/native/builder/corner_connector_door_emit_runtime.ts'),
    read('esm/native/builder/corner_connector_door_emit_split.ts'),
    read('esm/native/builder/corner_connector_door_emit_full.ts'),
  ].join('\n')
);
const cornerCommon = read('esm/native/builder/corner_ops_emit_common.ts');
const renderDoorOps = normalizeWhitespace(
  [
    read('esm/native/builder/render_door_ops.ts'),
    read('esm/native/builder/render_door_ops_shared.ts'),
    read('esm/native/builder/render_door_ops_shared_core.ts'),
    read('esm/native/builder/render_door_ops_sliding.ts'),
    read('esm/native/builder/render_door_ops_hinged.ts'),
  ].join('\n')
);
const visuals = [
  read('esm/native/builder/visuals_and_contents.ts'),
  read('esm/native/builder/visuals_and_contents_shared.ts'),
].join('\n');

test('builder/corner/canvas seams use typed installer contracts and reader helpers instead of bag casts', () => {
  assert.match(canvasPicking, /export type CanvasPickingInstallerResult = \{/);
  assert.match(
    canvasPicking,
    /export function installCanvasPickingService\(app: unknown\): CanvasPickingInstallerResult \| null/
  );
  assert.doesNotMatch(canvasPicking, /import type \{ AppContainer, AnyRecord \}/);
  assert.doesNotMatch(canvasPicking, /return \{[\s\S]*\} as AnyRecord/);

  assert.match(buildStackSplit, /readBuildContext/);
  assert.match(buildStackSplit, /readFiniteNumberArray/);
  assert.match(buildFlow, /resolveBuildFlowPlan\(/);
  assert.match(buildFlowPlan, /readModuleConfig/);
  assert.match(buildFlowPlan, /readUiState/);
  assert.match(buildStackSplit, /readModuleConfig/);
  assert.match(buildStackSplit, /readUiState/);
  assert.match(
    buildFlowReaders,
    /export function readFiniteNumberArray\(value: unknown\): number\[] \| null/
  );
  assert.match(buildFlowReaders, /export function readUiState\(value: unknown\): UiStateLike \| null/);
  assert.match(
    buildFlowReaders,
    /export function readModuleConfig\(value: unknown\): ModuleConfigLike \| null/
  );
  assert.match(
    buildFlowReaders,
    /export function readBuildContext\(value: unknown\): BuildContextLike \| null/
  );
  assert.doesNotMatch(buildFlow, /moduleInternalWidths as number\[]/);

  assert.match(configCompounds, /function readConfigStateLike\(value: unknown\): ConfigStateLike \| null/);
  assert.match(configCompounds, /function readFiniteNumber\(value: unknown\): number \| null/);
  assert.match(
    configCompounds,
    /const maxAttempts = Math\.max\(1, readFiniteNumber\(safeOpts\.maxAttempts\) \?\? 20\);/
  );
  assert.doesNotMatch(configCompounds, /__getCfg\(App\) as ConfigStateLike/);
  assert.doesNotMatch(configCompounds, /st\.config as ConfigStateLike/);

  assert.match(directHit, /function isSketchConfigLike\(value: unknown\): value is SketchConfigLike/);
  assert.match(directHit, /function isSketchExtrasLike\(value: unknown\): value is SketchExtrasLike/);
  assert.match(directHit, /function isCustomDataLike\(value: unknown\): value is CustomDataLike/);
  assert.match(directHit, /function isBooleanArray\(value: unknown\): value is boolean\[]/);
  assert.match(directHit, /function isStringArray\(value: unknown\): value is string\[]/);
  assert.match(directHit, /function isVec3Ctor\(value: unknown\): value is Vec3Ctor/);
  assert.doesNotMatch(directHit, /as SketchConfigLike/);
  assert.doesNotMatch(directHit, /as SketchExtrasLike/);
  assert.doesNotMatch(directHit, /as CustomDataLike/);
  assert.doesNotMatch(directHit, /new Array\([^\n]*\)\.fill\(false\) as boolean\[]/);
});

test('corner builders keep typed flow params, explicit nullish-string narrowing, and shared reader contracts', () => {
  const explicitNullishString =
    /if \(typeof value === 'string'\) return value;[\s\S]*if \(value === null\) return null;[\s\S]*if \(typeof value === 'undefined'\) return undefined;[\s\S]*return String\(value\);/;

  assert.match(cornerWingCarcass, /corner_wing_carcass_shared\.js/);
  assert.match(cornerWingCarcass, /corner_wing_carcass_shell\.js/);
  assert.match(cornerWingCarcass, /corner_wing_carcass_selectors\.js/);
  assert.match(cornerWingCarcassShared, /type CornerWingCarcassFlowParams = \{/);
  assert.doesNotMatch(cornerWingCarcassShared, /ctx: unknown;[\s\S]*helpers: unknown;/);
  assert.match(cornerWingCarcassShell, /const ds = THREE\.DoubleSide;/);
  assert.doesNotMatch(cornerWingCarcassShell, /asRecord\(THREE\)\['DoubleSide'\]/);
  assert.match(cornerWingCarcassSelectors, /const m = getInternalGridMap\(App, __stackKey === 'bottom'\);/);

  assert.match(
    cornerConnectorCornice,
    /import type \{ ThrottleOpts \} from '\.\.\/runtime\/throttled_errors\.js';/
  );
  assert.match(cornerConnectorCornice, /export type CornerConnectorCorniceFlowParams = \{/);
  assert.doesNotMatch(cornerConnectorCornice, /params as \{/);
  assert.match(cornerConnectorInterior, /createCornerConnectorInteriorEmitters\(params\.ctx\)/);
  assert.match(cornerConnectorInteriorShared, /uiAny: UnknownRecord;/);
  assert.match(cornerConnectorInteriorShared, /export type CornerConnectorInteriorCtx = \{/);
  assert.match(
    cornerConnectorShared,
    /type WardrobeChildLike = UnknownRecord & \{ userData\?: UnknownRecord \};/
  );
  assert.match(cornerConnectorShared, /export type CornerConnectorSetup = \{/);

  assert.match(cornerWingCellShared, explicitNullishString);
  assert.match(cornerConnectorDoor, explicitNullishString);
  assert.match(renderDoorOps, explicitNullishString);

  assert.match(
    cornerWingCellShared,
    /type CornerWingMaterialsResult = ReturnType<typeof import\('\.\/corner_materials\.js'\)\.createCornerWingMaterials>;/
  );
  assert.match(cornerWingCellShared, /__readScopedMapVal: CornerWingMaterialsResult\['readScopedMapVal'\];/);
  assert.match(
    cornerWingCellShared,
    /__edgeHandleLongLiftAbsYForCell: typeof import\('\.\/corner_geometry_plan\.js'\)\.__edgeHandleLongLiftAbsYForCell;/
  );
  assert.match(cornerWingCellOwner, /applyCornerWingCellInteriors\(params\);/);
  assert.match(cornerWingCellOwner, /applyCornerWingCellDoors\(params\);/);
  assert.match(
    cornerWingCellDoors,
    /readDoorTrimMap\(\(helpers\.getCfg\(ctx\.App\) \|\| \{\}\)\.doorTrimMap\)/
  );
  assert.match(
    cornerConnectorDoor,
    /type CornerWingMaterialsResult = ReturnType<typeof import\('\.\/corner_materials\.js'\)\.createCornerWingMaterials>;/
  );
  assert.match(cornerCommon, /__readScopedReader: CornerWingMaterialsResult\['readScopedReader'\];/);
  assert.match(
    visuals,
    /function __wp_resolveFn<TArgs extends unknown\[\], TResult>\(primary: unknown, secondary: unknown\): \(\(\.\.\.args: TArgs\) => TResult\) \| null/
  );
  assert.doesNotMatch(
    cornerWingCellShared,
    /__edgeHandleLongLiftAbsYForCell: \(\.\.\.args: unknown\[\]\) => number;/
  );
});
