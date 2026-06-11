import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
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

test('module sketch boxes preserve optional width/depth overrides while keeping no-base default', () => {
  const renderVisuals = readSketchVisualsBundle();
  const hoverModule = [
    read('esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context.ts'),
    read('esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_base.ts'),
    read('esm/native/services/canvas_picking_manual_layout_sketch_hover_module_context_config.ts'),
  ].join('\n');
  const clickMode = [
    'esm/native/services/canvas_picking_sketch_module_surface_commit.ts',
    'esm/native/services/canvas_picking_sketch_module_surface_commit_flow.ts',
    'esm/native/services/canvas_picking_sketch_module_surface_commit_box.ts',
    'esm/native/services/canvas_picking_sketch_module_surface_commit_shared.ts',
  ]
    .map(read)
    .join('\n');

  assert.match(renderVisuals, /if \(raw === 'plinth'\) return 'plinth';\s*return 'none';/);
  assert.match(
    hoverModule,
    /const widthCm = boxSpec \? Number\(readRecordValue\(boxSpec, 'widthCm'\)\) : NaN;/
  );
  assert.match(
    hoverModule,
    /const depthCm = boxSpec \? Number\(readRecordValue\(boxSpec, 'depthCm'\)\) : NaN;/
  );
  assert.match(
    hoverModule,
    /if \(Number\.isFinite\(widthCm\) && widthCm > 0\) boxWidthOverrideM = widthCm \/ 100;/
  );
  assert.match(
    hoverModule,
    /if \(Number\.isFinite\(depthCm\) && depthCm > 0\) boxDepthOverrideM = depthCm \/ 100;/
  );
  assert.match(clickMode, /const widthCm = readNumber\(spec \? spec\.widthCm : null\);/);
  assert.match(clickMode, /const depthCm = readNumber\(spec \? spec\.depthCm : null\);/);
  assert.match(clickMode, /boxWM: widthCm != null && widthCm > 0 \? widthCm \/ 100 : null,/);
  assert.match(clickMode, /boxDM: depthCm != null && depthCm > 0 \? depthCm \/ 100 : null,/);
});

test('free-box content commit stays centralized while preserving click safeguards', () => {
  const shared = [
    read('esm/native/services/canvas_picking_sketch_box_content_commit.ts'),
    read('esm/native/services/canvas_picking_sketch_box_content_commit_shared.ts'),
    read('esm/native/services/canvas_picking_sketch_box_content_commit_drawers.ts'),
  ].join('\n');
  const helpers = [
    read('esm/native/services/canvas_picking_sketch_box_runtime.ts'),
    read('esm/native/services/canvas_picking_sketch_box_runtime_commit.ts'),
  ].join('\n');
  const freeClick = [
    read('esm/native/services/canvas_picking_click_manual_sketch_free_flow.ts'),
    read('esm/native/services/canvas_picking_click_manual_sketch_free_content.ts'),
    read('esm/native/services/canvas_picking_click_manual_sketch_free_box.ts'),
    read('esm/native/services/canvas_picking_click_manual_sketch_free_recent.ts'),
  ].join('\n');
  assert.match(shared, /contentKind: 'drawers'/);
  assert.match(shared, /contentKind: 'ext_drawers'/);
  assert.match(shared, /drawerCount,/);
  assert.match(shared, /op: 'add'/);
  assert.match(shared, /op: 'remove'/);
  assert.match(
    helpers,
    /(?:const commit = (?:deps\.)?commitSketchFreePlacementHoverRecord\(\{|commitSketchFreePlacementHoverRecord\()/
  );
  assert.match(
    freeClick,
    /(?:const commit = (?:deps\.)?commitSketchFreePlacementHoverRecord\(\{|commitSketchFreePlacementHoverRecord\()/
  );
  assert.match(
    freeClick,
    /function isRecentModuleScopedSketchHover\(hover: unknown, tool: string\): boolean/
  );
  assert.match(freeClick, /if \(isRecentModuleScopedSketchHover\(recentHover, mt\)\) return false;/);
});
