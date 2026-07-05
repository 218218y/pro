import test from 'node:test';
import assert from 'node:assert/strict';

import {
  setViewerMeasurementToolMode,
  tryHandleViewerMeasurementClick,
} from '../esm/native/services/viewer_measurement_tool.ts';
import { createFakeThreeRuntime } from './_fake_three_runtime.ts';

class FakeBufferGeometry {
  points: Array<{ x: number; y: number; z: number }> = [];

  setFromPoints(points: Array<{ x: number; y: number; z: number }>): this {
    this.points = points.map(point => ({ x: point.x, y: point.y, z: point.z }));
    return this;
  }

  dispose(): void {}
}

class FakeLineBasicMaterial {
  color: unknown;
  transparent = false;
  opacity = 1;
  depthTest = true;
  depthWrite = true;
  needsUpdate = false;

  constructor(options: Record<string, unknown> = {}) {
    Object.assign(this, options);
    this.color = {
      value: options.color,
      set: (next: unknown) => {
        this.color = { ...(typeof this.color === 'object' && this.color ? this.color : {}), value: next };
      },
    };
  }

  clone(): FakeLineBasicMaterial {
    return new FakeLineBasicMaterial({
      color:
        typeof this.color === 'object' && this.color && 'value' in this.color ? this.color.value : this.color,
      transparent: this.transparent,
      opacity: this.opacity,
      depthTest: this.depthTest,
      depthWrite: this.depthWrite,
    });
  }

  dispose(): void {}
}

function installRemove(group: { children: unknown[]; remove?: (obj: unknown) => void }): void {
  group.remove = (obj: unknown) => {
    const index = group.children.indexOf(obj);
    if (index >= 0) group.children.splice(index, 1);
    if (obj && typeof obj === 'object') (obj as { parent?: unknown }).parent = null;
  };
}

function createThreeWithMeasurementOverlaySupport() {
  const base = createFakeThreeRuntime();
  class FakeLine extends base.Group {
    type = 'Line';
    geometry: unknown;
    material: unknown;
    name = '';
    renderOrder = 0;

    constructor(geometry: unknown, material: unknown) {
      super();
      this.geometry = geometry;
      this.material = material;
    }
  }

  return {
    ...base,
    BufferGeometry: FakeBufferGeometry,
    LineBasicMaterial: FakeLineBasicMaterial,
    Line: FakeLine,
  };
}

type FakeThree = ReturnType<typeof createThreeWithMeasurementOverlaySupport>;

function makeSlidingDoor(THREE: FakeThree, id: string, z: number) {
  const group = new THREE.Group();
  installRemove(group as unknown as { children: unknown[]; remove?: (obj: unknown) => void });
  group.position.set(0, 1, z);
  group.userData = {
    partId: id,
    __doorType: 'sliding',
    __doorWidth: 0.8,
    __doorHeight: 2,
    __doorPivotCentered: true,
  };

  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.02), null);
  group.add(slab);
  return group;
}

function makeHitState(door: unknown, point: { x: number; y: number; z: number }) {
  return {
    intersects: [{ object: door, point }],
    foundPartId: null,
    foundModuleIndex: null,
    foundModuleStack: 'top',
    effectiveDoorId: null,
    foundDrawerId: null,
    primaryHitObject: door,
    doorHitObject: door,
    doorHitGroup: door,
    primaryHitPoint: point,
    doorHitPoint: point,
    moduleHitY: null,
    doorHitY: point.y,
    primaryHitY: point.y,
    hitIdentity: null,
    hitUserData: null,
  } as any;
}

test('point measurement that starts on an inner sliding door is promoted to the visible sliding-front plane', () => {
  const THREE = createThreeWithMeasurementOverlaySupport();
  const wardrobeGroup = new THREE.Group();
  installRemove(wardrobeGroup as unknown as { children: unknown[]; remove?: (obj: unknown) => void });
  wardrobeGroup.worldToLocal = value => value;

  const innerDoor = makeSlidingDoor(THREE, 'sliding_door_1', -0.04);
  const outerDoor = makeSlidingDoor(THREE, 'sliding_door_2', 0.02);
  wardrobeGroup.add(innerDoor);
  wardrobeGroup.add(outerDoor);

  const calls: Array<{
    start: { x: number; y: number; z: number };
    end: { x: number; y: number; z: number };
  }> = [];
  const App = {
    deps: { THREE },
    render: {
      wardrobeGroup,
      camera: { position: new THREE.Vector3(0, 1, 2) },
    },
    services: {
      builder: {
        renderOps: {
          addDimensionLine(start: any, end: any) {
            calls.push({
              start: { x: start.x, y: start.y, z: start.z },
              end: { x: end.x, y: end.y, z: end.z },
            });
            return {
              line: new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([start, end]),
                new THREE.LineBasicMaterial()
              ),
              sprite: new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([start, end]),
                new THREE.LineBasicMaterial()
              ),
            };
          },
        },
      },
    },
  } as any;

  setViewerMeasurementToolMode(App, 'points', false);

  const innerFrontZ = -0.03;
  const outerFrontZ = 0.03;
  assert.equal(
    tryHandleViewerMeasurementClick({
      App,
      hitState: makeHitState(innerDoor, { x: -0.3, y: 1, z: innerFrontZ }),
    }),
    true
  );
  assert.equal(
    tryHandleViewerMeasurementClick({
      App,
      hitState: makeHitState(outerDoor, { x: 0.3, y: 1, z: outerFrontZ }),
    }),
    true
  );

  assert.equal(calls.length, 1);
  assert.ok(Math.abs(calls[0].start.z - (outerFrontZ + 0.006)) < 1e-9);
  assert.ok(Math.abs(calls[0].end.z - (outerFrontZ + 0.006)) < 1e-9);
});
