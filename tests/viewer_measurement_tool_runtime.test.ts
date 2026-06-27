import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleViewerMeasurementClick } from '../esm/native/services/viewer_measurement_tool.ts';

class FakeVector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: { x: number; y: number; z: number }) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  clone() {
    return new FakeVector3(this.x, this.y, this.z);
  }

  add(v: { x: number; y: number; z: number }) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v: { x: number; y: number; z: number }) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  multiplyScalar(s: number) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  addVectors(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    this.z = a.z + b.z;
    return this;
  }

  lerp(v: { x: number; y: number; z: number }, alpha: number) {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    return this;
  }
}

class FakeBufferGeometry {
  points: Array<{ x: number; y: number; z: number }> = [];

  setFromPoints(points: Array<{ x: number; y: number; z: number }>) {
    this.points = points.map(point => ({ x: point.x, y: point.y, z: point.z }));
    return this;
  }

  dispose() {}
}

class FakeLineBasicMaterial {
  color?: number;
  transparent?: boolean;
  opacity?: number;
  depthTest?: boolean;
  depthWrite?: boolean;
  needsUpdate?: boolean;

  constructor(params: Record<string, unknown> = {}) {
    Object.assign(this, params);
  }

  clone() {
    return new FakeLineBasicMaterial({ ...this });
  }

  dispose() {}
}

class FakeLine {
  name = '';
  type = 'Line';
  parent: any = null;
  children: any[] = [];
  position = new FakeVector3();
  rotation = new FakeVector3();
  scale = new FakeVector3(1, 1, 1);
  userData: Record<string, unknown> = {};
  renderOrder = 0;
  geometry: FakeBufferGeometry;
  material: FakeLineBasicMaterial;

  constructor(geometry: FakeBufferGeometry, material: FakeLineBasicMaterial) {
    this.geometry = geometry;
    this.material = material;
  }

  add(obj: any) {
    obj.parent = this;
    this.children.push(obj);
  }

  remove(obj: any) {
    this.children = this.children.filter(child => child !== obj);
    obj.parent = null;
  }
}

function createFakeThree() {
  return {
    Vector3: FakeVector3,
    BufferGeometry: FakeBufferGeometry,
    LineBasicMaterial: FakeLineBasicMaterial,
    Line: FakeLine,
    Box3: function FakeBox3() {},
  };
}

function createGroup() {
  return {
    type: 'Group',
    name: 'wardrobe',
    parent: null as any,
    children: [] as any[],
    position: new FakeVector3(),
    rotation: new FakeVector3(),
    scale: new FakeVector3(1, 1, 1),
    userData: {} as Record<string, unknown>,
    add(obj: any) {
      obj.parent = this;
      this.children.push(obj);
    },
    remove(obj: any) {
      this.children = this.children.filter(child => child !== obj);
      obj.parent = null;
    },
    traverse(fn: (obj: any) => void) {
      const visit = (node: any) => {
        fn(node);
        for (const child of node.children || []) visit(child);
      };
      visit(this);
    },
    worldToLocal(v: { x: number; y: number; z: number }) {
      return v;
    },
  };
}

function createMesh(args: {
  width: number;
  height: number;
  depth: number;
  x?: number;
  y?: number;
  z?: number;
  userData?: Record<string, unknown>;
  opacity?: number;
}) {
  return {
    type: 'Mesh',
    parent: null as any,
    children: [] as any[],
    geometry: { parameters: { width: args.width, height: args.height, depth: args.depth } },
    position: new FakeVector3(args.x ?? 0, args.y ?? 0, args.z ?? 0),
    rotation: new FakeVector3(),
    scale: new FakeVector3(1, 1, 1),
    material: { visible: true, opacity: args.opacity ?? 1 },
    userData: args.userData || {},
    add(obj: any) {
      obj.parent = this;
      this.children.push(obj);
    },
    remove(obj: any) {
      this.children = this.children.filter(child => child !== obj);
      obj.parent = null;
    },
  };
}

