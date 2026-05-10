import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePaintPreviewGroupBox } from '../esm/native/services/canvas_picking_generic_paint_hover_preview.ts';
import { collectPaintPreviewPartObjects } from '../esm/native/services/canvas_picking_generic_paint_hover_preview_objects.ts';
import {
  resolveCornerCorniceFrontObjectLocalPreview,
  resolveCornerCorniceGroupObjectPreview,
} from '../esm/native/services/canvas_picking_generic_paint_hover_preview_corner.ts';
import {
  resolvePaintPreviewGroupBoxFromFallback,
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

test('paint preview object collection flattens registry arrays and deduplicates fallback scene matches', () => {
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
    fallbackObject: slab as never,
    fallbackParent: wardrobeGroup as never,
  });

  assert.equal(preview?.kind, 'object_boxes');
  assert.equal(preview?.previewObjects?.length, 2);
  assert.ok((preview?.width || 0) >= 1.85);
  assert.ok((preview?.depth || 0) >= 0.63);
});

test('corner cornice front preview picks the nearest registered object to the clicked fallback object', () => {
  const fallbackObject = makeBoxObject('corner_cornice_front', {
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
    fallbackObject: fallbackObject as never,
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
    fallbackObject: front as never,
  });

  assert.equal(preview?.kind, 'object_boxes');
  assert.equal(preview?.previewObjects?.length, 2);
  assert.ok(Math.abs((preview?.woodThick || 0) - 0.018) <= 1e-9);
});

test('paint preview bounds resolve grouped object extents and fallback object boxes through the canonical owners', () => {
  const left = makeBoxObject('body_left', { width: 0.2, height: 1.8, depth: 0.55, x: -0.5 });
  const right = makeBoxObject('body_right', { width: 0.2, height: 1.8, depth: 0.55, x: 0.5 });
  const wardrobeGroup = { children: [] };

  const grouped = resolvePaintPreviewGroupBoxFromObjects({
    App: {} as never,
    wardrobeGroup: wardrobeGroup as never,
    objects: [left as never, right as never],
  });
  const fallback = resolvePaintPreviewGroupBoxFromFallback({
    App: {} as never,
    wardrobeGroup: wardrobeGroup as never,
    fallbackObject: left as never,
    fallbackParent: wardrobeGroup as never,
  });

  assert.ok(grouped);
  assert.ok(fallback);
  assert.ok(Math.abs((grouped?.width || 0) - 1.2) <= 1e-9);
  assert.ok(Math.abs((grouped?.centerX || 0) - 0) <= 1e-9);
  assert.ok(Math.abs((fallback?.width || 0) - 0.2) <= 1e-9);
  assert.ok(Math.abs((fallback?.woodThick || 0) - 0.05) <= 1e-9);
});
