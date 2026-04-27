import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveInteriorHoverTarget } from '../esm/native/services/canvas_picking_hover_targets.ts';

function toModuleKey(value: unknown) {
  if (typeof value === 'number') return value;
  if (value === 'corner') return 'corner';
  if (typeof value === 'string' && /^corner:\d+$/.test(value)) return value as `corner:${number}`;
  return null;
}

function createSelectorObject(moduleIndex: unknown, stack: 'top' | 'bottom', box = {}) {
  return {
    userData: {
      isModuleSelector: true,
      moduleIndex,
      __wpStack: stack,
    },
    geometry: {
      parameters: {
        width: 1,
        height: 2,
        depth: 0.6,
        ...box,
      },
    },
    position: { x: 0.5, y: 1, z: -0.1 },
    children: [],
    parent: null as any,
  } as any;
}

function createApp() {
  return {
    render: {
      wardrobeGroup: null as any,
    },
    services: {
      runtimeCache: {
        internalGridMap: Object.create(null),
        internalGridMapSplitBottom: Object.create(null),
      },
    },
  } as any;
}

test('interior hover target resolves selector hits into canonical bounds and internal metrics', () => {
  const App = createApp();
  const selectorObj = createSelectorObject(2, 'top');
  App.render.wardrobeGroup = { children: [selectorObj] };
  App.services.runtimeCache.internalGridMap['2'] = {
    effectiveBottomY: 0,
    effectiveTopY: 2,
    gridDivisions: 4,
    woodThick: 0.02,
  };

  const target = resolveInteriorHoverTarget({
    App,
    raycaster: {} as any,
    mouse: { x: 0, y: 0 } as any,
    ndcX: 0.15,
    ndcY: -0.2,
    getViewportRoots: () => ({ camera: {}, wardrobeGroup: App.render.wardrobeGroup }),
    raycastReuse: () => [{ object: selectorObj, point: { x: 0.4, y: 1.25, z: -0.1 } } as any],
    isViewportRoot: () => false,
    toModuleKey,
    projectWorldPointToLocal: (_App, point) => ({ x: 0.4, y: Number((point as any)?.y ?? 0), z: -0.1 }),
    measureObjectLocalBox: () => ({
      centerX: 0.5,
      centerY: 1,
      centerZ: -0.1,
      width: 1,
      height: 2,
      depth: 0.6,
    }),
  });

  assert.ok(target);
  assert.equal(target?.hitModuleKey, 2);
  assert.equal(target?.hitSelectorObj, selectorObj);
  assert.equal(target?.isBottom, false);
  assert.equal(target?.hitY, 1.25);
  assert.equal(target?.bottomY, 0);
  assert.equal(target?.topY, 2);
  assert.equal(target?.spanH, 2);
  assert.equal(target?.woodThick, 0.02);
  assert.ok(Math.abs((target?.innerW ?? 0) - 0.96) < 1e-9);
  assert.equal(target?.internalCenterX, 0.5);
  assert.ok(Math.abs((target?.internalDepth ?? 0) - 0.55) < 1e-9);
  assert.ok(Math.abs((target?.internalZ ?? 0) - -0.115) < 1e-9);
  assert.equal(target?.regularDepth, 0.45);
});

test('interior hover target recovers the selector object from the wardrobe tree for fallback hits', () => {
  const App = createApp();
  const selectorObj = createSelectorObject('corner:3', 'bottom');
  const fallbackObj = {
    userData: {
      moduleIndex: 'corner:3',
      __wpStack: 'bottom',
    },
    geometry: { parameters: { width: 0.8, height: 1.8, depth: 0.5 } },
    position: { x: -0.2, y: 0.9, z: 0.05 },
    parent: null,
  } as any;
  const wardrobeGroup = {
    children: [{ children: [selectorObj] }],
  } as any;
  selectorObj.parent = wardrobeGroup.children[0];
  App.render.wardrobeGroup = wardrobeGroup;
  App.services.runtimeCache.internalGridMapSplitBottom['corner:3'] = {
    effectiveBottomY: 0,
    effectiveTopY: 1.8,
    gridDivisions: 3,
    woodThick: 0.018,
  };

  const target = resolveInteriorHoverTarget({
    App,
    raycaster: {} as any,
    mouse: { x: 0, y: 0 } as any,
    ndcX: -0.1,
    ndcY: 0.3,
    getViewportRoots: () => ({ camera: {}, wardrobeGroup }),
    raycastReuse: () => [{ object: fallbackObj, point: { x: -0.2, y: 0.75, z: 0.05 } } as any],
    isViewportRoot: (_App, node) => node === wardrobeGroup,
    toModuleKey,
    projectWorldPointToLocal: (_App, point) => ({ x: -0.2, y: Number((point as any)?.y ?? 0), z: 0.05 }),
    measureObjectLocalBox: (_App, obj) =>
      obj === selectorObj
        ? {
            centerX: 0.5,
            centerY: 1,
            centerZ: -0.1,
            width: 1,
            height: 2,
            depth: 0.6,
          }
        : null,
  });

  assert.ok(target);
  assert.equal(target?.hitModuleKey, 'corner:3');
  assert.equal(target?.hitSelectorObj, selectorObj);
  assert.equal(target?.isBottom, true);
  assert.equal(target?.hitY, 0.75);
  assert.equal(target?.bottomY, 0);
  assert.equal(target?.topY, 1.8);
});