function createApp(wardrobeGroup: any, labels: string[]) {
  const THREE = createFakeThree();
  const App: any = {
    deps: { THREE },
    render: {
      camera: {
        position: new FakeVector3(0, 0, 3),
        fov: 50,
        updateProjectionMatrix() {},
        getWorldPosition(target: FakeVector3) {
          return target.set(0, 0, 3);
        },
      },
      wardrobeGroup,
      cache: {},
    },
    services: {
      builder: {
        renderOps: {
          addDimensionLine(_from: any, _to: any, _offset: any, label: string) {
            labels.push(label);
            const line = {
              parent: null as any,
              children: [] as any[],
              userData: {} as Record<string, unknown>,
              geometry: { dispose() {} },
              material: {
                depthTest: true,
                depthWrite: true,
                clone() {
                  return { ...this };
                },
              },
            };
            const sprite = {
              parent: null as any,
              children: [] as any[],
              userData: {} as Record<string, unknown>,
              material: {
                depthTest: true,
                depthWrite: true,
                clone() {
                  return { ...this };
                },
              },
            };
            wardrobeGroup.add(line);
            wardrobeGroup.add(sprite);
            return { line, sprite };
          },
        },
      },
      runtimeCache: {
        internalGridMap: {
          0: {
            effectiveBottomY: 0,
            effectiveTopY: 2,
            innerW: 1,
            internalCenterX: 0,
            internalDepth: 0.55,
            internalZ: 0,
            woodThick: 0.02,
          },
        },
      },
    },
  };
  return App;
}

test('viewer measurement picks a real shelf over the transparent module selector', () => {
  const wardrobe = createGroup();
  const selector = createMesh({
    width: 1,
    height: 2,
    depth: 0.55,
    userData: { isModuleSelector: true, moduleIndex: 0, __wpStack: 'top' },
    opacity: 0,
  });
  const shelf = createMesh({
    width: 0.8,
    height: 0.02,
    depth: 0.45,
    y: 1,
    userData: { partId: 'module_shelf_0_g2', __wpShelfGroupPartId: 'all_shelves' },
  });
  wardrobe.add(selector);
  wardrobe.add(shelf);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      intersects: [
        { object: selector, point: { x: 0, y: 1, z: 0.2 } },
        { object: shelf, point: { x: 0, y: 1, z: 0.2 } },
      ],
      foundPartId: null,
      foundModuleIndex: 0,
      foundModuleStack: 'top',
      effectiveDoorId: null,
      foundDrawerId: null,
      primaryHitObject: selector,
      doorHitObject: null,
      doorHitGroup: null,
      primaryHitPoint: { x: 0, y: 1, z: 0.2 },
      doorHitPoint: null,
      moduleHitY: 1,
      doorHitY: null,
      primaryHitY: 1,
      hitIdentity: { moduleIndex: 0 } as any,
      hitUserData: null,
    },
  });

  assert.ok(labels.includes('80'));
  assert.ok(!labels.includes('100'));
});

test('viewer measurement resolves the shelf-to-shelf cavity instead of the full module height', () => {
  const wardrobe = createGroup();
  const selector = createMesh({
    width: 1,
    height: 2,
    depth: 0.55,
    userData: { isModuleSelector: true, moduleIndex: 0, __wpStack: 'top' },
    opacity: 0,
  });
  const backPanel = createMesh({
    width: 1,
    height: 2,
    depth: 0.01,
    z: -0.28,
    userData: { kind: 'backPanel' },
  });
  const lowerShelf = createMesh({
    width: 0.9,
    height: 0.02,
    depth: 0.45,
    y: 0.7,
    userData: { partId: 'module_shelf_0_g1', __wpShelfGroupPartId: 'all_shelves' },
  });
  const upperShelf = createMesh({
    width: 0.9,
    height: 0.02,
    depth: 0.45,
    y: 1.3,
    userData: { partId: 'module_shelf_0_g2', __wpShelfGroupPartId: 'all_shelves' },
  });
  wardrobe.add(selector);
  wardrobe.add(backPanel);
  wardrobe.add(lowerShelf);
  wardrobe.add(upperShelf);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      intersects: [
        { object: selector, point: { x: 0, y: 1, z: 0.2 } },
        { object: backPanel, point: { x: 0, y: 1, z: -0.28 } },
      ],
      foundPartId: null,
      foundModuleIndex: 0,
      foundModuleStack: 'top',
      effectiveDoorId: null,
      foundDrawerId: null,
      primaryHitObject: backPanel,
      doorHitObject: null,
      doorHitGroup: null,
      primaryHitPoint: { x: 0, y: 1, z: -0.28 },
      doorHitPoint: null,
      moduleHitY: 1,
      doorHitY: null,
      primaryHitY: 1,
      hitIdentity: { moduleIndex: 0 } as any,
      hitUserData: null,
    },
  });

  assert.ok(labels.includes('58'));
  assert.ok(!labels.includes('200'));
});

