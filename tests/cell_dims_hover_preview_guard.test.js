import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { bundleSources, assertMatchesAll } from './_source_bundle.js';

const CORE = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_hover_flow_nonsplit_preview_interior.ts'
);
const SEAM = path.resolve(process.cwd(), 'esm/native/services/canvas_picking_hover_preview_modes.ts');
const SRC = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts'
);
const INPUTS = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_inputs.ts'
);
const STATE = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_state.ts'
);
const TARGET = path.resolve(
  process.cwd(),
  'esm/native/services/canvas_picking_hover_preview_modes_cell_dims_target.ts'
);

test('[cell-dims-hover] preview resolves the future target box instead of painting the current door face', () => {
  const seam = fs.readFileSync(SEAM, 'utf8');
  const src = fs.readFileSync(SRC, 'utf8');
  const core = fs.readFileSync(CORE, 'utf8');
  const inputs = fs.readFileSync(INPUTS, 'utf8');
  const state = fs.readFileSync(STATE, 'utf8');
  const target = fs.readFileSync(TARGET, 'utf8');
  assert.match(core, /tryHandleCellDimsHoverPreview\(/);
  assert.match(
    seam,
    /export \{ tryHandleCellDimsHoverPreview \} from '\.\/canvas_picking_hover_preview_modes_cell_dims\.js';/
  );
  assert.match(src, /resolveCellDimsTargetBox\(App, target, selectorBox, applyW, applyH, applyD\)/);
  assert.match(inputs, /export function readLinearSelectorBoundaryInsetsCm\(/);
  assert.match(inputs, /export function readCellDimsCurrentWidthInputCm\(/);
  assert.match(inputs, /export function toCellDimsPreviewWidthM\(/);
  assert.match(inputs, /export function readCellDimsCurrentHeightInputCm\(/);
  assert.match(inputs, /export function toCellDimsPreviewHeightM\(/);
  assert.match(state, /export function readCellDimsSpecialDims\(/);
  assert.match(state, /export function resolveCellDimsPreviewState\(/);
  assert.match(target, /export function resolveCellDimsTargetBox\(/);
  assert.match(
    target,
    /const\s+currentMinX\s*=\s*Number\(selectorBox\.centerX\)\s*-\s*Number\(selectorBox\.width\)\s*\/\s*2/
  );
  assert.match(
    target,
    /const\s+currentBackZ\s*=\s*Number\(selectorBox\.centerZ\)\s*-\s*Number\(selectorBox\.depth\)\s*\/\s*2/
  );
  assert.match(
    target,
    /const\s+targetWm\s*=\s*toCellDimsPreviewWidthM\(App,\s*target,\s*previewState\.targetWcm\)/
  );
  assert.match(
    target,
    /const\s+targetHm\s*=\s*toCellDimsPreviewHeightM\(previewState\.currentBottomYm,\s*previewState\.targetHcm\)/
  );
  assert.match(target, /centerX:\s*currentMinX\s*\+\s*targetWm\s*\/\s*2/);
  assert.match(target, /centerY:\s*currentBottomYm\s*\+\s*targetHm\s*\/\s*2/);
  assert.match(target, /centerZ:\s*currentBackZ\s*\+\s*targetDm\s*\/\s*2/);
  assert.match(
    src,
    /const\s+previewTargetBox\s*=\s*resolveCellDimsTargetBox\(App,\s*target,\s*selectorBox,\s*applyW,\s*applyH,\s*applyD\)/
  );

  const localHelpersCellDims = fs.readFileSync(
    path.resolve(process.cwd(), 'esm/native/services/canvas_picking_local_helpers_cell_dims.ts'),
    'utf8'
  );
  const projectionRuntime = bundleSources(
    [
      '../esm/native/services/canvas_picking_projection_runtime.ts',
      '../esm/native/services/canvas_picking_projection_runtime_shared.ts',
      '../esm/native/services/canvas_picking_projection_runtime_box.ts',
      '../esm/native/services/canvas_picking_projection_runtime_box_shared.ts',
      '../esm/native/services/canvas_picking_projection_runtime_box_object.ts',
      '../esm/native/services/canvas_picking_projection_runtime_box_wardrobe_scene.ts',
      '../esm/native/services/canvas_picking_projection_runtime_box_wardrobe_fallback.ts',
      '../esm/native/services/canvas_picking_projection_runtime_plane.ts',
    ],
    import.meta.url
  );
  assert.match(
    projectionRuntime,
    /const\s+params\s*=\s*getRecordProp\(getProp\(o, 'geometry'\), 'parameters'\)/
  );
  assert.match(projectionRuntime, /const\s+scale\s*=\s*getRecordProp\(o, 'scale'\)/);
  assert.match(
    projectionRuntime,
    /const\s+scaleX\s*=\s*Math\.abs\(__readFiniteNumberProp\(scale, 'x'\) \?\? 1\)/
  );
  assert.match(
    projectionRuntime,
    /return\s*\{\s*centerX,\s*centerY,\s*centerZ,\s*width,\s*height,\s*depth\s*\};/
  );
  assert.match(projectionRuntime, /const\s+worldToLocal\s*=\s*__getWorldToLocalFn\(parent\)/);
  assert.match(projectionRuntime, /const\s+corners\s*=\s*\[/);
  assert.match(projectionRuntime, /new three\.Vector3\(min\.x, min\.y, min\.z\)/);
  assert.match(projectionRuntime, /worldToLocal\(corner\)/);
  assert.match(projectionRuntime, /width:\s*Math\.max\(0,\s*localMaxX\s*-\s*localMinX\)/);
  assert.match(projectionRuntime, /depth:\s*Math\.max\(0,\s*localMaxZ\s*-\s*localMinZ\)/);
  assert.match(localHelpersCellDims, /function\s+__wp_readLinearSelectorWidthInputCm\(/);
  assert.match(
    localHelpersCellDims,
    /let\s+curW\s*=\s*__wp_readLinearSelectorWidthInputCm\(App,\s*target,\s*selectorBox\)/
  );
  assert.ok(src.includes('fillFront: true'));
  assert.ok(src.includes('overlayThroughScene: true'));
});

const RENDER_PREVIEW_BUNDLE = bundleSources(
  [
    '../esm/native/builder/render_preview_ops.ts',
    '../esm/native/builder/render_preview_sketch_ops.ts',
    '../esm/native/builder/render_preview_sketch_ops_factory.ts',
    '../esm/native/builder/render_preview_sketch_ops_context.ts',
    '../esm/native/builder/render_preview_sketch_ops_state.ts',
    '../esm/native/builder/render_preview_sketch_ops_materials.ts',
    '../esm/native/builder/render_preview_sketch_ops_meshes.ts',
    '../esm/native/builder/render_preview_sketch_ops_apply.ts',
    '../esm/native/builder/render_preview_sketch_shared.ts',
    '../esm/native/builder/render_preview_sketch_pipeline.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_shared.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_object_boxes.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_box_content.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_box_content_drawers.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_box_content_box.ts',
    '../esm/native/builder/render_preview_sketch_pipeline_linear.ts',
  ],
  import.meta.url
);

test('[cell-dims-hover] box preview can render as a full 3d frame and not only the front face', () => {
  assertMatchesAll(
    assert,
    RENDER_PREVIEW_BUNDLE,
    [
      /createBuilderRenderPreviewOps\(/,
      /createBuilderRenderSketchPlacementPreviewOps\(/,
      /const fillFront = ctx\.input\.fillFront === true;/,
      /const fillBack = ctx\.input\.fillBack === true;/,
      /const overlayThroughScene = ctx\.input\.overlayThroughScene === true;/,
      /matBoxOverlay: createSketchMeshMaterial\(THREE, shared, 0xfbbf24, 0\.3, false\)/,
      /lineBoxOverlay: createSketchLineMaterial\(THREE, shared, 0xfbbf24, 0\.98, false\)/,
      /renderOrder: overlayThroughScene \? 10020 : 9999,/,
      /setBox\(ctx\.boxTop, ctx\.w, thickness, ctx\.d, ctx\.x, yTop, ctx\.z\);/,
      /setBox\(ctx\.boxBottom, ctx\.w, thickness, ctx\.d, ctx\.x, yBot, ctx\.z\);/,
      /setBox\(ctx\.boxLeft, thickness, sideH, ctx\.d, xL, ctx\.y, ctx\.z\);/,
      /setBox\(ctx\.boxRight, thickness, sideH, ctx\.d, xR, ctx\.y, ctx\.z\);/,
      /const frontX = frontOverlay \? frontOverlay\.x : ctx\.x;/,
      /const frontY = frontOverlay \? frontOverlay\.y : ctx\.y;/,
      /const frontW = frontOverlay \? frontOverlay\.w : ctx\.w;/,
      /const frontH = frontOverlay \? frontOverlay\.h : boxH;/,
      /setBox\(ctx\.shelfA, frontW, frontH, frontFillT, frontX, frontY, frontZ\);/,
    ],
    'render preview bundle'
  );
});
