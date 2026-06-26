import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveNonSplitPreferredFacePreviewState } from '../esm/native/services/canvas_picking_hover_flow_nonsplit_face.ts';
import { tryHandleCanvasNonSplitDoorPreviewRoute } from '../esm/native/services/canvas_picking_hover_flow_nonsplit_preview_door.ts';
import { tryHandleCanvasNonSplitPaintPreviewRoute } from '../esm/native/services/canvas_picking_hover_flow_nonsplit_preview_paint.ts';
import { tryHandleCanvasNonSplitPreviewRoutes } from '../esm/native/services/canvas_picking_hover_flow_nonsplit_preview.ts';
import { tryHandleCanvasNonSplitInteriorPreviewRoutes } from '../esm/native/services/canvas_picking_hover_flow_nonsplit_preview_interior.ts';
import type {
  HandleCanvasNonSplitHoverArgs,
  NonSplitPreviewRouteArgs,
} from '../esm/native/services/canvas_picking_hover_flow_nonsplit_contracts.ts';

function createHoverArgs(
  overrides: Partial<HandleCanvasNonSplitHoverArgs> = {}
): HandleCanvasNonSplitHoverArgs {
  return {
    App: {} as never,
    ndcX: 0.1,
    ndcY: -0.2,
    primaryMode: 'layout',
    paintSelection: null,
    isGrooveEditMode: false,
    isRemoveDoorMode: false,
    isHandleEditMode: false,
    isHingeEditMode: false,
    isMirrorPaintMode: false,
    isDoorTrimMode: false,
    isExtDrawerEditMode: false,
    isDividerEditMode: false,
    isCellDimsMode: false,
    raycaster: {} as never,
    mouse: {} as never,
    doorMarker: null,
    cutMarker: null,
    previewRo: null,
    hideLayoutPreview: null,
    hideSketchPreview: null,
    setSketchPreview: null,
    setLayoutPreview: null,
    ...overrides,
  };
}

test('non-split preferred face preview ignores sketch free-box body hits in handle mode', () => {
  const wardrobeGroup = {
    type: 'Group',
    userData: { partId: 'root' },
    children: [] as unknown[],
  };
  const freeBoxBody = {
    type: 'Mesh',
    userData: { partId: 'sketch_box_free_0_box-1', __wpSketchBoxId: 'box-1' },
    material: { visible: true, opacity: 1 },
    parent: wardrobeGroup,
  };
  wardrobeGroup.children.push(freeBoxBody);
  const App = {
    render: { renderer: {}, camera: {}, wardrobeGroup },
    services: { runtimeCache: {} },
    store: {
      getState: () => ({ ui: {}, config: {}, mode: {}, runtime: {}, meta: {} }),
      patch: () => undefined,
    },
    maps: { getMap: () => null },
  };
  const raycaster = {
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, optionalTarget?: unknown[]) {
      const hits = [{ object: freeBoxBody, point: { x: 0.01, y: 0.02, z: 0.03 } }];
      if (Array.isArray(optionalTarget)) {
        optionalTarget.length = 0;
        optionalTarget.push(...hits);
        return optionalTarget;
      }
      return hits;
    },
  };

  const state = resolveNonSplitPreferredFacePreviewState(
    createHoverArgs({
      App: App as never,
      isHandleEditMode: true,
      raycaster: raycaster as never,
      mouse: { x: 0, y: 0 } as never,
    })
  );

  assert.equal(state.preferredFacePreviewPartId, null);
  assert.equal(state.preferredFacePreviewHitObject, null);
  assert.equal(state.preferredFacePreviewHitPoint, null);
});

