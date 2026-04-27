const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test('manual-layout sketch stack helpers stay centralized instead of reappearing in hover/apply owners', () => {
  const freeHoverSrc = read('esm/native/services/canvas_picking_manual_layout_sketch_hover_free_flow.ts');
  const freeContentSrc = [
    read('esm/native/services/canvas_picking_sketch_free_box_content_preview.ts'),
    read('esm/native/services/canvas_picking_sketch_free_box_content_preview_vertical.ts'),
    read('esm/native/services/canvas_picking_sketch_free_box_content_preview_stack.ts'),
  ].join('\n');
  const stackCommitSrc = [
    'esm/native/services/canvas_picking_sketch_module_stack_commit.ts',
    'esm/native/services/canvas_picking_sketch_module_stack_commit_contracts.ts',
    'esm/native/services/canvas_picking_sketch_module_stack_commit_shared.ts',
    'esm/native/services/canvas_picking_sketch_module_stack_commit_hover.ts',
    'esm/native/services/canvas_picking_sketch_module_stack_commit_mutation.ts',
    'esm/native/services/canvas_picking_sketch_module_stack_commit_drawers.ts',
    'esm/native/services/canvas_picking_sketch_module_stack_commit_ext_drawers.ts',
  ]
    .map(read)
    .join('\n');
  const stackApplySrc = read('esm/native/services/canvas_picking_sketch_module_stack_apply.ts');
  const boxStackPreviewSrc = [
    'esm/native/services/canvas_picking_sketch_box_stack_preview.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_contracts.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_records.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_shared.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_context.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_overlay.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts',
  ]
    .map(read)
    .join('\n');
  const moduleStackPreviewSrc = [
    read('esm/native/services/canvas_picking_sketch_module_stack_preview.ts'),
    read('esm/native/services/canvas_picking_sketch_module_stack_preview_drawers.ts'),
    read('esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts'),
  ].join('\n');

  assert.match(freeContentSrc, /from '\.\/canvas_picking_manual_layout_sketch_vertical_stack\.js';/);
  assert.doesNotMatch(freeHoverSrc, /function parseSketchExtDrawerCount\(/);
  assert.doesNotMatch(freeHoverSrc, /function resolveSketchVerticalStackPlacement\(/);

  for (const src of [stackCommitSrc, boxStackPreviewSrc, moduleStackPreviewSrc]) {
    assert.match(src, /from '\.\/canvas_picking_manual_layout_sketch_stack_placement\.js';/);
  }

  assert.match(stackApplySrc, /from '\.\/canvas_picking_sketch_module_stack_commit\.js';/);
  assert.doesNotMatch(stackApplySrc, /function buildSketchExternalDrawerBlockersForCommit\(/);
  assert.doesNotMatch(stackApplySrc, /function resolveSketchInternalDrawerPlacementForCommit\(/);
  assert.doesNotMatch(stackApplySrc, /function resolveSketchExtDrawerPlacementForCommit\(/);
});

test('manual-layout sketch hover flows import shared front-overlay helpers instead of embedding duplicate overlay math', () => {
  const boxStackPreviewSrc = [
    'esm/native/services/canvas_picking_sketch_box_stack_preview.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_contracts.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_records.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_shared.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_context.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_overlay.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts',
    'esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts',
  ]
    .map(read)
    .join('\n');
  const moduleSurfaceSharedSrc = read(
    'esm/native/services/canvas_picking_sketch_module_surface_preview_shared.ts'
  );
  const freeSurfaceContentSrc = read(
    'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts'
  );
  const freeSurfacePlacementSrc = read(
    'esm/native/services/canvas_picking_sketch_free_surface_preview_placement_remove.ts'
  );

  for (const src of [boxStackPreviewSrc, freeSurfaceContentSrc, freeSurfacePlacementSrc]) {
    assert.match(src, /from '\.\/canvas_picking_manual_layout_sketch_front_overlay\.js';/);
    assert.doesNotMatch(src, /function resolveSketchBoxVisibleFrontOverlay\(/);
  }

  assert.match(moduleSurfaceSharedSrc, /canvas_picking_sketch_module_surface_preview_box_overlay\.js/);
  assert.doesNotMatch(moduleSurfaceSharedSrc, /function resolveSketchModuleBoxFrontOverlay\(/);

  const overlaySrc = read('esm/native/services/canvas_picking_manual_layout_sketch_front_overlay.ts');
  assert.match(overlaySrc, /export function resolveSketchBoxSegmentFaceSpan\(/);
  assert.match(overlaySrc, /export function resolveSketchBoxVisibleFrontOverlay\(/);
});
