import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePaintPreviewGroupBox } from '../esm/native/services/canvas_picking_generic_paint_hover_preview.ts';
import { collectPaintPreviewPartObjects } from '../esm/native/services/canvas_picking_generic_paint_hover_preview_objects.ts';
import {
  resolveCornerCorniceFrontObjectLocalPreview,
  resolveCornerCorniceGroupObjectPreview,
} from '../esm/native/services/canvas_picking_generic_paint_hover_preview_corner.ts';
import {
  resolvePaintPreviewGroupBoxFromAnchor,
  resolvePaintPreviewGroupBoxFromObjects,
} from '../esm/native/services/canvas_picking_generic_paint_hover_preview_bounds.ts';

function makeBoxObject(
  partId: string,
  args: {
    width: number;
    height: number;
    depth: number;
    x?: number;
    y?: number;
    z?: number;
  }
) {
  return {
    userData: { partId },
    children: [],
    geometry: {
      parameters: {
        width: args.width,
        height: args.height,
        depth: args.depth,
      },
      boundingBox: {
        min: { x: -args.width / 2, y: -args.height / 2, z: -args.depth / 2 },
        max: { x: args.width / 2, y: args.height / 2, z: args.depth / 2 },
      },
    },
    position: { x: args.x || 0, y: args.y || 0, z: args.z || 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

function createAppWithRegistry(registryMap: Record<string, unknown>) {
  return {
    services: {
      builder: {
        registry: {
          get(key: string) {
            return registryMap[key];
          },
        },
      },
    },
  };
}

test('paint preview object collection flattens registry arrays and deduplicates secondary scene matches', () => {
  const front = makeBoxObject('corner_cornice_front', { width: 0.6, height: 0.08, depth: 0.02, x: 0.2 });
  const left = makeBoxObject('corner_cornice_side_left', { width: 0.4, height: 0.08, depth: 0.02, x: -0.2 });
  const wardrobeGroup = {
    userData: { partId: 'root' },
    children: [front, left],
  };
  const App = createAppWithRegistry({
    corner_cornice_front: [front],
    corner_cornice_side_left: [left],
  });

  const objects = collectPaintPreviewPartObjects({
    App: App as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: ['corner_cornice_front', 'corner_cornice_side_left'],
  });

  assert.equal(objects.length, 2);
  assert.equal(objects[0], front);
  assert.equal(objects[1], left);
});

test('stack split decorative separator hover falls back to scene objects and previews slab plus lip as one target', () => {
  const slab = makeBoxObject('stack_split_separator', {
    width: 1.85,
    height: 0.032,
    depth: 0.63,
    y: 0.72,
  });
  const lip = makeBoxObject('stack_split_separator', {
    width: 1.85,
    height: 0.038,
    depth: 0.014,
    y: 0.7,
    z: 0.31,
  });
  const wardrobeGroup = {
    userData: { partId: 'root' },
    children: [slab, lip],
  };
  const App = createAppWithRegistry({});

  const objects = collectPaintPreviewPartObjects({
    App: App as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: ['stack_split_separator'],
  });

  assert.equal(objects.length, 2);
  assert.equal(objects[0], slab);
  assert.equal(objects[1], lip);

  const preview = resolvePaintPreviewGroupBox({
    App: App as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: ['stack_split_separator'],
    anchorObject: slab as never,
    anchorParent: wardrobeGroup as never,
  });

  assert.equal(preview?.kind, 'object_boxes');
  assert.equal(preview?.previewObjects?.length, 2);
  assert.ok((preview?.width || 0) >= 1.85);
  assert.ok((preview?.depth || 0) >= 0.63);
});

test('corner cornice front preview picks the nearest registered object to the clicked anchor object', () => {
  const anchorObject = makeBoxObject('corner_cornice_front', {
    width: 0.3,
    height: 0.08,
    depth: 0.02,
    x: 0.05,
  });
  const near = makeBoxObject('corner_cornice_front', { width: 0.3, height: 0.08, depth: 0.02, x: 0.1 });
  const far = makeBoxObject('corner_cornice_front', { width: 0.3, height: 0.08, depth: 0.02, x: 0.9 });

  const preview = resolveCornerCorniceFrontObjectLocalPreview({
    App: {} as never,
    wardrobeGroup: { children: [] } as never,
    partKeys: ['corner_cornice_front'],
    objects: [far as never, near as never],
    anchorObject: anchorObject as never,
  });

  assert.ok(preview);
  assert.equal(preview?.anchor, near);
  assert.ok(Math.abs((preview?.woodThick || 0) - 0.02) <= 1e-9);
});

test('corner cornice group preview uses oriented object-box mode across all visible preview objects', () => {
  const front = makeBoxObject('corner_cornice_front', { width: 0.6, height: 0.08, depth: 0.02 });
  const right = makeBoxObject('corner_cornice_side_right', { width: 0.5, height: 0.08, depth: 0.018 });
  const wardrobeGroup = { children: [] };

  const preview = resolveCornerCorniceGroupObjectPreview({
    wardrobeGroup: wardrobeGroup as never,
    partKeys: ['corner_cornice_front', 'corner_cornice_side_right'],
    objects: [front as never, right as never],
    anchorObject: front as never,
  });

  assert.equal(preview?.kind, 'object_boxes');
  assert.equal(preview?.previewObjects?.length, 2);
  assert.ok(Math.abs((preview?.woodThick || 0) - 0.018) <= 1e-9);
});

test('paint preview bounds resolve grouped object extents and anchor object boxes through the canonical owners', () => {
  const left = makeBoxObject('body_left', { width: 0.2, height: 1.8, depth: 0.55, x: -0.5 });
  const right = makeBoxObject('body_right', { width: 0.2, height: 1.8, depth: 0.55, x: 0.5 });
  const wardrobeGroup = { children: [] };

  const grouped = resolvePaintPreviewGroupBoxFromObjects({
    App: {} as never,
    wardrobeGroup: wardrobeGroup as never,
    objects: [left as never, right as never],
  });
  const fallback = resolvePaintPreviewGroupBoxFromAnchor({
    App: {} as never,
    wardrobeGroup: wardrobeGroup as never,
    anchorObject: left as never,
    anchorParent: wardrobeGroup as never,
  });

  assert.ok(grouped);
  assert.ok(fallback);
  assert.ok(Math.abs((grouped?.width || 0) - 1.2) <= 1e-9);
  assert.ok(Math.abs((grouped?.centerX || 0) - 0) <= 1e-9);
  assert.ok(Math.abs((fallback?.width || 0) - 0.2) <= 1e-9);
  assert.ok(Math.abs((fallback?.woodThick || 0) - 0.05) <= 1e-9);
});

test('paint preview uses oriented object boxes for corner wing and pentagon plinth paint targets', () => {
  const wingPlinth = makeBoxObject('corner_plinth_c1', {
    width: 0.7,
    height: 0.1,
    depth: 0.48,
    x: 0.35,
    y: 0.05,
    z: -0.24,
  });
  const blindPlinth = makeBoxObject('corner_plinth_blind', {
    width: 0.18,
    height: 0.1,
    depth: 0.48,
    x: 0.09,
    y: 0.05,
    z: -0.24,
  });
  const pentagonPlinth = makeBoxObject('corner_pent_plinth', {
    width: 0.8,
    height: 0.1,
    depth: 0.45,
    x: -0.4,
    y: 0.05,
    z: 0.42,
  });
  const wardrobeGroup = {
    userData: { partId: 'root' },
    children: [wingPlinth, blindPlinth, pentagonPlinth],
  };
  const App = createAppWithRegistry({});

  const wingPreview = resolvePaintPreviewGroupBox({
    App: App as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: ['corner_plinth'],
    anchorObject: wingPlinth as never,
    anchorParent: wardrobeGroup as never,
  });
  const pentagonPreview = resolvePaintPreviewGroupBox({
    App: App as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: ['corner_pent_plinth'],
    anchorObject: pentagonPlinth as never,
    anchorParent: wardrobeGroup as never,
  });

  assert.equal(wingPreview?.kind, 'object_boxes');
  assert.deepEqual(wingPreview?.previewObjects, [wingPlinth, blindPlinth]);
  assert.equal(pentagonPreview?.kind, 'object_boxes');
  assert.deepEqual(pentagonPreview?.previewObjects, [pentagonPlinth]);
});

test('paint preview object collection maps corner shell material keys back to visible wing roof and floor objects', () => {
  const roof = makeBoxObject('corner_wing_ceil', { width: 1.2, height: 0.04, depth: 0.55, y: 2 });
  const cellRoof = makeBoxObject('corner_cell_top_c1', {
    width: 0.6,
    height: 0.04,
    depth: 0.5,
    x: 0.3,
    y: 1.9,
  });
  const floor = makeBoxObject('corner_floor_c1', { width: 0.6, height: 0.04, depth: 0.5, x: 0.3 });
  const side = makeBoxObject('corner_wing_side_right', { width: 0.04, height: 2, depth: 0.55, x: 0.6 });
  const unrelated = makeBoxObject('corner_wing_back_c1', { width: 0.6, height: 2, depth: 0.005, z: -0.6 });
  const wardrobeGroup = {
    userData: { partId: 'root' },
    children: [roof, cellRoof, floor, side, unrelated],
  };

  const objects = collectPaintPreviewPartObjects({
    App: createAppWithRegistry({}) as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: ['corner_ceil', 'corner_floor', 'corner_wing_side_right'],
  });

  assert.deepEqual(objects, [roof, cellRoof, floor, side]);
});

test('paint preview object collection keeps stacked corner shell frames scoped to the requested stack', () => {
  const topRoof = makeBoxObject('corner_wing_ceil', { width: 1.2, height: 0.04, depth: 0.55, y: 2.2 });
  const bottomRoof = makeBoxObject('corner_wing_ceil', {
    width: 1.2,
    height: 0.04,
    depth: 0.55,
    y: 1.0,
  });
  const topFloor = makeBoxObject('corner_floor_c1', { width: 0.6, height: 0.04, depth: 0.5, y: 1.2 });
  const bottomFloor = makeBoxObject('corner_floor_c1', {
    width: 0.6,
    height: 0.04,
    depth: 0.5,
    y: 0.02,
  });
  const topSide = makeBoxObject('corner_wing_side_right', {
    width: 0.04,
    height: 1,
    depth: 0.55,
    y: 1.7,
  });
  const bottomSide = makeBoxObject('corner_wing_side_right', {
    width: 0.04,
    height: 1,
    depth: 0.55,
    y: 0.5,
  });

  (topRoof.userData as Record<string, unknown>).__wpStack = 'top';
  (topFloor.userData as Record<string, unknown>).__wpStack = 'top';
  (topSide.userData as Record<string, unknown>).__wpStack = 'top';
  (bottomRoof.userData as Record<string, unknown>).__wpStack = 'bottom';
  (bottomFloor.userData as Record<string, unknown>).__wpStack = 'bottom';
  (bottomSide.userData as Record<string, unknown>).__wpStack = 'bottom';

  const wardrobeGroup = {
    userData: { partId: 'root' },
    children: [topRoof, bottomRoof, topFloor, bottomFloor, topSide, bottomSide],
  };

  const topObjects = collectPaintPreviewPartObjects({
    App: createAppWithRegistry({}) as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: ['corner_ceil', 'corner_floor', 'corner_wing_side_right'],
  });
  const bottomObjects = collectPaintPreviewPartObjects({
    App: createAppWithRegistry({}) as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: ['lower_corner_ceil', 'lower_corner_floor', 'lower_corner_wing_side_right'],
  });

  assert.deepEqual(topObjects, [topRoof, topFloor, topSide]);
  assert.deepEqual(bottomObjects, [bottomRoof, bottomFloor, bottomSide]);
});