test('viewer measurement overlay is pushed to the camera-facing front plane and ignores depth', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 0.7,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      intersects: [{ object: door, point: { x: 0, y: 1, z: 0.01 } }],
      foundPartId: 'door_1_full',
      foundModuleIndex: null,
      foundModuleStack: 'top',
      effectiveDoorId: 'door_1_full',
      foundDrawerId: null,
      primaryHitObject: door,
      doorHitObject: door,
      doorHitGroup: door,
      primaryHitPoint: { x: 0, y: 1, z: 0.01 },
      doorHitPoint: { x: 0, y: 1, z: 0.01 },
      moduleHitY: null,
      doorHitY: 1,
      primaryHitY: 1,
      hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
      hitUserData: door.userData,
    },
  });

  const frame = wardrobe.children.find(child => child.name === 'wp-viewer-measurement-selection-frame');
  assert.ok(frame);
  assert.equal(frame.material.depthTest, false);
  assert.equal(frame.material.depthWrite, false);
  assert.ok(Math.abs(frame.geometry.points[0].z - 0.016) < 1e-9);
  assert.equal(
    wardrobe.children.filter(child => child.name === 'wp-viewer-measurement-selection-frame').length,
    1
  );
  assert.equal(
    wardrobe.children.filter(child => child.name === 'wp-viewer-measurement-selection-corner-ticks').length,
    0
  );

  const dimensionLine = wardrobe.children.find(
    child =>
      child.userData?.__wpViewerMeasurementOverlay && child.material && child.material !== frame.material
  );
  assert.ok(dimensionLine);
  assert.equal(dimensionLine.material.depthTest, false);
  assert.equal(dimensionLine.material.depthWrite, false);
});

test('viewer measurement ignores hangers, clothes, and rods as cavity split boundaries', () => {
  const wardrobe = createGroup();
  const selector = createMesh({
    width: 1,
    height: 2,
    depth: 0.55,
    userData: { isModuleSelector: true, moduleIndex: 0, __wpStack: 'top' },
    opacity: 0,
  });
  const upperShelf = createMesh({
    width: 0.9,
    height: 0.02,
    depth: 0.45,
    y: 1.3,
    userData: { partId: 'module_shelf_0_g2', __wpShelfGroupPartId: 'all_shelves' },
  });
  const hangerContent = createMesh({
    width: 0.65,
    height: 0.04,
    depth: 0.45,
    y: 0.62,
    userData: { __kind: 'hanging_hanger', __wpMeasurementIgnoreInteriorBoundary: true },
  });
  const clothesContent = createMesh({
    width: 0.7,
    height: 0.05,
    depth: 0.43,
    y: 0.86,
    userData: { __kind: 'hanging_cloth' },
  });
  const rod = createMesh({
    width: 0.85,
    height: 0.035,
    depth: 0.42,
    y: 0.95,
    userData: { __kind: 'wardrobe_rod' },
  });
  wardrobe.add(selector);
  wardrobe.add(upperShelf);
  wardrobe.add(hangerContent);
  wardrobe.add(clothesContent);
  wardrobe.add(rod);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      intersects: [
        { object: selector, point: { x: 0, y: 0.55, z: 0.2 } },
        { object: hangerContent, point: { x: 0, y: 0.55, z: 0.2 } },
      ],
      foundPartId: null,
      foundModuleIndex: 0,
      foundModuleStack: 'top',
      effectiveDoorId: null,
      foundDrawerId: null,
      primaryHitObject: hangerContent,
      doorHitObject: null,
      doorHitGroup: null,
      primaryHitPoint: { x: 0, y: 0.55, z: 0.2 },
      doorHitPoint: null,
      moduleHitY: 0.55,
      doorHitY: null,
      primaryHitY: 0.55,
      hitIdentity: { moduleIndex: 0 } as any,
      hitUserData: hangerContent.userData,
    },
  });

  assert.ok(labels.includes('129'));
  assert.ok(!labels.includes('24'));
  assert.ok(!labels.includes('32'));
});
