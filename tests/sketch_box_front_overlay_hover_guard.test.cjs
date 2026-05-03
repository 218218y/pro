const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test('sketch placement preview renderer supports explicit front overlays for sketch hover facades', () => {
  const src = [
    'esm/native/builder/render_preview_sketch_ops.ts',
    'esm/native/builder/render_preview_sketch_ops_factory.ts',
    'esm/native/builder/render_preview_sketch_ops_context.ts',
    'esm/native/builder/render_preview_sketch_ops_state.ts',
    'esm/native/builder/render_preview_sketch_ops_materials.ts',
    'esm/native/builder/render_preview_sketch_ops_meshes.ts',
    'esm/native/builder/render_preview_sketch_ops_apply.ts',
  ]
    .map(read)
    .join('\n');
  const pipeline = read('esm/native/builder/render_preview_sketch_pipeline.ts');
  const pipelineShared = read('esm/native/builder/render_preview_sketch_pipeline_shared.ts');
  const pipelineBoxContent = read('esm/native/builder/render_preview_sketch_pipeline_box_content.ts');
  const pipelineBoxContentDrawers = read(
    'esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts'
  );
  const pipelineBoxContentBox = read('esm/native/builder/render_preview_sketch_pipeline_box_content_box.ts');
  const previewBundle = `${src}
${pipeline}
${pipelineShared}
${pipelineBoxContent}
${pipelineBoxContentDrawers}
${pipelineBoxContentBox}`;
  assert.match(previewBundle, /const readFrontOverlay = \([\s\S]*fallbackT: number[\s\S]*\) => \{/);
  assert.match(
    previewBundle,
    /if \(ctx\.kind !== 'drawers'\) return false;[\s\S]*const frontOverlay = ctx\.readFrontOverlay\(/
  );
  assert.match(
    previewBundle,
    /if \(ctx\.kind !== 'ext_drawers'\) return false;[\s\S]*const frontOverlay = ctx\.readFrontOverlay\(/
  );
  assert.match(
    previewBundle,
    /if \(ctx\.kind !== 'storage'\) return false;[\s\S]*const frontOverlay = ctx\.readFrontOverlay\(/
  );
  assert.match(previewBundle, /if \(fillFront \|\| frontOverlay\) setBox\(/);
});

test('free-box sketch hover forwards front overlays for drawers, base, and remove-box previews', () => {
  const stackPreview = [
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
  const freeSurfaceContent = [
    'esm/native/services/canvas_picking_sketch_free_surface_preview_content.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts',
  ]
    .map(read)
    .join('\n');
  const freeSurfacePlacement = [
    'esm/native/services/canvas_picking_sketch_free_surface_preview_placement.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_placement_remove.ts',
  ]
    .map(read)
    .join('\n');
  assert.match(
    stackPreview,
    /const frontOverlay = resolveSketchBoxVisibleFrontOverlay\([\s\S]*segment: activeSegment/
  );
  assert.match(stackPreview, /kind: 'drawers',[\s\S]*\.\.\.buildSketchBoxFrontOverlayFields\(frontOverlay\)/);
  assert.match(
    freeSurfaceContent,
    /contentKind: 'base',[\s\S]*kind: 'storage',[\s\S]*frontOverlayZ: frontOverlay \? frontOverlay\.z : undefined/
  );
  assert.match(
    freeSurfacePlacement,
    /kind: 'box',[\s\S]*fillFront: !!frontOverlay,[\s\S]*frontOverlayZ: frontOverlay \? frontOverlay\.z : undefined/
  );
});

test('module sketch box remove hover forwards a front overlay so box removal can mark door facades', () => {
  const shared = read('esm/native/services/canvas_picking_sketch_module_surface_preview_shared.ts');
  const boxOverlay = read('esm/native/services/canvas_picking_sketch_module_surface_preview_box_overlay.ts');
  const box = read('esm/native/services/canvas_picking_sketch_module_surface_preview_box.ts');
  assert.match(shared, /canvas_picking_sketch_module_surface_preview_box_overlay\.js/);
  assert.match(boxOverlay, /resolveSketchBoxVisibleFrontOverlay\(/);
  assert.match(
    box,
    /kind: 'box',[\s\S]*fillFront: !!boxFrontOverlay,[\s\S]*frontOverlayZ: boxFrontOverlay \? boxFrontOverlay\.z : undefined/
  );
});
