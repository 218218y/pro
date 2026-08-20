import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveCellDimsFreeBoxHoverTarget,
  type CellDimsFreeBoxHoverCapabilities,
} from '../esm/native/services/canvas_picking_cell_dims_free_box_hover.ts';

function createFreeBoxConfig() {
  return {
    modulesConfiguration: [
      {
        sketchExtras: {
          boxes: [
            {
              id: 'free-a',
              freePlacement: true,
              absX: 0.25,
              absY: 0.7,
              widthM: 0.9,
              heightM: 0.8,
              depthM: 0.4,
            },
          ],
        },
      },
    ],
  };
}

function createFreeBoxAnchor() {
  return {
    userData: {
      __wpSketchFreePlacement: true,
      __wpSketchBoxId: 'free-a',
      __wpSketchModuleKey: 0,
      __wpStack: 'top',
    },
    children: [],
  };
}

function createWardrobe(anchor: unknown) {
  return {
    children: [anchor],
    traverse(visit: (node: unknown) => void) {
      visit(this);
      visit(anchor);
    },
  };
}

function createBaseCapabilities(overrides: Partial<CellDimsFreeBoxHoverCapabilities> = {}) {
  const anchor = createFreeBoxAnchor();
  const wardrobeGroup = createWardrobe(anchor);
  const capabilities: CellDimsFreeBoxHoverCapabilities = {
    readConfigSnapshot: () => createFreeBoxConfig(),
    readViewportRoots: () => ({ camera: { id: 'camera' }, wardrobeGroup }),
    measureWardrobeLocalBox: () => ({ width: 2, depth: 0.6, centerZ: 0 }),
    resolvePostClickIdentity: () => null,
    raycast: () => [],
    ...overrides,
  };
  return { anchor, wardrobeGroup, capabilities };
}

const raycaster = {
  setFromCamera() {},
  intersectObjects() {
    return [];
  },
};
const mouse = { x: 0, y: 0 };

test('Cell Dimensions Free Box hover resolves post-click geometry through injected capabilities only', () => {
  let raycastCalls = 0;
  const { anchor, wardrobeGroup, capabilities } = createBaseCapabilities({
    resolvePostClickIdentity: () => ({ moduleKey: 0, stackKey: 'top', freeBoxId: 'free-a' }),
    raycast: () => {
      raycastCalls += 1;
      return [];
    },
  });

  const result = resolveCellDimsFreeBoxHoverTarget({
    capabilities,
    ndcX: 0.1,
    ndcY: -0.2,
    raycaster,
    mouse,
  });

  assert.ok(result);
  assert.equal(raycastCalls, 0);
  assert.equal(result.anchorParent, wardrobeGroup);
  assert.equal(result.target.hitSelectorObj, anchor);
  assert.equal(result.target.hitModuleKey, 0);
  assert.equal(result.target.isBottom, false);
  assert.equal(result.selectorBox.centerX, 0.25);
  assert.equal(result.selectorBox.centerY, 0.7);
  assert.equal(result.selectorBox.width, 0.9);
  assert.equal(result.selectorBox.height, 0.8);
  assert.equal(result.selectorBox.depth, 0.4);
  assert.ok(Math.abs(result.selectorBox.centerZ + 0.1) <= 1e-12);
});

test('Cell Dimensions Free Box hover delegates scene hit discovery to the injected raycast capability', () => {
  const { anchor, capabilities } = createBaseCapabilities();
  let seenRaycastArgs: Record<string, unknown> | null = null;
  capabilities.raycast = args => {
    seenRaycastArgs = args as unknown as Record<string, unknown>;
    return [{ object: anchor }];
  };

  const result = resolveCellDimsFreeBoxHoverTarget({
    capabilities,
    ndcX: 0.33,
    ndcY: 0.44,
    raycaster,
    mouse,
  });

  assert.ok(result);
  assert.ok(seenRaycastArgs);
  assert.equal(seenRaycastArgs.ndcX, 0.33);
  assert.equal(seenRaycastArgs.ndcY, 0.44);
  assert.equal(seenRaycastArgs.recursive, true);
  assert.equal(Array.isArray(seenRaycastArgs.objects), true);
  assert.equal(result.target.hitSelectorObj, anchor);
});
