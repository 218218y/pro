import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveCellDimsFreeBoxHoverOp,
  resolveCellDimsFreeBoxHoverTarget,
  resolveCellDimsFreeBoxPreviewTargetBox,
  type CellDimsFreeBoxHoverCapabilities,
} from '../esm/native/services/canvas_picking_cell_dims_free_box_hover.ts';
import { captureCellDimsFreeBoxState } from '../esm/native/services/canvas_picking_cell_dims_free_box_state.ts';

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
    readFreeBoxState: (moduleKey, stackKey, boxId) =>
      captureCellDimsFreeBoxState({ configSnapshot: createFreeBoxConfig(), moduleKey, stackKey, boxId }),
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

test('Cell Dimensions Free Box state captures top/bottom scope and is detached from later config mutation', () => {
  const config = {
    modulesConfiguration: [
      {
        sketchExtras: {
          boxes: [
            {
              id: 'free-a',
              freePlacement: true,
              absX: 0.2,
              absY: 0.6,
              widthM: 0.8,
              heightM: 0.7,
              depthM: 0.35,
              specialDims: { baseWidthCm: 80, widthCm: 95 },
              hexCell: { enabled: true, protrusionCm: 12, doorWidthCm: 48 },
            },
          ],
        },
      },
    ],
    stackSplitLowerModulesConfiguration: [
      {
        sketchExtras: {
          boxes: [
            {
              id: 'free-a',
              freePlacement: true,
              absX: -0.3,
              absY: 0.4,
              widthM: 0.5,
              heightM: 0.45,
              depthM: 0.3,
            },
          ],
        },
      },
    ],
  };

  const top = captureCellDimsFreeBoxState({
    configSnapshot: config,
    moduleKey: 0,
    stackKey: 'top',
    boxId: 'free-a',
  });
  const bottom = captureCellDimsFreeBoxState({
    configSnapshot: config,
    moduleKey: 0,
    stackKey: 'bottom',
    boxId: 'free-a',
  });

  assert.ok(top);
  assert.ok(bottom);
  assert.equal(top.centerX, 0.2);
  assert.equal(bottom.centerX, -0.3);
  assert.deepEqual(top.width, { activeCm: 95, baseCm: 80 });
  assert.deepEqual(top.hexCell, { enabled: true, protrusionCm: 12, doorWidthCm: 48 });

  config.modulesConfiguration[0]!.sketchExtras.boxes[0]!.absX = 99;
  config.modulesConfiguration[0]!.sketchExtras.boxes[0]!.specialDims.widthCm = 120;
  config.modulesConfiguration[0]!.sketchExtras.boxes[0]!.hexCell.protrusionCm = 30;

  assert.equal(top.centerX, 0.2);
  assert.deepEqual(top.width, { activeCm: 95, baseCm: 80 });
  assert.deepEqual(top.hexCell, { enabled: true, protrusionCm: 12, doorWidthCm: 48 });
});

test('Cell Dimensions Free Box preview and hover op use the captured special-dimension snapshot', () => {
  const config = createFreeBoxConfig() as any;
  const box = config.modulesConfiguration[0].sketchExtras.boxes[0];
  Object.assign(box, {
    widthM: 0.95,
    specialDims: { baseWidthCm: 90, widthCm: 95 },
  });
  const state = captureCellDimsFreeBoxState({
    configSnapshot: config,
    moduleKey: 0,
    stackKey: 'top',
    boxId: 'free-a',
  });
  assert.ok(state);

  const selectorBox = {
    centerX: 0.25,
    centerY: 0.7,
    centerZ: -0.1,
    width: 0.95,
    height: 0.8,
    depth: 0.4,
  };
  const target = {
    intersects: [],
    hitModuleKey: 0,
    hitSelectorObj: null,
    isBottom: false,
    hitY: 0.7,
    info: { __wpCellDimsFreeBox: true, __wpCellDimsFreeBoxState: state },
    bottomY: 0.3,
    topY: 1.1,
    spanH: 0.8,
    woodThick: 0.018,
    innerW: 0.914,
    internalCenterX: 0.25,
    internalDepth: 0.382,
    internalZ: -0.1,
    backZ: -0.3,
    regularDepth: 0.4,
  } as const;

  const previewTargetBox = resolveCellDimsFreeBoxPreviewTargetBox(
    target,
    selectorBox,
    95,
    null,
    null,
    0.03,
    0.03,
    0.024
  );
  assert.ok(previewTargetBox);
  assert.equal(previewTargetBox.width, 0.9);
  assert.equal(
    resolveCellDimsFreeBoxHoverOp({
      target,
      selectorBox,
      applyW: 95,
      previewTargetBox,
    }),
    'remove'
  );

  box.specialDims.widthCm = 130;
  assert.deepEqual(state.width, { activeCm: 95, baseCm: 90 });
  assert.equal(
    resolveCellDimsFreeBoxHoverOp({
      target,
      selectorBox,
      applyW: 95,
      previewTargetBox,
    }),
    'remove'
  );
});
