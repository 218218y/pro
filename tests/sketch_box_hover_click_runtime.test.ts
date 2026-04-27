import test from 'node:test';
import assert from 'node:assert/strict';

import { readSketchBoxFrontsBundle, readSourceFiles } from './sketch_box_runtime_helpers.ts';

test('sketch external drawers hover context loads persisted module stacks for remove/overlap handling', async () => {
  const src = await readSourceFiles([
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_flow.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts',
    '../esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_config.ts',
  ]);
  assert.match(src, /resolveManualLayoutSketchHoverModuleContext/);
  assert.match(src, /extDrawers = readRecordList\(extra, 'extDrawers'\);/);
});

test('free-box content click stays on the free box even when a wardrobe module is behind it', async () => {
  const bundle = await readSourceFiles([
    '../esm/native/services/canvas_picking_click_manual_sketch_free_flow.ts',
    '../esm/native/services/canvas_picking_click_manual_sketch_free_content.ts',
  ]);
  assert.match(bundle, /if \(!hoverOk && foundModuleIndex !== null\) return false;/);
});

test('free-box external drawers use the box bottom directly and sketch hover blocks drawer collisions across internal and external stacks', async () => {
  const builderSrc = [
    await readSourceFiles([
      '../esm/native/builder/render_interior_sketch_ops.ts',
      '../esm/native/builder/render_interior_sketch_boxes.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents_parts.ts',
      '../esm/native/builder/render_interior_sketch_boxes_contents_drawers.ts',
    ]),
    await readSketchBoxFrontsBundle(),
  ].join('\n');
  assert.match(builderSrc, /const lo = innerBottomY \+ stackH \/ 2;/);
  const stackPreviewSrc = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_box_stack_preview.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_contracts.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_records.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_shared.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_context.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_overlay.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_drawers.ts',
    '../esm/native/services/canvas_picking_sketch_box_stack_preview_ext_drawers.ts',
  ]);
  assert.match(
    stackPreviewSrc,
    /if \(args\.activeSegment && itemSegment && itemSegment\.index !== args\.activeSegment\.index\) return false;/
  );
  assert.match(stackPreviewSrc, /blockers: buildManualLayoutSketchExternalDrawerBlockers\(/);
  assert.match(stackPreviewSrc, /blockers: buildManualLayoutSketchInternalDrawerBlockers\(/);
});

test('module sketch hover blocks collisions between internal and external drawer stacks', async () => {
  const bundle = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_module_stack_preview.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_preview_drawers.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts',
  ]);
  assert.match(bundle, /resolveManualLayoutSketchInternalDrawerPlacement\(/);
  assert.match(bundle, /buildManualLayoutSketchExternalDrawerBlockers\(/);
  assert.match(bundle, /buildManualLayoutSketchInternalDrawerBlockers\(/);
});

test('free-box sketch drawer clicks refresh hover state instead of dropping straight through to the module behind', async () => {
  const bundle = await readSourceFiles([
    '../esm/native/services/canvas_picking_click_manual_sketch_free_flow.ts',
    '../esm/native/services/canvas_picking_click_manual_sketch_free_content.ts',
    '../esm/native/services/canvas_picking_click_manual_sketch_free_box.ts',
  ]);
  const shared = await readSourceFiles(['../esm/native/services/canvas_picking_sketch_free_commit.ts']);
  const boxContentCommit = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_box_content_commit.ts',
    '../esm/native/services/canvas_picking_sketch_box_content_commit_drawers.ts',
  ]);
  assert.match(bundle, /commitSketchFreePlacementHoverRecord\(/);
  assert.match(shared, /let nextHover: RecordMap \| null = null;/);
  assert.match(boxContentCommit, /contentKind: 'drawers'/);
  assert.match(boxContentCommit, /contentKind: 'ext_drawers'/);
});

test('module sketch drawer click flow enforces cross-blocking and keeps immediate remove hover after commit', async () => {
  const shared = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_module_stack_commit.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_commit_contracts.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_commit_shared.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_commit_drawers.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_commit_ext_drawers.ts',
  ]);
  const stackApplySrc = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_module_stack_apply.ts',
  ]);
  assert.match(shared, /buildManualLayoutSketchExternalDrawerBlockers\(/);
  assert.match(shared, /buildManualLayoutSketchInternalDrawerBlockers\(/);
  assert.match(shared, /createManualLayoutSketchStackHoverRecord\(\{[\s\S]*kind: 'drawers'/);
  assert.match(shared, /createManualLayoutSketchStackHoverRecord\(\{[\s\S]*kind: 'ext_drawers'/);
  assert.match(stackApplySrc, /commitSketchModuleInternalDrawerStack\(\{/);
  assert.match(stackApplySrc, /commitSketchModuleExternalDrawerStack\(\{/);
});

test('module sketch external drawers preview reads the selector front envelope instead of the inner cavity only', async () => {
  const bundle = await readSourceFiles([
    '../esm/native/services/canvas_picking_sketch_module_stack_preview.ts',
    '../esm/native/services/canvas_picking_sketch_module_stack_preview_ext_drawers.ts',
  ]);
  assert.match(bundle, /function readSelectorFrontEnvelope\(hitSelectorObj: unknown\):/);
  assert.match(
    bundle,
    /const faceEnvelope = selectorFrontEnvelope \?\? readSelectorFrontEnvelope\(hitSelectorObj\);/
  );
  assert.match(bundle, /const outerW = Math\.max\(0\.08, faceEnvelope\?\.outerW \?\? innerW\);/);
  assert.match(bundle, /const frontPlaneZ =[\s\S]*faceEnvelope\?\.centerZ[\s\S]*faceEnvelope\?\.outerD/);
});
