import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleCellDimsHoverPreview } from '../esm/native/services/canvas_picking_hover_preview_modes_cell_dims.ts';

function createWardrobeGroup(children: any[]) {
  const group: any = {
    children,
    add(child: unknown) {
      this.children.push(child);
    },
    traverse(visitor: (node: unknown) => void) {
      const walk = (node: any) => {
        visitor(node);
        if (Array.isArray(node.children)) node.children.forEach(walk);
      };
      walk(this);
    },
  };
  for (const child of children) child.parent = group;
  return group;
}

function createAppWithFreeBox(hitObject: any, mainObject: any) {
  const freeBox = {
    id: 'free-1',
    freePlacement: true,
    absX: 0.25,
    absY: 0.5,
    widthM: 0.6,
    heightM: 0.8,
    depthM: 0.35,
    doors: [{ id: 'door-1', enabled: true }],
  };
  const wardrobeGroup = createWardrobeGroup([hitObject, mainObject]);
  const state = {
    ui: {
      raw: {
        doors: 0,
        width: 160,
        height: 220,
        depth: 55,
      },
    },
    config: {
      modulesConfiguration: [
        {
          doors: 0,
          sketchExtras: { boxes: [freeBox] },
        },
      ],
    },
    runtime: {},
    mode: {},
    meta: {},
  } as any;
  const App = {
    store: {
      getState() {
        return state;
      },
      patch(patch: Record<string, unknown>) {
        Object.assign(state, patch);
        return state;
      },
    },
    render: {
      camera: {},
      wardrobeGroup,
    },
  } as any;
  return { App, state, freeBox, wardrobeGroup };
}

function createRaycaster(intersects: any[]) {
  return {
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, optionalTarget?: any[]) {
      if (optionalTarget) {
        optionalTarget.push(...intersects);
        return optionalTarget;
      }
      return intersects;
    },
  } as any;
}

test('[cell-dims/free-box-hover] shell hit previews the free-standing box itself when there is no main cabinet hover target', () => {
  const shellObject = {
    type: 'Mesh',
    userData: {
      partId: 'sketch_box_free_0_free-1',
      __wpSketchBoxId: 'free-1',
      __wpSketchModuleKey: 0,
      moduleIndex: 0,
    },
    material: {},
  };
  const mainObject = {
    type: 'Mesh',
    userData: { isModuleSelector: true, moduleIndex: 0 },
    material: {},
  };
  const { App } = createAppWithFreeBox(shellObject, mainObject);
  const previews: any[] = [];
  let interiorCalls = 0;

  const handled = tryHandleCellDimsHoverPreview({
    App,
    ndcX: 0.1,
    ndcY: -0.2,
    raycaster: createRaycaster([{ object: shellObject, point: {} }]),
    mouse: { x: 0, y: 0 },
    isCellDimsMode: true,
    previewRo: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
    },
    resolveInteriorHoverTarget() {
      interiorCalls += 1;
      return null;
    },
    readCellDimsDraft() {
      return { applyW: 80, applyH: 90, applyD: 40 };
    },
    measureObjectLocalBox() {
      throw new Error('free-box hover must not measure the hit shell/door as the selector box');
    },
    estimateVisibleModuleFrontZ() {
      return 0;
    },
    getCellDimsHoverOp(_App, target, selectorBox) {
      assert.equal((target.info as any).__wpCellDimsFreeBox, true);
      assert.equal(Math.round(selectorBox.width * 100), 60);
      assert.equal(Math.round(selectorBox.height * 100), 80);
      assert.equal(Math.round(selectorBox.depth * 100), 35);
      return 'add';
    },
  });

  assert.equal(handled, true);
  assert.equal(interiorCalls, 0);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].anchor, shellObject);
  assert.ok(Math.abs(previews[0].x - 0.25) <= 1e-9);
  assert.ok(Math.abs(previews[0].y - 0.5) <= 1e-9);
  assert.ok(Math.abs(previews[0].z - -0.35) <= 1e-9);
  assert.ok(Math.abs(previews[0].d - 0.4) <= 1e-9);
});

test('[cell-dims/free-box-hover] door hit in front of a main selector stays routed to the free box', () => {
  const doorObject = {
    type: 'Mesh',
    userData: {
      partId: 'sketch_box_free_0_free-1_door_door-1',
      __wpSketchBoxId: 'free-1',
      __wpSketchModuleKey: 0,
      moduleIndex: 0,
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: true,
    },
    material: {},
  };
  const doorGroup = {
    type: 'Group',
    userData: { partId: 'sketch_box_free_0_free-1_door_door-1' },
    children: [doorObject],
    material: {},
  };
  doorObject.parent = doorGroup;
  const mainObject = {
    type: 'Mesh',
    userData: { isModuleSelector: true, moduleIndex: 0 },
    material: {},
  };
  const { App, wardrobeGroup } = createAppWithFreeBox(doorGroup, mainObject);
  const previews: any[] = [];
  let interiorCalls = 0;

  const handled = tryHandleCellDimsHoverPreview({
    App,
    ndcX: 0.1,
    ndcY: -0.2,
    raycaster: createRaycaster([
      { object: doorObject, point: {} },
      { object: mainObject, point: {} },
    ]),
    mouse: { x: 0, y: 0 },
    isCellDimsMode: true,
    previewRo: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
    },
    resolveInteriorHoverTarget() {
      interiorCalls += 1;
      throw new Error('main wardrobe fallback must not run while the free-box door is the front hit');
    },
    readCellDimsDraft() {
      return { applyW: 80, applyH: 90, applyD: 40 };
    },
    measureObjectLocalBox() {
      throw new Error('door dimensions must not drive free-box cell-dims hover');
    },
    estimateVisibleModuleFrontZ() {
      return 0;
    },
    getCellDimsHoverOp(_App, target, selectorBox) {
      assert.equal((target.info as any).__wpCellDimsFreeBoxId, 'free-1');
      assert.equal(Math.round(selectorBox.width * 100), 60);
      return 'add';
    },
  });

  assert.equal(handled, true);
  assert.equal(interiorCalls, 0);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].anchor, doorObject);
  assert.equal(previews[0].anchorParent, wardrobeGroup);
  assert.ok(Math.abs(previews[0].x - 0.25) <= 1e-9);
  assert.ok(Math.abs(previews[0].d - 0.4) <= 1e-9);
});

