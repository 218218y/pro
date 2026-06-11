import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const localHelpers = read('esm/native/services/canvas_picking_local_helpers.ts');
const localHelpersSketch = read('esm/native/services/canvas_picking_local_helpers_sketch.ts');
const hoverFlow = read('esm/native/services/canvas_picking_hover_flow.ts');
const hoverFlowNonSplit = read('esm/native/services/canvas_picking_hover_flow_nonsplit.ts');
const hoverFlowNonSplitSketch = read('esm/native/services/canvas_picking_hover_flow_nonsplit_sketch.ts');
const sketchBoxes = read('esm/native/services/canvas_picking_sketch_free_boxes.ts');
const freeWorkflow = read('esm/native/services/canvas_picking_sketch_free_box_workflow.ts');
const freeShared = read('esm/native/services/canvas_picking_sketch_free_box_shared.ts');
const freeContracts = read('esm/native/services/canvas_picking_sketch_free_box_contracts.ts');
const freeHit = read('esm/native/services/canvas_picking_sketch_free_box_hit.ts');
const freeGeometry = read('esm/native/services/canvas_picking_sketch_free_box_geometry.ts');
const freePlacement = read('esm/native/services/canvas_picking_sketch_free_box_placement.ts');
const freeHover = read('esm/native/services/canvas_picking_sketch_free_box_hover.ts');
const sketchDividers = read('esm/native/services/canvas_picking_sketch_box_dividers.ts');
const sketchDividerShared = read('esm/native/services/canvas_picking_sketch_box_dividers_shared.ts');
const sketchDividerState = read('esm/native/services/canvas_picking_sketch_box_divider_state.ts');
const sketchDividerStateRecords = read(
  'esm/native/services/canvas_picking_sketch_box_divider_state_records.ts'
);
const sketchDividerStatePlacement = read(
  'esm/native/services/canvas_picking_sketch_box_divider_state_placement.ts'
);
const sketchDividerStateMutation = read(
  'esm/native/services/canvas_picking_sketch_box_divider_state_mutation.ts'
);
const sketchSegments = read('esm/native/services/canvas_picking_sketch_box_segments.ts');
const sketchDoors = read('esm/native/services/canvas_picking_sketch_box_doors.ts');
const sketchDoorsShared = read('esm/native/services/canvas_picking_sketch_box_doors_shared.ts');
const sketchDoorsPlacement = read('esm/native/services/canvas_picking_sketch_box_doors_placement.ts');
const sketchDoorsMutation = read('esm/native/services/canvas_picking_sketch_box_doors_mutation.ts');
const audit = read('docs/layering_completion_audit.md');