test('non-split preferred face preview ignores drawer-box side hits in handle mode', () => {
  const wardrobeGroup = {
    type: 'Group',
    userData: { partId: 'root' },
    children: [] as unknown[],
  };
  const drawerOwner = {
    type: 'Group',
    userData: {
      partId: 'sketch_ext_drawers_1_sed-1_1',
      __doorWidth: 0.8,
      __doorHeight: 0.2,
      __wpType: 'extDrawer',
    },
    parent: wardrobeGroup,
    children: [] as unknown[],
  };
  const drawerBox = {
    type: 'Group',
    userData: {
      partId: 'drawer_box__sketch_ext_drawers_1_sed-1_1',
      __wpDrawerBox: true,
      __wpDrawerOwnerPartId: 'sketch_ext_drawers_1_sed-1_1',
    },
    parent: drawerOwner,
    children: [] as unknown[],
  };
  const drawerBoxSide = {
    type: 'Mesh',
    userData: {},
    material: { visible: true, opacity: 1 },
    parent: drawerBox,
  };
  drawerBox.children.push(drawerBoxSide);
  drawerOwner.children.push(drawerBox);
  wardrobeGroup.children.push(drawerOwner);
  const App = {
    render: { renderer: {}, camera: {}, wardrobeGroup },
    services: { runtimeCache: {} },
    store: {
      getState: () => ({ ui: {}, config: {}, mode: {}, runtime: {}, meta: {} }),
      patch: () => undefined,
    },
    maps: { getMap: () => null },
  };
  const raycaster = {
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, optionalTarget?: unknown[]) {
      const hits = [{ object: drawerBoxSide, point: { x: 0.01, y: 0.02, z: 0.03 } }];
      if (Array.isArray(optionalTarget)) {
        optionalTarget.length = 0;
        optionalTarget.push(...hits);
        return optionalTarget;
      }
      return hits;
    },
  };

  const state = resolveNonSplitPreferredFacePreviewState(
    createHoverArgs({
      App: App as never,
      isHandleEditMode: true,
      raycaster: raycaster as never,
      mouse: { x: 0, y: 0 } as never,
    })
  );

  assert.equal(state.preferredFacePreviewPartId, null);
  assert.equal(state.preferredFacePreviewHitObject, null);
  assert.equal(state.preferredFacePreviewHitPoint, null);
});

test('non-split preferred face preview allows internal drawer boxes in handle mode', () => {
  const wardrobeGroup = {
    type: 'Group',
    userData: { partId: 'root' },
    children: [] as unknown[],
  };
  const internalDrawer = {
    type: 'Group',
    userData: {
      partId: 'drawer_box__div_int_sketch_0_d1_lower',
      drawerId: 'div_int_sketch_0_d1_lower',
      __wpDrawerBox: true,
      __wpInternalDrawerBox: true,
      __wpDrawerOwnerPartId: 'div_int_sketch_0_d1_lower',
      __doorWidth: 0.68,
      __doorHeight: 0.18,
    },
    parent: wardrobeGroup,
    children: [] as unknown[],
  };
  const drawerFrontPanel = {
    type: 'Mesh',
    userData: {},
    material: { visible: true, opacity: 1 },
    parent: internalDrawer,
  };
  internalDrawer.children.push(drawerFrontPanel);
  wardrobeGroup.children.push(internalDrawer);
  const App = {
    render: { renderer: {}, camera: {}, wardrobeGroup },
    services: { runtimeCache: {} },
    store: {
      getState: () => ({ ui: {}, config: {}, mode: {}, runtime: {}, meta: {} }),
      patch: () => undefined,
    },
    maps: { getMap: () => null },
  };
  const raycaster = {
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, optionalTarget?: unknown[]) {
      const hits = [{ object: drawerFrontPanel, point: { x: 0.01, y: 0.02, z: 0.03 } }];
      if (Array.isArray(optionalTarget)) {
        optionalTarget.length = 0;
        optionalTarget.push(...hits);
        return optionalTarget;
      }
      return hits;
    },
  };

  const state = resolveNonSplitPreferredFacePreviewState(
    createHoverArgs({
      App: App as never,
      isHandleEditMode: true,
      raycaster: raycaster as never,
      mouse: { x: 0, y: 0 } as never,
    })
  );

  assert.equal(state.preferredFacePreviewPartId, 'div_int_sketch_0_d1_lower');
  assert.equal(state.preferredFacePreviewHitObject, drawerFrontPanel);
  assert.deepEqual(state.preferredFacePreviewHitPoint, { x: 0.01, y: 0.02, z: 0.03 });
});