test('[cell-dims/free-box-hover] external drawer hit previews the free-standing box, not the drawer face', () => {
  const drawerObject = {
    type: 'Mesh',
    userData: {
      partId: 'sketch_box_free_0_free-1_ext_drawers_fd1_face',
      moduleIndex: 0,
    },
    material: {},
  };
  const drawerGroup = {
    type: 'Group',
    userData: { partId: 'sketch_box_free_0_free-1_ext_drawers_fd1' },
    children: [drawerObject],
    material: {},
  };
  drawerObject.parent = drawerGroup;
  const mainObject = {
    type: 'Mesh',
    userData: { isModuleSelector: true, moduleIndex: 0 },
    material: {},
  };
  const { App, wardrobeGroup } = createAppWithFreeBox(drawerGroup, mainObject);
  const previews: any[] = [];

  const handled = tryHandleCellDimsHoverPreview({
    App,
    ndcX: 0.1,
    ndcY: -0.2,
    raycaster: createRaycaster([
      { object: drawerObject, point: {} },
      { object: mainObject, point: {} },
    ]),
    mouse: { x: 0, y: 0 },
    isCellDimsMode: true,
    previewRo: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
    },
    resolveInteriorHoverTarget() {
      throw new Error('main wardrobe fallback must not run while a free-box external drawer was hit');
    },
    readCellDimsDraft() {
      return { applyW: 80, applyH: 90, applyD: 40 };
    },
    measureObjectLocalBox() {
      throw new Error('external drawer dimensions must not drive free-box cell-dims hover');
    },
    estimateVisibleModuleFrontZ() {
      return 0;
    },
    getCellDimsHoverOp(_App, target, selectorBox) {
      assert.equal((target.info as any).__wpCellDimsFreeBoxId, 'free-1');
      assert.equal(Math.round(selectorBox.width * 100), 60);
      assert.equal(Math.round(selectorBox.depth * 100), 35);
      return 'add';
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].anchor, drawerObject);
  assert.equal(previews[0].anchorParent, wardrobeGroup);
  assert.ok(Math.abs(previews[0].x - 0.25) <= 1e-9);
  assert.ok(Math.abs(previews[0].d - 0.4) <= 1e-9);
});

test('[cell-dims/free-box-hover] skips unrelated front hits and parses internal drawer free-box part ids', () => {
  const unrelatedObject = {
    type: 'Mesh',
    userData: { partId: 'folded_clothes_visual' },
    material: {},
  };
  const internalDrawerObject = {
    type: 'Mesh',
    userData: {
      partId: 'sketch_box_free_0_free-1_int_drawers_fd1_lower',
      moduleIndex: 0,
    },
    material: {},
  };
  const mainObject = {
    type: 'Mesh',
    userData: { isModuleSelector: true, moduleIndex: 0 },
    material: {},
  };
  const { App } = createAppWithFreeBox(internalDrawerObject, mainObject);
  const previews: any[] = [];

  const handled = tryHandleCellDimsHoverPreview({
    App,
    ndcX: 0.1,
    ndcY: -0.2,
    raycaster: createRaycaster([
      { object: unrelatedObject, point: {} },
      { object: internalDrawerObject, point: {} },
      { object: mainObject, point: {} },
    ]),
    mouse: { x: 0, y: 0 },
    isCellDimsMode: true,
    previewRo: {
      setSketchPlacementPreview(args: unknown) {
        previews.push(args);
      },
    },
    resolveInteriorHoverTarget() {
      throw new Error('main wardrobe fallback must not run after a later free-box drawer hit');
    },
    readCellDimsDraft() {
      return { applyW: 80, applyH: 90, applyD: 40 };
    },
    measureObjectLocalBox() {
      throw new Error('internal drawer dimensions must not drive free-box cell-dims hover');
    },
    estimateVisibleModuleFrontZ() {
      return 0;
    },
    getCellDimsHoverOp(_App, target, selectorBox) {
      assert.equal((target.info as any).__wpCellDimsFreeBoxId, 'free-1');
      assert.equal(Math.round(selectorBox.width * 100), 60);
      assert.equal(Math.round(selectorBox.height * 100), 80);
      return 'add';
    },
  });

  assert.equal(handled, true);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].anchor, internalDrawerObject);
  assert.ok(Math.abs(previews[0].x - 0.25) <= 1e-9);
  assert.ok(Math.abs(previews[0].d - 0.4) <= 1e-9);
});