test('canvas picking sketch free-box and sketch-box divider helpers stay delegated to dedicated workflow modules', () => {
  const bundle = [
    localHelpers,
    localHelpersSketch,
    hoverFlow,
    hoverFlowNonSplit,
    hoverFlowNonSplitSketch,
  ].join('\n');

  assert.match(bundle, /(?:pickSketchFreeBoxHost as __wp_pickSketchFreeBoxHost|pickSketchFreeBoxHost)/);
  assert.match(bundle, /__wp_findSketchFreeBoxLocalHit/);
  assert.match(localHelpersSketch, /findSketchFreeBoxLocalHit\(\{/);
  assert.match(bundle, /__wp_resolveSketchFreeBoxHoverPlacement/);
  assert.match(localHelpersSketch, /resolveSketchFreeBoxHoverPlacement\(\{/);
  assert.doesNotMatch(bundle, /function __wp_pickSketchFreeBoxHost\(/);
  assert.doesNotMatch(bundle, /function __wp_resolveSketchFreeBoxGeometry\(/);
  assert.doesNotMatch(bundle, /function __wp_resolveSketchFreeBoxHoverPlacement\(/);

  assert.match(
    sketchBoxes,
    /export function pickSketchFreeBoxHost\(App: AppContainer\): \{ moduleKey: ModuleKey; isBottom: boolean \} \| null/
  );
  assert.match(
    sketchBoxes,
    /export \{[\s\S]*resolveSketchFreeBoxGeometry,[\s\S]*resolveSketchFreeBoxHoverPlacement,[\s\S]*\} from '\.\/canvas_picking_sketch_free_box_workflow\.js';/
  );

  assert.match(
    freeWorkflow,
    /export type \{[\s\S]*ModuleKey,[\s\S]*ProjectWorldPointToLocalFn,[\s\S]*ResolveSketchFreeBoxHoverPlacementArgs,[\s\S]*\} from '\.\/canvas_picking_sketch_free_box_shared\.js';/
  );
  assert.match(
    freeWorkflow,
    /export \{[\s\S]*resolveSketchFreeBoxGeometry,[\s\S]*resolveSketchFreeBoxOutsideWardrobeSnapX,[\s\S]*\} from '\.\/canvas_picking_sketch_free_box_shared\.js';/
  );
  assert.match(
    freeWorkflow,
    /export \{[\s\S]*resolveSketchFreeBoxAttachPlacement,[\s\S]*resolveSketchFreeBoxNonOverlappingPlacement,[\s\S]*\} from '\.\/canvas_picking_sketch_free_box_placement\.js';/
  );
  assert.match(
    freeWorkflow,
    /export \{ resolveSketchFreeBoxHoverPlacement \} from '\.\/canvas_picking_sketch_free_box_hover\.js';/
  );

  assert.match(freeShared, /canvas_picking_sketch_free_box_contracts\.js/);
  assert.match(freeShared, /canvas_picking_sketch_free_box_hit\.js/);
  assert.match(freeShared, /canvas_picking_sketch_free_box_geometry\.js/);
  assert.match(freeContracts, /export type ModuleKey = number \| 'corner' \| `corner:\$\{number\}`;/);
  assert.match(freeContracts, /export function asSketchFreePlacementBox\(/);
  assert.match(freeHit, /export function findSketchFreeBoxLocalHit\(/);
  assert.match(freeGeometry, /canvas_picking_sketch_free_box_geometry_box\.js/);
  assert.match(freeGeometry, /canvas_picking_sketch_free_box_geometry_vertical\.js/);
  assert.match(freeGeometry, /canvas_picking_sketch_free_box_geometry_overlap\.js/);
  assert.match(freeGeometry, /canvas_picking_sketch_free_box_geometry_zone\.js/);
  assert.match(freePlacement, /canvas_picking_sketch_free_box_placement_shared\.js/);
  assert.match(freePlacement, /canvas_picking_sketch_free_box_placement_attach\.js/);
  assert.match(freePlacement, /canvas_picking_sketch_free_box_placement_overlap\.js/);
  assert.match(
    freeHover,
    /export function resolveSketchFreeBoxHoverPlacement\(args: ResolveSketchFreeBoxHoverPlacementArgs\): \{/
  );

  assert.match(localHelpers, /canvas_picking_local_helpers_sketch\.js/);
  assert.match(localHelpersSketch, /from '\.\/canvas_picking_sketch_box_dividers\.js';/);
  assert.match(
    localHelpersSketch,
    /export const __wp_readSketchBoxDividerXNorm = readSketchBoxDividerXNorm;/
  );
  assert.match(localHelpersSketch, /export const __wp_addSketchBoxDividerState = addSketchBoxDividerState;/);
  assert.match(
    localHelpersSketch,
    /export const __wp_removeSketchBoxDividerState = removeSketchBoxDividerState;/
  );
  assert.match(
    localHelpersSketch,
    /export const __wp_resolveSketchBoxDividerPlacement = resolveSketchBoxDividerPlacement;/
  );
  assert.match(
    localHelpersSketch,
    /export const __wp_applySketchBoxDividerState = applySketchBoxDividerState;/
  );
  assert.doesNotMatch(localHelpersSketch, /function __wp_writeSketchBoxDividers\(/);
  assert.doesNotMatch(localHelpersSketch, /function __wp_resolveSketchBoxSegments\(/);

  assert.match(sketchDividers, /from '\.\/canvas_picking_sketch_box_dividers_shared\.js';/);
  assert.match(sketchDividers, /from '\.\/canvas_picking_sketch_box_divider_state\.js';/);
  assert.match(sketchDividers, /from '\.\/canvas_picking_sketch_box_segments\.js';/);
  assert.match(sketchDividers, /from '\.\/canvas_picking_sketch_box_doors\.js';/);

  assert.match(sketchDividerShared, /export type SketchBoxDividerState = \{/);
  assert.match(sketchDividerShared, /export type SketchBoxSegmentState = \{/);
  assert.match(sketchDividerState, /canvas_picking_sketch_box_divider_state_records\.js/);
  assert.match(sketchDividerState, /canvas_picking_sketch_box_divider_state_placement\.js/);
  assert.match(sketchDividerState, /canvas_picking_sketch_box_divider_state_mutation\.js/);
  assert.match(
    sketchDividerStateRecords,
    /export function readSketchBoxDividers\(box: unknown\): SketchBoxDividerState\[]/
  );
  assert.match(
    sketchDividerStateRecords,
    /export function writeSketchBoxDividers\(box: unknown, dividers: SketchBoxDividerState\[\]\): void/
  );
  assert.match(sketchDividerStatePlacement, /export function resolveSketchBoxDividerPlacement\(/);
  assert.match(sketchDividerStateMutation, /export function applySketchBoxDividerState\(/);
  assert.match(sketchSegments, /export function resolveSketchBoxSegments\(args: \{/);
  assert.match(sketchDividerShared, /if \(tool === 'sketch_box_divider'\) return 'divider';/);
  assert.match(sketchDividerShared, /if \(tool\.startsWith\('sketch_shelf:'\)\) return 'shelf';/);
  assert.match(sketchDividerShared, /if \(tool === 'sketch_rod'\) return 'rod';/);
  assert.match(sketchDividerShared, /if \(tool\.startsWith\('sketch_storage:'\)\) return 'storage';/);
  assert.match(sketchDoors, /canvas_picking_sketch_box_doors_shared\.js/);
  assert.match(sketchDoors, /canvas_picking_sketch_box_doors_placement\.js/);
  assert.match(sketchDoors, /canvas_picking_sketch_box_doors_mutation\.js/);
  assert.match(sketchDoorsShared, /export function readSketchBoxDoors\(/);
  assert.match(sketchDoorsPlacement, /export function findSketchBoxDoorForSegment\(/);
  assert.match(sketchDoorsMutation, /export function upsertSketchBoxDoubleDoorPairForSegment\(/);

  assert.ok(
    audit.includes(
      '`canvas_picking_core.ts` sketch free-box entrypoints still route through `services/canvas_picking_sketch_free_boxes.ts`, while the workflow seam now fans out to `services/canvas_picking_sketch_free_box_shared.ts`, a thin `services/canvas_picking_sketch_free_box_geometry.ts` seam over focused box-size, vertical-bounds, overlap, and remove-zone owners, a thin `services/canvas_picking_sketch_free_box_placement.ts` seam over focused attach/overlap helpers, and `services/canvas_picking_sketch_free_box_hover.ts` so host selection stays separate from geometry, placement, attach scoring, and hover resolution policy.'
    )
  );
  assert.ok(
    audit.includes(
      '`canvas_picking_sketch_box_dividers.ts` is now a thin canonical seam over focused divider-state, segment, door, and shared tool helpers'
    )
  );
});
