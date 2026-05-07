import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const productDimensionTokenSource = 'esm/shared/wardrobe_dimension_tokens_shared.ts';

function assertUsesToken(rel, tokenName) {
  const src = read(rel);
  assert.match(src, new RegExp(`\\b${tokenName}\\b`), `${rel} should read ${tokenName}`);
}

test('[dimension tokens] visual content product dimensions are centralized', () => {
  const tokens = read(productDimensionTokenSource);
  assert.match(tokens, /export const CONTENT_VISUAL_DIMENSIONS = Object\.freeze\(\{/);

  for (const rel of [
    'esm/native/builder/visuals_contents_folded.ts',
    'esm/native/builder/visuals_contents_hanger.ts',
    'esm/native/builder/visuals_contents_hanging.ts',
  ]) {
    assertUsesToken(rel, 'CONTENT_VISUAL_DIMENSIONS');
  }
});

test('[dimension tokens] sketch box geometry and preview dimensions are centralized', () => {
  const tokens = read(productDimensionTokenSource);
  assert.match(tokens, /export const SKETCH_BOX_DIMENSIONS = Object\.freeze\(\{/);

  for (const rel of [
    'esm/native/services/canvas_picking_sketch_free_box_geometry_box.ts',
    'esm/native/services/canvas_picking_sketch_free_box_geometry_vertical.ts',
    'esm/native/services/canvas_picking_sketch_free_box_geometry_zone.ts',
    'esm/native/services/canvas_picking_sketch_free_box_placement_attach_candidates.ts',
    'esm/native/services/canvas_picking_sketch_box_runtime_geometry.ts',
    'esm/native/services/canvas_picking_sketch_box_door_preview.ts',
    'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_shelf.ts',
    'esm/native/services/canvas_picking_sketch_box_vertical_content_preview_rod.ts',
    'esm/native/services/canvas_picking_sketch_module_surface_preview_box.ts',
    'esm/native/services/canvas_picking_sketch_free_surface_preview_adornment_preview.ts',
    'esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts',
    'esm/native/builder/render_interior_sketch_boxes_contents_parts_rods.ts',
  ]) {
    assertUsesToken(rel, 'SKETCH_BOX_DIMENSIONS');
  }
});

test('[dimension tokens] library presets and saved preset defaults read canonical dimensions', () => {
  const tokens = read(productDimensionTokenSource);
  assert.match(tokens, /export const LIBRARY_PRESET_DIMENSIONS = Object\.freeze\(\{/);

  for (const rel of [
    'esm/native/features/library_preset/module_defaults.ts',
    'esm/native/features/library_preset/library_preset_flow_shared.ts',
    'esm/native/data/preset_models_data.ts',
  ]) {
    assertUsesToken(rel, 'LIBRARY_PRESET_DIMENSIONS');
  }

  const presetData = read('esm/native/data/preset_models_data.ts');
  assert.doesNotMatch(presetData, /doors: '4'/);
  assert.doesNotMatch(presetData, /width: '160'/);
  assert.doesNotMatch(presetData, /height: '240'/);
  assert.doesNotMatch(presetData, /depth: '55'/);
  assert.doesNotMatch(presetData, /cornerWidth: '120'/);
  assert.doesNotMatch(presetData, /cornerDoors: '3'/);
  assert.doesNotMatch(presetData, /drawersCount: '4'/);
});

test('[dimension tokens] interior presets and sketch drawer sizing read canonical dimensions', () => {
  const tokens = read(productDimensionTokenSource);
  assert.match(tokens, /presets: Object\.freeze\(\{/);
  assert.match(tokens, /heightTokenEpsilonCm:/);

  for (const rel of [
    'esm/native/features/interior_layout_presets/ops.ts',
    'esm/native/features/sketch_drawer_sizing.ts',
    'esm/native/features/modules_configuration/module_defaults.ts',
    'esm/native/features/stack_split/module_config.ts',
  ]) {
    assertUsesToken(
      rel,
      rel.includes('sketch_drawer_sizing') ? 'DRAWER_DIMENSIONS' : 'INTERIOR_FITTINGS_DIMENSIONS'
    );
  }

  const presetOps = read('esm/native/features/interior_layout_presets/ops.ts');
  assert.doesNotMatch(presetOps, /pushRod\((3\.5|3\.8|4\.6|2\.3|1\.3)/);
  assert.doesNotMatch(presetOps, /barrierH = 0\.5/);
  assert.doesNotMatch(presetOps, /zFrontOffset: -0\.06/);

  const drawerSizing = read('esm/native/features/sketch_drawer_sizing.ts');
  assert.doesNotMatch(drawerSizing, /\/ 100/);
  assert.doesNotMatch(drawerSizing, /HEIGHT_TOKEN_EPSILON = 0\.0001/);
});
