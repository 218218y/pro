import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

function readSketchVisualsBundle() {
  return [
    read('esm/native/builder/render_interior_sketch_visuals.ts'),
    read('esm/native/builder/render_interior_sketch_visuals_adornments.ts'),
    read('esm/native/builder/render_interior_sketch_visuals_adornments_normalize.ts'),
    read('esm/native/builder/render_interior_sketch_visuals_adornments_contracts.ts'),
    read('esm/native/builder/render_interior_sketch_visuals_adornments_runtime.ts'),
    read('esm/native/builder/render_interior_sketch_visuals_adornments_miter.ts'),
    read('esm/native/builder/render_interior_sketch_visuals_adornments_base.ts'),
    read('esm/native/builder/render_interior_sketch_visuals_adornments_cornice.ts'),
    read('esm/native/builder/render_interior_sketch_visuals_adornments_cornice_segments.ts'),
    read('esm/native/builder/render_interior_sketch_visuals_adornments_cornice_profile.ts'),
    read('esm/native/builder/render_interior_sketch_visuals_adornments_cornice_wave.ts'),
    read('esm/native/builder/render_interior_sketch_visuals_door_state.ts'),
  ].join('\n');
}

function readSketchBoxFrontsBundle() {
  return [
    read('esm/native/builder/render_interior_sketch_boxes_fronts.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_support.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_contracts.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visuals.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_materials.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_routes.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_core.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_doors.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers.ts'),
  ].join('\n');
}

test('interior sketch extras builder forwards cfg for sketch box door special paint resolution', () => {
  const interiorPipeline = [
    read('esm/native/builder/interior_pipeline.ts'),
    read('esm/native/builder/interior_pipeline_shared.ts'),
    read('esm/native/builder/interior_pipeline_custom.ts'),
    read('esm/native/builder/interior_pipeline_preset.ts'),
  ].join('\n');
  const sketchVisuals = readSketchVisualsBundle();
  const moduleLoop = [
    read('esm/native/builder/module_loop_pipeline_module.ts'),
    read('esm/native/builder/module_loop_pipeline_module_contents.ts'),
  ].join('\n');
  const noMainHost = read('esm/native/builder/build_no_main_sketch_host.ts');

  assert.match(interiorPipeline, /cfg:\s*input\.cfg/);
  assert.match(interiorPipeline, /config:\s*input\.config/);
  assert.match(interiorPipeline, /doorStyle:\s*input\.doorStyle/);
  assert.match(moduleLoop, /doorStyle:\s*runtime\.doorStyle/);
  assert.match(noMainHost, /doorStyle:\s*readStringProp\(readRecord\(args\.ui\), 'doorStyle'\) \|\| ''/);
  assert.match(sketchVisuals, /const cfg = (?:asRecord|asValueRecord)\(input\.cfg\);/);
  assert.match(sketchVisuals, /const doorSpecialMap = readNullableStringMap\(cfg\?\.doorSpecialMap\);/);
  assert.match(sketchVisuals, /const curtainMap = readUnknownMap\(cfg\?\.curtainMap\);/);
  assert.match(sketchVisuals, /const mirrorLayoutMap = readUnknownMap\(cfg\?\.mirrorLayoutMap\);/);
  const sketchFronts = readSketchBoxFrontsBundle();
  assert.match(sketchFronts, /inputRec\?\.doorStyle \\?\\?/);
});
