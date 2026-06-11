import test from 'node:test';
import assert from 'node:assert/strict';

import { __coreHandleCanvasHoverNDC } from '../esm/native/services/canvas_picking_hover_flow.ts';

function createRaycaster(intersects: any[]) {
  return {
    lastMouse: null as { x: number; y: number } | null,
    setFromCamera(mouse: { x: number; y: number }) {
      this.lastMouse = { ...mouse };
    },
    intersectObjects(_objects: unknown, _recursive?: boolean, optionalTarget?: any[]) {
      if (Array.isArray(optionalTarget)) {
        optionalTarget.length = 0;
        optionalTarget.push(...intersects);
        return optionalTarget;
      }
      return intersects.slice();
    },
  };
}

function createBoxObject(partId: string) {
  return {
    type: 'Mesh',
    userData: { partId },
    material: { visible: true, opacity: 1 },
    children: [],
    geometry: { parameters: { width: 0.55, height: 1.8, depth: 0.52 } },
    position: { x: 0.25, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    parent: null as any,
  };
}

function createApp(wardrobeGroup: any, raycaster: any) {
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
      wardrobeGroup,
      scene: { children: [wardrobeGroup] },
    },
    maps: {
      getMap() {
        return null;
      },
    },
    services: {
      tools: {
        getPaintColor() {
          return 'ivory';
        },
      },
      builder: {
        registry: {
          get() {
            return null;
          },
        },
        renderOps: {
          ensureSplitHoverMarker() {
            return splitMarker;
          },
          ensureDoorActionHoverMarker() {
            return { visible: true };
          },
          ensureDoorCutHoverMarker() {
            return { visible: true };
          },
          hideSketchPlacementPreview() {
            hideSketchCalls += 1;
          },
          setSketchPlacementPreview(args: Record<string, unknown>) {
            previews.push(args);
          },
          hideInteriorLayoutHoverPreview() {
            hideLayoutCalls += 1;
          },
        },
      },
      canvasPicking: {
        runtime: {
          raycaster,
          mouse: { x: 0, y: 0 },
        },
      },
    },
  } as any;
}

let splitMarker: { visible: boolean };
let hideSketchCalls: number;
let hideLayoutCalls: number;
let previews: Record<string, unknown>[];

test('hover flow paint mode routes through the canonical generic paint preview path and hides split marker', () => {
  splitMarker = { visible: true };
  hideSketchCalls = 0;
  hideLayoutCalls = 0;
  previews = [];

  const wardrobeGroup = { children: [] as unknown[], userData: { partId: 'root' } };
  const bodyLeft = createBoxObject('body_left');
  bodyLeft.parent = wardrobeGroup;
  wardrobeGroup.children.push(bodyLeft);
  const raycaster = createRaycaster([{ object: bodyLeft, point: { x: 0.25, y: 0.1, z: 0 } }]);
  const App = createApp(wardrobeGroup, raycaster);

  const handled = __coreHandleCanvasHoverNDC(App, 0.15, -0.25);

  assert.equal(handled, true);
  assert.equal(splitMarker.visible, false);
  assert.ok(hideSketchCalls >= 1);
  assert.ok(hideLayoutCalls >= 1);
  assert.equal(previews.length, 1);
  assert.equal(previews[0]?.App, App);
  assert.deepEqual(raycaster.lastMouse, { x: 0.15, y: -0.25 });
});