test('non-split door preview forwards preferred face state and hides the live marker on miss', () => {
  const doorMarker = { visible: true } as { visible: boolean };
  let captured: Record<string, unknown> | null = null;

  const handled = tryHandleCanvasNonSplitDoorPreviewRoute(
    {
      hoverArgs: createHoverArgs({
        paintSelection: 'oak',
        doorMarker: doorMarker as never,
      }),
      facePreviewState: {
        preferredFacePreviewPartId: 'd1_left',
        preferredFacePreviewHitObject: { id: 'front' },
        preferredFacePreviewHitPoint: { x: 0.1, y: 0.2, z: 0.03 },
      },
    } satisfies NonSplitPreviewRouteArgs,
    {
      tryHandleDoorActionHover: args => {
        captured = args as Record<string, unknown>;
        return false;
      },
    }
  );

  assert.equal(handled, false);
  assert.equal(doorMarker.visible, false);
  assert.equal(captured?.preferredFacePreviewPartId, 'd1_left');
  assert.deepEqual(captured?.preferredFacePreviewHitPoint, { x: 0.1, y: 0.2, z: 0.03 });
  assert.equal(captured?.paintUsesWardrobeGroup, true);
  assert.equal(captured?.readUi instanceof Function, true);
});

test('non-split paint preview normalizes preview render ops to null before delegating', () => {
  let captured: Record<string, unknown> | null = null;
  const handled = tryHandleCanvasNonSplitPaintPreviewRoute(createHoverArgs({ paintSelection: 'ivory' }), {
    tryHandleGenericPartPaintHover: args => {
      captured = args as Record<string, unknown>;
      return true;
    },
  });

  assert.equal(handled, true);
  assert.equal(captured?.paintSelection, 'ivory');
  assert.equal(captured?.previewRo, null);
});

