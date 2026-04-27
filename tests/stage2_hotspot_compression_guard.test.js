import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const stateKernel = readSource('../esm/native/kernel/state_kernel_service.ts', import.meta.url);
const renderOwner = readSource('../esm/native/builder/render_ops.ts', import.meta.url);
const renderBundle = bundleSources(
  [
    '../esm/native/builder/render_ops.ts',
    '../esm/native/builder/render_carcass_ops.ts',
    '../esm/native/builder/render_carcass_ops_shared.ts',
    '../esm/native/builder/render_carcass_ops_shared_contracts.ts',
    '../esm/native/builder/render_carcass_ops_shared_readers.ts',
    '../esm/native/builder/render_carcass_ops_shared_runtime.ts',
    '../esm/native/builder/render_carcass_ops_shared_geometry.ts',
    '../esm/native/builder/render_carcass_ops_base.ts',
    '../esm/native/builder/render_carcass_ops_cornice.ts',
    '../esm/native/builder/render_door_ops.ts',
    '../esm/native/builder/render_door_ops_shared.ts',
    '../esm/native/builder/render_door_ops_sliding.ts',
    '../esm/native/builder/render_door_ops_hinged.ts',
    '../esm/native/builder/render_drawer_ops.ts',
    '../esm/native/builder/render_drawer_ops_shared.ts',
    '../esm/native/builder/render_drawer_ops_external.ts',
    '../esm/native/builder/render_drawer_ops_internal.ts',
  ],
  import.meta.url
);
const canvasOwner = readSource('../esm/native/services/canvas_picking_core.ts', import.meta.url);
const canvasBundle = bundleSources(
  [
    '../esm/native/services/canvas_picking_core.ts',
    '../esm/native/services/canvas_picking_core_helpers.ts',
    '../esm/native/services/canvas_picking_core_shared.ts',
    '../esm/native/services/canvas_picking_core_support.ts',
    '../esm/native/services/canvas_picking_core_support_errors.ts',
    '../esm/native/services/canvas_picking_core_support_meta.ts',
    '../esm/native/services/canvas_picking_core_support_numbers.ts',
    '../esm/native/services/canvas_picking_core_support_records.ts',
    '../esm/native/services/canvas_picking_core_runtime.ts',
    '../esm/native/services/canvas_picking_core_raycast.ts',
    '../esm/native/services/canvas_picking_door_part_helpers.ts',
    '../esm/native/services/canvas_picking_split_hover_helpers.ts',
    '../esm/native/services/canvas_picking_split_hover_bounds.ts',
    '../esm/native/services/canvas_picking_split_hover_preview_line.ts',
    '../esm/native/services/canvas_picking_split_hover_roots.ts',
    '../esm/native/services/canvas_picking_local_helpers.ts',
    '../esm/native/services/canvas_picking_projection_runtime.ts',
    '../esm/native/services/canvas_picking_projection_runtime_shared.ts',
    '../esm/native/services/canvas_picking_projection_runtime_box.ts',
    '../esm/native/services/canvas_picking_projection_runtime_plane.ts',
    '../esm/native/services/canvas_picking_sketch_box_runtime.ts',
    '../esm/native/services/canvas_picking_click_flow.ts',
    '../esm/native/services/canvas_picking_hover_flow.ts',
  ],
  import.meta.url
);

test('[stage2-hotspots] state-kernel DI helper hides legacy compat method names behind normalized key list', () => {
  assertLacksAll(
    assert,
    stateKernel,
    [/patchModuleConfig/, /patchSplitLowerModuleConfig/, /patchSplitLowerCornerCellConfig/],
    'stateKernel'
  );
  assert.match(stateKernel, /__STATE_KERNEL_METHOD_KEYS/);
});

test('[stage2-hotspots] render bundle keeps a thin owner and preserves canonical door/drawer render seams', () => {
  assertMatchesAll(
    assert,
    renderOwner,
    [/createBuilderRenderDoorOps/, /createBuilderRenderDrawerOps/],
    'render owner'
  );
  assertMatchesAll(
    assert,
    renderBundle,
    [
      /function applyCarcassOps\(/,
      /function applyCarcassBaseOps\(/,
      /function applyCarcassCorniceOps\(/,
      /function applySlidingDoorsOps\(/,
      /function applyHingedDoorsOps\(/,
      /function applyExternalDrawersOps\(/,
      /function applyInternalDrawersOps\(/,
    ],
    'render bundle'
  );
  assert.doesNotMatch(renderOwner, /function applySlidingDoorsOps\(/);
});

test('[stage2-hotspots] canvas picking bundle keeps a thin owner and canonical click/hover entrypoints', () => {
  assertMatchesAll(
    assert,
    canvasOwner,
    [/canvas_picking_core_helpers\.js/, /canvas_picking_click_flow\.js/, /canvas_picking_hover_flow\.js/],
    'canvas owner'
  );
  assertMatchesAll(
    assert,
    canvasBundle,
    [
      /export function __coreHandleCanvasClickNDC\(/,
      /export function __coreHandleCanvasHoverNDC\(/,
      /export function __wp_measureWardrobeLocalBox\(/,
      /export function __wp_tryCommitSketchFreePlacementFromHover\(/,
    ],
    'canvas bundle'
  );
  assert.doesNotMatch(canvasOwner, /function __coreHandleCanvasClickNDC\(/);
  assert.doesNotMatch(canvasOwner, /function __coreHandleCanvasHoverNDC\(/);
});
