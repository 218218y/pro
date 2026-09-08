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

  remove(child: Mesh) {
    this.children = this.children.filter(entry => entry !== child);
    child.parent = null;
    return this;
  }
}

const THREE = {
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  DoubleSide: 'double-side',
};

test('door cut hover marker is a single high-contrast overlay that stays readable through transparent doors', () => {
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
  assert.equal(marker.children.length, 0);
  assert.equal(marker.userData.__ignoreRaycast, true);

  const materials = [
    marker.userData.__matAdd as MeshBasicMaterial | undefined,
    marker.userData.__matRemove as MeshBasicMaterial | undefined,
    marker.userData.__matAligned as MeshBasicMaterial | undefined,
  ];
  for (const material of materials) {
    assert.ok(material);
    assert.equal(material.params.transparent, true);
    assert.equal(material.params.depthWrite, false);
    assert.equal(material.params.depthTest, false);
    assert.ok(Number(material.params.opacity) >= 0.9);
  }

  assert.equal(marker.userData.__doorCutHoverVisualVersion, 2);

  const stalePrecisionLine = new Mesh(new PlaneGeometry(1, 1), null);
  marker.add(stalePrecisionLine);
  marker.userData.__precisionLine = stalePrecisionLine;
  marker.userData.__precisionMatAdd = 'stale-add';
  marker.userData.__precisionMatRemove = 'stale-remove';
  marker.userData.__precisionMatAligned = 'stale-aligned';
  marker.userData.__doorCutHoverVisualVersion = 1;
  marker.userData.__matAdd = new MeshBasicMaterial({ opacity: 0.22 });

  const cached = owner.ensureDoorCutHoverMarker({ App, THREE } as any) as Mesh | null;
  assert.equal(cached, marker);
  assert.equal(wardrobeGroup.children.filter(child => child === marker).length, 1);
  assert.equal(marker.children.includes(stalePrecisionLine), false);
  assert.equal(stalePrecisionLine.visible, false);
  assert.equal(marker.userData.__precisionLine, undefined);
  assert.equal(marker.userData.__doorCutHoverVisualVersion, 2);
  assert.ok(Number((marker.userData.__matAdd as MeshBasicMaterial).params.opacity) >= 0.9);
});
