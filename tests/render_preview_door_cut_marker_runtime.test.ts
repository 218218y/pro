import test from 'node:test';
import assert from 'node:assert/strict';

import { createDoorCutHoverMarkerOwner } from '../esm/native/builder/render_preview_marker_ops_door_cut.ts';

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

class PlaneGeometry {
  constructor(
    public width = 1,
    public height = 1
  ) {}
}

class MeshBasicMaterial {
  userData: Record<string, unknown> = {};

  constructor(public params: Record<string, unknown>) {}
}

class Mesh {
  isMesh = true;
  userData: Record<string, unknown> = {};
  visible = true;
  renderOrder = 0;
  parent: unknown = null;
  position = new Vec3();
  scale = new Vec3();
  children: Mesh[] = [];
  raycast: (...args: unknown[]) => unknown = () => undefined;

  constructor(
    public geometry: unknown,
    public material: unknown
  ) {}

  add(...children: Mesh[]) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
    return this;
  }
}

const THREE = {
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  DoubleSide: 'double-side',
};

test('door cut hover marker keeps a broad band and owns a high-contrast exact-cut overlay', () => {
  const App = {} as any;
  const cache = new Map<string, unknown>();
  const wardrobeGroup = {
    children: [] as Mesh[],
    add(...children: Mesh[]) {
      for (const child of children) {
        child.parent = this;
        this.children.push(child);
      }
    },
  };
  const errors: unknown[] = [];

  const owner = createDoorCutHoverMarkerOwner({
    app(args: any) {
      return args.App;
    },
    ops() {
      return {};
    },
    cacheValue(_app: unknown, key: string) {
      return cache.get(key) || null;
    },
    writeCacheValue(_app: unknown, key: string, value: unknown) {
      cache.set(key, value);
      return value;
    },
    wardrobeGroup() {
      return wardrobeGroup as any;
    },
    addToWardrobe() {
      return true;
    },
    renderOpsHandleCatch(_app: unknown, _op: string, error: unknown) {
      errors.push(error);
    },
    assertTHREE() {
      return THREE as any;
    },
  } as any);

  const marker = owner.ensureDoorCutHoverMarker({ App, THREE } as any) as Mesh | null;
  assert.ok(marker);
  assert.deepEqual(errors, []);
  assert.equal(marker.visible, false);
  assert.equal(marker.renderOrder, 10000);
  assert.equal(wardrobeGroup.children.includes(marker), true);

  const precisionLine = marker.userData.__precisionLine as Mesh | undefined;
  assert.ok(precisionLine);
  assert.equal(precisionLine.parent, marker);
  assert.equal(precisionLine.visible, false);
  assert.equal(precisionLine.renderOrder, 10001);
  assert.equal(precisionLine.userData.__ignoreRaycast, true);
  assert.equal(precisionLine.position.z, 0);

  const precisionAddMat = marker.userData.__precisionMatAdd as MeshBasicMaterial | undefined;
  const precisionRemoveMat = marker.userData.__precisionMatRemove as MeshBasicMaterial | undefined;
  const precisionAlignedMat = marker.userData.__precisionMatAligned as MeshBasicMaterial | undefined;
  for (const material of [precisionAddMat, precisionRemoveMat, precisionAlignedMat]) {
    assert.ok(material);
    assert.equal(material.params.transparent, true);
    assert.equal(material.params.depthWrite, false);
    assert.equal(material.params.depthTest, false);
  }
  assert.ok(Number(precisionAddMat?.params.opacity) >= 0.9);
  assert.ok(Number(precisionRemoveMat?.params.opacity) >= 0.9);
  assert.ok(Number(precisionAlignedMat?.params.opacity) >= 0.9);

  const cached = owner.ensureDoorCutHoverMarker({ App, THREE } as any);
  assert.equal(cached, marker);
  assert.equal(wardrobeGroup.children.filter(child => child === marker).length, 1);
});
