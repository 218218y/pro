import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCanvasPickingActionRoute } from '../esm/native/services/canvas_picking_click_route_actions.ts';

function createBoxObject(
  partId: string,
  args: { width?: number; height?: number; depth?: number; x?: number; y?: number; z?: number } = {}
) {
  return {
    type: 'Mesh',
    userData: { partId },
    material: { visible: true, opacity: 1 },
    children: [],
    parent: null as any,
    geometry: {
      parameters: {
        width: args.width ?? 0.6,
        height: args.height ?? 1.9,
        depth: args.depth ?? 0.55,
      },
    },
    position: {
      x: args.x ?? 0,
      y: args.y ?? 0,
      z: args.z ?? 0,
    },
    scale: { x: 1, y: 1, z: 1 },
  };
}

function createModeState() {
  return {
    __pm: 'paint',
    __isPaintMode: true,
    __isGrooveEditMode: false,
    __isSplitEditMode: false,
    __isLayoutEditMode: false,
    __isManualLayoutMode: false,
    __isBraceShelvesMode: false,
    __isCellDimsMode: false,
    __isExtDrawerEditMode: false,
    __isIntDrawerEditMode: false,
    __isDividerEditMode: false,
    __isHandleEditMode: false,
    __isHingeEditMode: false,
    __isRemoveDoorMode: false,
    __isDoorTrimMode: false,
  } as const;
}

test('paint click snaps to a nearby thin shelf when the direct hit is only the module selector', () => {
  const shelfPartId = 'module_shelf_0_g2';
  const applied: Record<string, unknown>[] = [];
  const maps: Record<string, Record<string, unknown>> = {
    individualColors: {},
    curtainMap: {},
    doorSpecialMap: {},
    doorStyleMap: {},
    mirrorLayoutMap: {},
  };

  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const shelf = createBoxObject(shelfPartId, { width: 1.1, height: 0.018, depth: 0.45, y: 0.8 });
  const selector = {
    type: 'Mesh',
    userData: { isModuleSelector: true, moduleIndex: 0 },
    material: { visible: true, opacity: 1 },
    children: [],
    parent: wardrobeGroup,
    position: { x: 0, y: 0.9, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
  shelf.parent = wardrobeGroup;
  wardrobeGroup.children.push(shelf, selector);

  const App = {
    store: {
      getState() {
        return { config: {}, ui: {}, mode: { primary: 'paint' }, runtime: {}, meta: {} };
      },
      patch() {
        return undefined;
      },
    },
    render: {
      camera: {},
      wardrobeGroup,
    },
    services: {
      tools: {
        getPaintColor() {
          return '#775533';
        },
      },
    },
    actions: {
      colors: {
        applyPaint(nextColors: Record<string, unknown>) {
          maps.individualColors = { ...nextColors };
          applied.push({ ...nextColors });
        },
      },
    },
    maps: {
      getMap(name: string) {
        return maps[name] || {};
      },
    },
  } as any;

  const handled = tryHandleCanvasPickingActionRoute({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: {} as never,
    mouse: {} as never,
    modeState: createModeState(),
    hitState: {
      intersects: [{ object: selector as never, point: { x: 0.1, y: 0.835, z: 0.03 } }],
      foundPartId: null,
      foundModuleIndex: 0,
      foundModuleStack: 'top',
      effectiveDoorId: null,
      foundDrawerId: null,
      primaryHitObject: selector as never,
      doorHitObject: null,
      doorHitGroup: null,
      primaryHitPoint: { x: 0.1, y: 0.835, z: 0.03 },
      doorHitPoint: null,
      moduleHitY: 0.835,
      doorHitY: null,
      primaryHitY: 0.835,
      hitIdentity: null,
    },
    moduleRefs: {
      __activeModuleKey: 0,
      __activeStack: 'top',
      __isBottomStack: false,
      __ensureConfigRefForKey: () => null,
      __patchConfigForKey: () => undefined,
      __getActiveConfigRef: () => null,
      __ensureCornerCellConfigRef: () => null,
    },
  });

  assert.equal(handled, true);
  assert.equal(applied.length, 1);
  assert.equal(applied[0]?.[shelfPartId], '#775533');
});

test('paint click uses the directly hit object stack instead of the globally active stack', () => {
  const applied: Record<string, unknown>[] = [];
  const maps: Record<string, Record<string, unknown>> = {
    individualColors: {},
    curtainMap: {},
    doorSpecialMap: {},
    doorStyleMap: {},
    mirrorLayoutMap: {},
  };

  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const upperFloor = createBoxObject('corner_floor', { width: 1.1, height: 0.018, depth: 0.45, y: 1.8 });
  (upperFloor.userData as Record<string, unknown>).__wpStack = 'top';
  (upperFloor.userData as Record<string, unknown>).__wpStackSplitUnifiedFrame = false;
  upperFloor.parent = wardrobeGroup;
  wardrobeGroup.children.push(upperFloor);

  const App = {
    store: {
      getState() {
        return { config: {}, ui: {}, mode: { primary: 'paint' }, runtime: {}, meta: {} };
      },
      patch() {
        return undefined;
      },
    },
    render: {
      camera: {},
      wardrobeGroup,
    },
    services: {
      tools: {
        getPaintColor() {
          return '#445566';
        },
      },
    },
    actions: {
      colors: {
        applyPaint(nextColors: Record<string, unknown>) {
          maps.individualColors = { ...nextColors };
          applied.push({ ...nextColors });
        },
      },
    },
    maps: {
      getMap(name: string) {
        return maps[name] || {};
      },
    },
  } as any;

  const handled = tryHandleCanvasPickingActionRoute({
    App,
    ndcX: 0,
    ndcY: 0,
    raycaster: {} as never,
    mouse: {} as never,
    modeState: createModeState(),
    hitState: {
      intersects: [{ object: upperFloor as never, point: { x: 0.1, y: 1.8, z: 0.03 } }],
      foundPartId: 'corner_floor',
      foundModuleIndex: null,
      foundModuleStack: 'top',
      effectiveDoorId: null,
      foundDrawerId: null,
      primaryHitObject: upperFloor as never,
      doorHitObject: null,
      doorHitGroup: null,
      primaryHitPoint: { x: 0.1, y: 1.8, z: 0.03 },
      doorHitPoint: null,
      moduleHitY: null,
      doorHitY: null,
      primaryHitY: 1.8,
      hitIdentity: null,
    },
    moduleRefs: {
      __activeModuleKey: 0,
      __activeStack: 'bottom',
      __isBottomStack: true,
      __ensureConfigRefForKey: () => null,
      __patchConfigForKey: () => undefined,
      __getActiveConfigRef: () => null,
      __ensureCornerCellConfigRef: () => null,
    },
  });

  assert.equal(handled, true);
  assert.equal(applied.length, 1);
  assert.deepEqual(applied[0], {
    corner_ceil: '#445566',
    corner_wing_side_left: '#445566',
    corner_wing_side_right: '#445566',
    corner_floor: '#445566',
  });
  assert.equal(applied[0]?.lower_corner_floor, undefined);
});
