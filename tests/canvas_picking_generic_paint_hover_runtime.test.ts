import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleGenericPartPaintHover } from '../esm/native/services/canvas_picking_generic_paint_hover.ts';

type HitLike = { object: any; point?: { x?: number; y?: number; z?: number } | null };

function createRaycaster(intersects: HitLike[]) {
  return {
    lastMouse: null as { x: number; y: number } | null,
    lastCamera: null as unknown,
    lastObjects: null as unknown,
    setFromCamera(mouse: { x: number; y: number }, camera: unknown) {
      this.lastMouse = { ...mouse };
      this.lastCamera = camera;
    },
    intersectObjects(objects: unknown, _recursive?: boolean, optionalTarget?: HitLike[]) {
      this.lastObjects = objects;
      if (Array.isArray(optionalTarget)) {
        optionalTarget.length = 0;
        optionalTarget.push(...intersects);
        return optionalTarget;
      }
      return intersects.slice();
    },
  };
}

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

function createApp(args: { wardrobeGroup: any; maps?: Record<string, Record<string, unknown>> }) {
  const state = {
    ui: { stackSplitEnabled: false },
    config: {},
    mode: { primary: 'paint' },
    runtime: {},
    meta: {},
  };
  return {
    store: {
      getState() {
        return state;
      },
      patch() {
        return undefined;
      },
    },
    render: {
      camera: { updateMatrixWorld() {} },
      wardrobeGroup: args.wardrobeGroup,
      scene: { children: [args.wardrobeGroup] },
    },
    services: {
      runtimeCache: {},
      builder: {
        registry: {
          get() {
            return null;
          },
        },
      },
    },
    maps: {
      getMap(name: string) {
        return args.maps?.[name] || null;
      },
    },
  } as any;
}

test('generic paint hover builds a canonical grouped preview and clears other hover overlays first', () => {
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const bodyLeft = createBoxObject('body_left', { x: -0.45 });
  bodyLeft.parent = wardrobeGroup;
  wardrobeGroup.children.push(bodyLeft);
  const raycaster = createRaycaster([{ object: bodyLeft, point: { x: -0.45, y: 0.2, z: 0.1 } }]);
  const mouse = { x: 0, y: 0 };
  const App = createApp({
    wardrobeGroup,
    maps: {
      individualColors: {
        body_left: 'oak',
        body_right: 'oak',
        body_ceil: 'oak',
        body_floor: 'oak',
      },
    },
  });

  const calls: string[] = [];
  const previews: Record<string, unknown>[] = [];
  const handled = tryHandleGenericPartPaintHover({
    App,
    ndcX: 0.2,
    ndcY: -0.1,
    paintSelection: 'oak',
    raycaster,
    mouse,
    hideLayoutPreview: args => {
      calls.push(`layout:${String((args as { App?: unknown }).App === App)}`);
    },
    hideSketchPreview: args => {
      calls.push(`sketch:${String((args as { App?: unknown }).App === App)}`);
    },
    previewRo: {
      setSketchPlacementPreview(args: Record<string, unknown>) {
        previews.push(args);
      },
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(calls, ['layout:true', 'sketch:true']);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.App, App);
  assert.equal(previews[0]?.op, 'remove');
  assert.equal(previews[0]?.kind, 'box');
  assert.ok(typeof previews[0]?.w === 'number' && Number(previews[0].w) > 0.5);
  assert.deepEqual(raycaster.lastMouse, { x: 0.2, y: -0.1 });
});

test('generic paint hover hides stale previews when a target resolves but no preview box can be measured', () => {
  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const bodyLeft = {
    type: 'Mesh',
    userData: { partId: 'body_left' },
    material: { visible: true, opacity: 1 },
    children: [],
    parent: wardrobeGroup,
    position: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
  wardrobeGroup.children.push(bodyLeft);
  const raycaster = createRaycaster([{ object: bodyLeft, point: { x: 0, y: 0, z: 0 } }]);
  const mouse = { x: 0, y: 0 };
  const App = createApp({ wardrobeGroup });

  const calls: string[] = [];
  let previewCalled = false;
  const handled = tryHandleGenericPartPaintHover({
    App,
    ndcX: 0,
    ndcY: 0,
    paintSelection: 'walnut',
    raycaster,
    mouse,
    hideLayoutPreview: () => {
      calls.push('layout');
    },
    hideSketchPreview: () => {
      calls.push('sketch');
    },
    previewRo: {
      setSketchPlacementPreview() {
        previewCalled = true;
      },
    },
  });

  assert.equal(handled, false);
  assert.equal(previewCalled, false);
  assert.deepEqual(calls, ['layout', 'sketch']);
});