test('non-split paint preview routes drawer-box hits through object-box feedback before door markers', () => {
  class Vec3 {
    x = 0;
    y = 0;
    z = 0;
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  }
  class Quat {
    copy(_next: unknown) {
      return this;
    }
  }
  const drawerBoxPartId = 'drawer_box__drawer_1';
  const wardrobeGroup = {
    type: 'Group',
    userData: { partId: 'root' },
    children: [] as unknown[],
    worldToLocal(target: Vec3) {
      return target;
    },
  };
  const drawerGroup = {
    type: 'Group',
    userData: { partId: 'drawer_1' },
    children: [] as unknown[],
    parent: wardrobeGroup,
    localToWorld(target: Vec3) {
      return target;
    },
    getWorldPosition(target: Vec3) {
      return target.set(0, 0, 0);
    },
    getWorldQuaternion(target: Quat) {
      return target;
    },
  };
  const drawerBox = {
    type: 'Group',
    userData: { partId: drawerBoxPartId, __wpDrawerBox: true, __doorWidth: 0.56, __doorHeight: 0.18 },
    children: [] as unknown[],
    parent: drawerGroup,
    localToWorld(target: Vec3) {
      return target;
    },
    getWorldPosition(target: Vec3) {
      return target.set(0, 0, 0);
    },
    getWorldQuaternion(target: Quat) {
      return target;
    },
  };
  const sidePanel = {
    type: 'Mesh',
    userData: {},
    material: { visible: true, opacity: 1 },
    children: [] as unknown[],
    parent: drawerBox,
    geometry: {
      parameters: { width: 0.018, height: 0.18, depth: 0.48 },
      boundingBox: { min: { x: -0.009, y: -0.09, z: -0.24 }, max: { x: 0.009, y: 0.09, z: 0.24 } },
    },
    position: { x: -0.27, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
  drawerBox.children.push(sidePanel);
  drawerGroup.children.push(drawerBox);
  wardrobeGroup.children.push(drawerGroup);

  const App = {
    deps: { THREE: { Vector3: Vec3, Quaternion: Quat } },
    store: {
      getState: () => ({ ui: { stackSplitEnabled: false }, config: {}, mode: {}, runtime: {}, meta: {} }),
      patch: () => undefined,
    },
    render: { renderer: {}, camera: {}, wardrobeGroup, scene: { children: [wardrobeGroup] } },
    services: { runtimeCache: {}, builder: { registry: { get: () => null } } },
    maps: { getMap: () => null },
  };
  const previews: Record<string, unknown>[] = [];
  const doorMarker = {
    visible: true,
    userData: { __matAdd: 'add', __matRemove: 'remove', __matGroove: 'groove' },
    position: { copy() {} },
    quaternion: { copy() {} },
    scale: { set() {} },
  };
  const raycaster = {
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, optionalTarget?: unknown[]) {
      const hits = [{ object: sidePanel, point: { x: -0.27, y: 0, z: 0.05 } }];
      if (Array.isArray(optionalTarget)) {
        optionalTarget.length = 0;
        optionalTarget.push(...hits);
        return optionalTarget;
      }
      return hits;
    },
  };

  const handled = tryHandleCanvasNonSplitPreviewRoutes({
    hoverArgs: createHoverArgs({
      App: App as never,
      paintSelection: 'walnut',
      raycaster: raycaster as never,
      mouse: { x: 0, y: 0 } as never,
      doorMarker: doorMarker as never,
      previewRo: {
        setSketchPlacementPreview(args: Record<string, unknown>) {
          previews.push(args);
        },
      } as never,
    }),
    facePreviewState: {
      preferredFacePreviewPartId: null,
      preferredFacePreviewHitObject: null,
      preferredFacePreviewHitPoint: null,
    },
  });

  assert.equal(handled, true);
  assert.equal(doorMarker.visible, false);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.kind, 'object_boxes');
  assert.deepEqual(previews[0]?.previewObjects, [sidePanel]);
});

test('non-split interior preview stops at the first handled route and does not fan out further', () => {
  const calls: string[] = [];
  const handled = tryHandleCanvasNonSplitInteriorPreviewRoutes(
    createHoverArgs({ isExtDrawerEditMode: true }),
    {
      tryHandleExtDrawersHoverPreview: args => {
        calls.push(`ext:${String((args as Record<string, unknown>).isExtDrawerEditMode)}`);
        return true;
      },
      tryHandleDrawerDividerHoverPreview: () => {
        calls.push('divider');
        return false;
      },
      tryHandleCanvasLayoutFamilyHover: () => {
        calls.push('layout');
        return false;
      },
      tryHandleCellDimsHoverPreview: () => {
        calls.push('cell');
        return false;
      },
    }
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, ['ext:true']);
});

test('non-split interior preview reaches cell-dims with the canonical helper surface when earlier routes miss', () => {
  let captured: Record<string, unknown> | null = null;
  const handled = tryHandleCanvasNonSplitInteriorPreviewRoutes(
    createHoverArgs({ isCellDimsMode: true, previewRo: { kind: 'preview' } as never }),
    {
      tryHandleExtDrawersHoverPreview: () => false,
      tryHandleDrawerDividerHoverPreview: () => false,
      tryHandleCanvasLayoutFamilyHover: () => false,
      tryHandleCellDimsHoverPreview: args => {
        captured = args as Record<string, unknown>;
        return true;
      },
    }
  );

  assert.equal(handled, true);
  assert.equal(captured?.isCellDimsMode, true);
  assert.equal((captured?.readCellDimsDraft as Function) instanceof Function, true);
  assert.equal((captured?.getCellDimsHoverOp as Function) instanceof Function, true);
  assert.equal(captured?.previewRo && typeof captured.previewRo, 'object');
});
