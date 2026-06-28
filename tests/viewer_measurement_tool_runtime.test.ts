import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getViewerMeasurementToolMode,
  setViewerMeasurementToolMode,
  tryHandleViewerMeasurementClick,
  tryHandleViewerMeasurementHover,
} from '../esm/native/services/viewer_measurement_tool.ts';

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
  const canvas = { style: { cursor: '' } };
  const document = {
    body: { style: { cursor: '' } },
    createElement() {
      return { style: {}, classList: { add() {}, remove() {} }, appendChild() {} };
    },
    querySelector() {
      return null;
    },
    querySelectorAll(selector: string) {
      return selector === 'canvas' ? [canvas] : [];
    },
  };
  const App: any = {
    deps: { THREE, browser: { document } },
    __canvas: canvas,
    __document: document,
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
              type: 'Line',
              parent: null as any,
              children: [] as any[],
              userData: {} as Record<string, unknown>,
              geometry: {
                points: [
                  { x: _from.x + _offset.x, y: _from.y + _offset.y, z: _from.z + _offset.z },
                  { x: _to.x + _offset.x, y: _to.y + _offset.y, z: _to.z + _offset.z },
                ],
                dispose() {},
              },
              material: {
                depthTest: true,
                depthWrite: true,
                clone() {
                  return { ...this };
                },
              },
            };
            const sprite = {
              type: 'Sprite',
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

function createRaycasterAt(pointOnFrontPlane: { x: number; y: number; z?: number }) {
  return {
    ray: {
      origin: { x: pointOnFrontPlane.x, y: pointOnFrontPlane.y, z: 3 },
      direction: { x: 0, y: 0, z: -1 },
    },
    setFromCamera() {},
    intersectObjects() {
      return [];
    },
  };
}

function createDoorPointHit(door: any, point: { x: number; y: number; z: number }) {
  return {
    intersects: [{ object: door, point }],
    foundPartId: 'door_1_full',
    foundModuleIndex: null,
    foundModuleStack: 'top' as const,
    effectiveDoorId: 'door_1_full',
    foundDrawerId: null,
    primaryHitObject: door,
    doorHitObject: door,
    doorHitGroup: door,
    primaryHitPoint: point,
    doorHitPoint: point,
    moduleHitY: null,
    doorHitY: point.y,
    primaryHitY: point.y,
    hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
    hitUserData: door.userData,
  };
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
  assert.ok(labels.includes('55'));
  assert.ok(!labels.includes('200'));
  const frame = wardrobe.children.find(child => child.name === 'wp-viewer-measurement-selection-frame');
  assert.ok(frame);
  for (const point of frame.geometry.points) {
    assert.ok(Math.abs(point.z - 0.281) < 1e-9);
  }
});

test('viewer measurement frame and guide lines are depth-tested while label boxes stay above parts', () => {
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
  assert.equal(frame.material.depthTest, true);
  assert.equal(frame.material.depthWrite, false);
  assert.deepEqual(labels, ['70', '200', '2']);
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
      child.type === 'Line' &&
      child.name !== 'wp-viewer-measurement-selection-frame' &&
      child.userData?.__wpViewerMeasurementOverlay &&
      child.material
  );
  assert.ok(dimensionLine);
  assert.equal(dimensionLine.material.depthTest, true);
  assert.equal(dimensionLine.material.depthWrite, false);

  const dimensionLines = wardrobe.children.filter(
    child =>
      child.type === 'Line' &&
      child.name !== 'wp-viewer-measurement-selection-frame' &&
      child.userData?.__wpViewerMeasurementOverlay
  );
  assert.equal(dimensionLines.length, 3);
  const depthLine = dimensionLines[2];
  assert.ok(depthLine.geometry.points.every((point: { x: number }) => Math.abs(point.x + 0.46) < 1e-9));
  assert.deepEqual(
    depthLine.geometry.points.map((point: { z: number }) => Number(point.z.toFixed(2))),
    [-0.01, 0.01]
  );

  const labelSprite = wardrobe.children.find(
    child => child.type === 'Sprite' && child.userData?.__wpViewerMeasurementOverlay && child.material
  );
  assert.ok(labelSprite);
  assert.equal(labelSprite.material.depthTest, false);
  assert.equal(labelSprite.material.depthWrite, false);
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

test('viewer measurement exits primary mode when clicking an empty canvas area', () => {
  const wardrobe = createGroup();
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  const modeCalls: Array<{ primary: string; opts: unknown; meta: Record<string, unknown> }> = [];
  App.actions = {
    mode: {
      set(primary: string, opts: unknown, meta: Record<string, unknown>) {
        modeCalls.push({ primary, opts, meta });
      },
    },
  };
  App.services.uiFeedback = {
    updateEditStateToast(value: unknown, active: boolean) {
      App.__lastToast = { value, active };
    },
  };

  tryHandleViewerMeasurementClick({ App, hitState: null });

  assert.equal(modeCalls.length, 1);
  assert.equal(modeCalls[0]?.primary, 'none');
  assert.equal(modeCalls[0]?.meta.source, 'viewerMeasurement:emptyClick');
  assert.deepEqual(App.__lastToast, { value: null, active: false });
});

test('viewer point measurement exits when the canvas click has no measurement target', () => {
  const wardrobe = createGroup();
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  const modeCalls: Array<{ primary: string; opts: unknown; meta: Record<string, unknown> }> = [];
  App.actions = {
    mode: {
      set(primary: string, opts: unknown, meta: Record<string, unknown>) {
        modeCalls.push({ primary, opts, meta });
      },
    },
  };
  App.services.uiFeedback = {
    updateEditStateToast(value: unknown, active: boolean) {
      App.__lastToast = { value, active };
    },
  };
  setViewerMeasurementToolMode(App, 'points', false);

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      intersects: [],
      foundPartId: null,
      foundModuleIndex: null,
      foundModuleStack: 'top',
      effectiveDoorId: null,
      foundDrawerId: null,
      primaryHitObject: null,
      doorHitObject: null,
      doorHitGroup: null,
      primaryHitPoint: null,
      doorHitPoint: null,
      moduleHitY: null,
      doorHitY: null,
      primaryHitY: null,
      hitIdentity: null,
      hitUserData: null,
    },
  });

  assert.equal(modeCalls.length, 1);
  assert.equal(modeCalls[0]?.primary, 'none');
  assert.equal(modeCalls[0]?.meta.source, 'viewerMeasurement:emptyClick');
  assert.deepEqual(App.__lastToast, { value: null, active: false });
});

test('viewer measurement uses the side plane for thin side panels', () => {
  const wardrobe = createGroup();
  const sidePanel = createMesh({
    width: 0.02,
    height: 2,
    depth: 0.58,
    x: 0.51,
    userData: { partId: 'right_side_panel' },
  });
  wardrobe.add(sidePanel);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      intersects: [{ object: sidePanel, point: { x: 0.51, y: 1, z: 0.29 } }],
      foundPartId: 'right_side_panel',
      foundModuleIndex: null,
      foundModuleStack: 'top',
      effectiveDoorId: null,
      foundDrawerId: null,
      primaryHitObject: sidePanel,
      doorHitObject: null,
      doorHitGroup: null,
      primaryHitPoint: { x: 0.51, y: 1, z: 0.29 },
      doorHitPoint: null,
      moduleHitY: null,
      doorHitY: null,
      primaryHitY: 1,
      hitIdentity: { partId: 'right_side_panel' } as any,
      hitUserData: sidePanel.userData,
    },
  });

  const frame = wardrobe.children.find(child => child.name === 'wp-viewer-measurement-selection-frame');
  assert.ok(frame);
  assert.deepEqual(labels, ['58', '200', '2']);
  for (const point of frame.geometry.points) {
    assert.ok(Math.abs(point.x - 0.526) < 1e-9);
  }
  const zs = frame.geometry.points.map((point: { z: number }) => point.z);
  assert.ok(Math.abs(Math.min(...zs) + 0.29) < 1e-9);
  assert.ok(Math.abs(Math.max(...zs) - 0.29) < 1e-9);
});

test('viewer measurement uses the top plane for thin horizontal boards', () => {
  const wardrobe = createGroup();
  const topPanel = createMesh({
    width: 1.2,
    height: 0.02,
    depth: 0.55,
    y: 2.01,
    userData: { partId: 'top_panel' },
  });
  wardrobe.add(topPanel);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      intersects: [{ object: topPanel, point: { x: 0, y: 2.02, z: 0 } }],
      foundPartId: 'top_panel',
      foundModuleIndex: null,
      foundModuleStack: 'top',
      effectiveDoorId: null,
      foundDrawerId: null,
      primaryHitObject: topPanel,
      doorHitObject: null,
      doorHitGroup: null,
      primaryHitPoint: { x: 0, y: 2.02, z: 0 },
      doorHitPoint: null,
      moduleHitY: null,
      doorHitY: null,
      primaryHitY: 2.02,
      hitIdentity: { partId: 'top_panel' } as any,
      hitUserData: topPanel.userData,
    },
  });

  const frame = wardrobe.children.find(child => child.name === 'wp-viewer-measurement-selection-frame');
  assert.ok(frame);
  assert.deepEqual(labels, ['120', '55', '2']);
  for (const point of frame.geometry.points) {
    assert.ok(Math.abs(point.y - 2.026) < 1e-9);
  }
  const xs = frame.geometry.points.map((point: { x: number }) => point.x);
  const zs = frame.geometry.points.map((point: { z: number }) => point.z);
  assert.ok(Math.abs(Math.min(...xs) + 0.6) < 1e-9);
  assert.ok(Math.abs(Math.max(...xs) - 0.6) < 1e-9);
  assert.ok(Math.abs(Math.min(...zs) + 0.263) < 1e-9);
  assert.ok(Math.abs(Math.max(...zs) - 0.275) < 1e-9);
});

test('viewer point measurement snaps the second click to the nearest straight axis', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      intersects: [{ object: door, point: { x: -0.25, y: 0.4, z: 0.01 } }],
      foundPartId: 'door_1_full',
      foundModuleIndex: null,
      foundModuleStack: 'top',
      effectiveDoorId: 'door_1_full',
      foundDrawerId: null,
      primaryHitObject: door,
      doorHitObject: door,
      doorHitGroup: door,
      primaryHitPoint: { x: -0.25, y: 0.4, z: 0.01 },
      doorHitPoint: { x: -0.25, y: 0.4, z: 0.01 },
      moduleHitY: null,
      doorHitY: 0.4,
      primaryHitY: 0.4,
      hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
      hitUserData: door.userData,
    },
  });

  assert.equal(labels.length, 0);
  assert.equal(
    wardrobe.children.filter(child =>
      String(child.name || '').startsWith('wp-viewer-measurement-point-draft-start')
    ).length,
    2
  );

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      intersects: [{ object: door, point: { x: 0.45, y: 0.5, z: 0.01 } }],
      foundPartId: 'door_1_full',
      foundModuleIndex: null,
      foundModuleStack: 'top',
      effectiveDoorId: 'door_1_full',
      foundDrawerId: null,
      primaryHitObject: door,
      doorHitObject: door,
      doorHitGroup: door,
      primaryHitPoint: { x: 0.45, y: 0.5, z: 0.01 },
      doorHitPoint: { x: 0.45, y: 0.5, z: 0.01 },
      moduleHitY: null,
      doorHitY: 0.5,
      primaryHitY: 0.5,
      hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
      hitUserData: door.userData,
    },
  });

  assert.ok(labels.includes('70'));
  assert.ok(!labels.includes('10'));
  const dimensionLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(dimensionLine);
  const points = dimensionLine.geometry.points;
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[0].y - points[1].y) < 1e-9);
  assert.ok(Math.abs(points[0].x + 0.25) < 1e-9);
  assert.ok(Math.abs(points[1].x - 0.45) < 1e-9);
  assert.equal(dimensionLine.material.color, 0x16a34a);
});

test('viewer point measurement keeps vertical point distances vertical when that delta is dominant', () => {
  const wardrobe = createGroup();
  const sidePanel = createMesh({
    width: 0.02,
    height: 2,
    depth: 0.58,
    x: 0.51,
    userData: { partId: 'right_side_panel' },
  });
  wardrobe.add(sidePanel);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const firstHit = {
    intersects: [{ object: sidePanel, point: { x: 0.51, y: 0.25, z: -0.2 } }],
    foundPartId: 'right_side_panel',
    foundModuleIndex: null,
    foundModuleStack: 'top' as const,
    effectiveDoorId: null,
    foundDrawerId: null,
    primaryHitObject: sidePanel,
    doorHitObject: null,
    doorHitGroup: null,
    primaryHitPoint: { x: 0.51, y: 0.25, z: -0.2 },
    doorHitPoint: null,
    moduleHitY: null,
    doorHitY: null,
    primaryHitY: 0.25,
    hitIdentity: { partId: 'right_side_panel' } as any,
    hitUserData: sidePanel.userData,
  };
  tryHandleViewerMeasurementClick({ App, hitState: firstHit });
  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      ...firstHit,
      intersects: [{ object: sidePanel, point: { x: 0.51, y: 0.85, z: -0.15 } }],
      primaryHitPoint: { x: 0.51, y: 0.85, z: -0.15 },
      primaryHitY: 0.85,
    },
  });

  assert.ok(labels.includes('60'));
  assert.ok(!labels.includes('15'));
  const dimensionLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(dimensionLine);
  const points = dimensionLine.geometry.points;
  assert.ok(Math.abs(points[0].z - points[1].z) < 1e-9);
  assert.ok(Math.abs(points[0].y - 0.25) < 1e-9);
  assert.ok(Math.abs(points[1].y - 0.85) < 1e-9);
});

test('viewer point measurement previews a locked line and cursor X after the first click', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const firstHit = {
    intersects: [{ object: door, point: { x: -0.25, y: 0.4, z: 0.01 } }],
    foundPartId: 'door_1_full',
    foundModuleIndex: null,
    foundModuleStack: 'top' as const,
    effectiveDoorId: 'door_1_full',
    foundDrawerId: null,
    primaryHitObject: door,
    doorHitObject: door,
    doorHitGroup: door,
    primaryHitPoint: { x: -0.25, y: 0.4, z: 0.01 },
    doorHitPoint: { x: -0.25, y: 0.4, z: 0.01 },
    moduleHitY: null,
    doorHitY: 0.4,
    primaryHitY: 0.4,
    hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
    hitUserData: door.userData,
  };
  tryHandleViewerMeasurementClick({ App, hitState: firstHit });

  const previewHandled = tryHandleViewerMeasurementHover({
    App,
    hitState: {
      ...firstHit,
      intersects: [{ object: door, point: { x: 0.45, y: 0.5, z: 0.01 } }],
      primaryHitPoint: { x: 0.45, y: 0.5, z: 0.01 },
      doorHitPoint: { x: 0.45, y: 0.5, z: 0.01 },
      doorHitY: 0.5,
      primaryHitY: 0.5,
    },
  });

  assert.equal(previewHandled, true);
  assert.ok(labels.includes('70'));
  assert.equal(
    wardrobe.children.filter(child =>
      String(child.name || '').startsWith('wp-viewer-measurement-point-draft-cursor')
    ).length,
    2
  );
  const previewLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(previewLine);
  const points = previewLine.geometry.points;
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[0].y - points[1].y) < 1e-9);
});

test('viewer point measurement clips an outside diagonal second point to the wardrobe edge', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const firstHit = {
    intersects: [{ object: door, point: { x: -0.1, y: 0.4, z: 0.01 } }],
    foundPartId: 'door_1_full',
    foundModuleIndex: null,
    foundModuleStack: 'top' as const,
    effectiveDoorId: 'door_1_full',
    foundDrawerId: null,
    primaryHitObject: door,
    doorHitObject: door,
    doorHitGroup: door,
    primaryHitPoint: { x: -0.1, y: 0.4, z: 0.01 },
    doorHitPoint: { x: -0.1, y: 0.4, z: 0.01 },
    moduleHitY: null,
    doorHitY: 0.4,
    primaryHitY: 0.4,
    hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
    hitUserData: door.userData,
  };
  tryHandleViewerMeasurementClick({ App, hitState: firstHit });
  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      ...firstHit,
      intersects: [{ object: door, point: { x: -0.7, y: 0.68, z: 0.01 } }],
      primaryHitPoint: { x: -0.7, y: 0.68, z: 0.01 },
      doorHitPoint: { x: -0.7, y: 0.68, z: 0.01 },
      doorHitY: 0.68,
      primaryHitY: 0.68,
    },
  });

  assert.ok(labels.includes('44'));
  const dimensionLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(dimensionLine);
  const points = dimensionLine.geometry.points;
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[0].x + 0.1) < 1e-9);
  assert.ok(Math.abs(points[1].x + 0.5) < 1e-9);
  assert.ok(Math.abs(points[1].y - 0.5866666666666667) < 1e-9);
  assert.ok(Math.abs(points[0].y - points[1].y) > 0.18);
  assert.notEqual(dimensionLine.material.color, 0x16a34a);
});

test('viewer point measurement previews against the wardrobe edge while hovering outside empty space', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const firstHit = {
    intersects: [{ object: door, point: { x: -0.1, y: 0.4, z: 0.01 } }],
    foundPartId: 'door_1_full',
    foundModuleIndex: null,
    foundModuleStack: 'top' as const,
    effectiveDoorId: 'door_1_full',
    foundDrawerId: null,
    primaryHitObject: door,
    doorHitObject: door,
    doorHitGroup: door,
    primaryHitPoint: { x: -0.1, y: 0.4, z: 0.01 },
    doorHitPoint: { x: -0.1, y: 0.4, z: 0.01 },
    moduleHitY: null,
    doorHitY: 0.4,
    primaryHitY: 0.4,
    hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
    hitUserData: door.userData,
  };
  tryHandleViewerMeasurementClick({ App, hitState: firstHit });

  const handled = tryHandleViewerMeasurementHover({
    App,
    hitState: null,
    raycaster: createRaycasterAt({ x: -0.7, y: 0.72 }),
    mouse: { x: 0, y: 0 },
    ndcX: -1.05,
    ndcY: 0,
  });

  assert.equal(handled, true);
  assert.ok(labels.includes('45'));
  const previewLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(previewLine);
  const points = previewLine.geometry.points;
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[1].x + 0.5) < 1e-9);
  assert.ok(Math.abs(points[1].y - 0.6133333333333333) < 1e-9);
  assert.ok(Math.abs(points[0].y - points[1].y) > 0.2);
});

test('viewer point measurement keeps straight snap while previewing beyond wardrobe bounds', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  tryHandleViewerMeasurementClick({
    App,
    hitState: createDoorPointHit(door, { x: -0.1, y: 0.4, z: 0.01 }),
  });

  const handled = tryHandleViewerMeasurementHover({
    App,
    hitState: null,
    raycaster: createRaycasterAt({ x: -0.7, y: 0.405 }),
    mouse: { x: 0, y: 0 },
    ndcX: -1.05,
    ndcY: 0,
  });

  assert.equal(handled, true);
  assert.ok(labels.includes('40'));
  const previewLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(previewLine);
  const points = previewLine.geometry.points;
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[1].x + 0.5) < 1e-9);
  assert.ok(Math.abs(points[0].y - points[1].y) < 1e-9);
  assert.equal(previewLine.material.color, 0x16a34a);
});

test('viewer point measurement keeps straight snap for an outside final click', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  tryHandleViewerMeasurementClick({
    App,
    hitState: createDoorPointHit(door, { x: -0.1, y: 0.4, z: 0.01 }),
  });
  tryHandleViewerMeasurementClick({
    App,
    hitState: null,
    raycaster: createRaycasterAt({ x: -0.7, y: 0.405 }),
    mouse: { x: 0, y: 0 },
    ndcX: -1.05,
    ndcY: 0,
  });

  assert.ok(labels.includes('40'));
  const dimensionLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(dimensionLine);
  const points = dimensionLine.geometry.points;
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[1].x + 0.5) < 1e-9);
  assert.ok(Math.abs(points[0].y - points[1].y) < 1e-9);
  assert.equal(dimensionLine.material.color, 0x16a34a);
});

test('viewer point measurement preview uses the fixed plane ray instead of side hits', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const firstHit = {
    intersects: [{ object: door, point: { x: -0.1, y: 0.4, z: 0.01 } }],
    foundPartId: 'door_1_full',
    foundModuleIndex: null,
    foundModuleStack: 'top' as const,
    effectiveDoorId: 'door_1_full',
    foundDrawerId: null,
    primaryHitObject: door,
    doorHitObject: door,
    doorHitGroup: door,
    primaryHitPoint: { x: -0.1, y: 0.4, z: 0.01 },
    doorHitPoint: { x: -0.1, y: 0.4, z: 0.01 },
    moduleHitY: null,
    doorHitY: 0.4,
    primaryHitY: 0.4,
    hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
    hitUserData: door.userData,
  };
  tryHandleViewerMeasurementClick({ App, hitState: firstHit });

  const handled = tryHandleViewerMeasurementHover({
    App,
    hitState: {
      ...firstHit,
      intersects: [{ object: door, point: { x: 0.49, y: 0.95, z: 0.01 } }],
      primaryHitPoint: { x: 0.49, y: 0.95, z: 0.01 },
      doorHitPoint: { x: 0.49, y: 0.95, z: 0.01 },
      doorHitY: 0.95,
      primaryHitY: 0.95,
    },
    raycaster: createRaycasterAt({ x: -0.7, y: 0.72 }),
    mouse: { x: 0, y: 0 },
    ndcX: -1.05,
    ndcY: 0,
  });

  assert.equal(handled, true);
  assert.ok(labels.includes('45'));
  const previewLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(previewLine);
  const points = previewLine.geometry.points;
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[1].x + 0.5) < 1e-9);
  assert.ok(Math.abs(points[1].y - 0.6133333333333333) < 1e-9);
  assert.ok(Math.abs(points[0].y - points[1].y) > 0.2);
});

test('viewer point measurement final click uses the fixed plane ray instead of side hits', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const firstHit = {
    intersects: [{ object: door, point: { x: -0.1, y: 0.4, z: 0.01 } }],
    foundPartId: 'door_1_full',
    foundModuleIndex: null,
    foundModuleStack: 'top' as const,
    effectiveDoorId: 'door_1_full',
    foundDrawerId: null,
    primaryHitObject: door,
    doorHitObject: door,
    doorHitGroup: door,
    primaryHitPoint: { x: -0.1, y: 0.4, z: 0.01 },
    doorHitPoint: { x: -0.1, y: 0.4, z: 0.01 },
    moduleHitY: null,
    doorHitY: 0.4,
    primaryHitY: 0.4,
    hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
    hitUserData: door.userData,
  };
  tryHandleViewerMeasurementClick({ App, hitState: firstHit });

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      ...firstHit,
      intersects: [{ object: door, point: { x: 0.49, y: 0.95, z: 0.01 } }],
      primaryHitPoint: { x: 0.49, y: 0.95, z: 0.01 },
      doorHitPoint: { x: 0.49, y: 0.95, z: 0.01 },
      doorHitY: 0.95,
      primaryHitY: 0.95,
    },
    raycaster: createRaycasterAt({ x: -0.7, y: 0.72 }),
    mouse: { x: 0, y: 0 },
    ndcX: -1.05,
    ndcY: 0,
  });

  assert.ok(labels.includes('45'));
  const dimensionLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(dimensionLine);
  const points = dimensionLine.geometry.points;
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[1].x + 0.5) < 1e-9);
  assert.ok(Math.abs(points[1].y - 0.6133333333333333) < 1e-9);
  assert.ok(Math.abs(points[0].y - points[1].y) > 0.2);
  assert.notEqual(dimensionLine.material.color, 0x16a34a);
});

test('viewer point measurement vertical final click uses the fixed plane ray instead of lower hits', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const firstHit = {
    intersects: [{ object: door, point: { x: 0.1, y: 0.4, z: 0.01 } }],
    foundPartId: 'door_1_full',
    foundModuleIndex: null,
    foundModuleStack: 'top' as const,
    effectiveDoorId: 'door_1_full',
    foundDrawerId: null,
    primaryHitObject: door,
    doorHitObject: door,
    doorHitGroup: door,
    primaryHitPoint: { x: 0.1, y: 0.4, z: 0.01 },
    doorHitPoint: { x: 0.1, y: 0.4, z: 0.01 },
    moduleHitY: null,
    doorHitY: 0.4,
    primaryHitY: 0.4,
    hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
    hitUserData: door.userData,
  };
  tryHandleViewerMeasurementClick({ App, hitState: firstHit });

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      ...firstHit,
      intersects: [{ object: door, point: { x: 0.49, y: -0.9, z: 0.01 } }],
      primaryHitPoint: { x: 0.49, y: -0.9, z: 0.01 },
      doorHitPoint: { x: 0.49, y: -0.9, z: 0.01 },
      doorHitY: -0.9,
      primaryHitY: -0.9,
    },
    raycaster: createRaycasterAt({ x: 0.23, y: 1.4 }),
    mouse: { x: 0, y: 0 },
    ndcX: 0.3,
    ndcY: 1.1,
  });

  assert.ok(labels.includes('61'));
  const dimensionLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(dimensionLine);
  const points = dimensionLine.geometry.points;
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[1].y - 1) < 1e-9);
  assert.ok(Math.abs(points[1].x - 0.178) < 1e-9);
  assert.ok(Math.abs(points[0].x - points[1].x) > 0.07);
  assert.notEqual(dimensionLine.material.color, 0x16a34a);
});

test('viewer point measurement treats front edge clicks on side panels as the wardrobe front plane', () => {
  const wardrobe = createGroup();
  const cabinetBounds = createMesh({
    width: 1,
    height: 2,
    depth: 0.58,
    userData: { partId: 'cabinet_bounds' },
  });
  const sidePanel = createMesh({
    width: 0.02,
    height: 2,
    depth: 0.58,
    x: 0.51,
    userData: { partId: 'right_side_panel' },
  });
  wardrobe.add(cabinetBounds);
  wardrobe.add(sidePanel);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const handled = tryHandleViewerMeasurementClick({
    App,
    hitState: {
      intersects: [{ object: sidePanel, point: { x: 0.52, y: 1, z: 0.29 } }],
      foundPartId: 'right_side_panel',
      foundModuleIndex: null,
      foundModuleStack: 'top',
      effectiveDoorId: null,
      foundDrawerId: null,
      primaryHitObject: sidePanel,
      doorHitObject: null,
      doorHitGroup: null,
      primaryHitPoint: { x: 0.52, y: 1, z: 0.29 },
      doorHitPoint: null,
      moduleHitY: null,
      doorHitY: null,
      primaryHitY: 1,
      hitIdentity: { partId: 'right_side_panel' } as any,
      hitUserData: sidePanel.userData,
    },
  });

  assert.equal(handled, true);
  const marker = wardrobe.children.find(child =>
    String(child.name || '').startsWith('wp-viewer-measurement-point-draft-start')
  );
  assert.ok(marker);
  const points = marker.geometry.points;
  assert.ok(points.every((point: { z: number }) => Math.abs(point.z - 0.296) < 1e-9));
  assert.ok(Math.abs(points[0].x - points[1].x) > 0.02);
});

test('viewer point measurement treats front edge clicks on top boards as the wardrobe front plane', () => {
  const wardrobe = createGroup();
  const cabinetBounds = createMesh({
    width: 1,
    height: 2,
    depth: 0.58,
    userData: { partId: 'cabinet_bounds' },
  });
  const topPanel = createMesh({
    width: 1,
    height: 0.02,
    depth: 0.58,
    y: 2.01,
    userData: { partId: 'top_panel' },
  });
  wardrobe.add(cabinetBounds);
  wardrobe.add(topPanel);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const handled = tryHandleViewerMeasurementClick({
    App,
    hitState: {
      intersects: [{ object: topPanel, point: { x: 0, y: 2.02, z: 0.29 } }],
      foundPartId: 'top_panel',
      foundModuleIndex: null,
      foundModuleStack: 'top',
      effectiveDoorId: null,
      foundDrawerId: null,
      primaryHitObject: topPanel,
      doorHitObject: null,
      doorHitGroup: null,
      primaryHitPoint: { x: 0, y: 2.02, z: 0.29 },
      doorHitPoint: null,
      moduleHitY: null,
      doorHitY: null,
      primaryHitY: 2.02,
      hitIdentity: { partId: 'top_panel' } as any,
      hitUserData: topPanel.userData,
    },
  });

  assert.equal(handled, true);
  const marker = wardrobe.children.find(child =>
    String(child.name || '').startsWith('wp-viewer-measurement-point-draft-start')
  );
  assert.ok(marker);
  const points = marker.geometry.points;
  assert.ok(points.every((point: { z: number }) => Math.abs(point.z - 0.296) < 1e-9));
  assert.ok(Math.abs(points[0].x - points[1].x) > 0.02);
});

test('viewer point measurement starts on the wardrobe edge from a near-empty outside click', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const handled = tryHandleViewerMeasurementClick({
    App,
    hitState: null,
    raycaster: createRaycasterAt({ x: -0.53, y: 0.4 }),
    mouse: { x: 0, y: 0 },
    ndcX: -1.01,
    ndcY: 0,
  });

  assert.equal(handled, true);
  assert.equal(labels.length, 0);
  const marker = wardrobe.children.find(child =>
    String(child.name || '').startsWith('wp-viewer-measurement-point-draft-start')
  );
  assert.ok(marker);
  const points = marker.geometry.points;
  assert.ok(points.every((point: { x: number }) => Math.abs(point.x + 0.5) < 0.02));
});

test('viewer point measurement snaps an inside-near-edge start click to the wardrobe edge', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  tryHandleViewerMeasurementClick({
    App,
    hitState: createDoorPointHit(door, { x: -0.47, y: 0.4, z: 0.01 }),
  });
  tryHandleViewerMeasurementClick({
    App,
    hitState: createDoorPointHit(door, { x: 0, y: 0.4, z: 0.01 }),
  });

  assert.ok(labels.includes('50'));
  const dimensionLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(dimensionLine);
  const points = dimensionLine.geometry.points;
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[0].x + 0.5) < 1e-9);
  assert.ok(Math.abs(points[1].x) < 1e-9);
  assert.ok(Math.abs(points[0].y - points[1].y) < 1e-9);
});

test('viewer point measurement allows diagonal distances when they are not close to straight', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const firstHit = {
    intersects: [{ object: door, point: { x: -0.25, y: 0.4, z: 0.01 } }],
    foundPartId: 'door_1_full',
    foundModuleIndex: null,
    foundModuleStack: 'top' as const,
    effectiveDoorId: 'door_1_full',
    foundDrawerId: null,
    primaryHitObject: door,
    doorHitObject: door,
    doorHitGroup: door,
    primaryHitPoint: { x: -0.25, y: 0.4, z: 0.01 },
    doorHitPoint: { x: -0.25, y: 0.4, z: 0.01 },
    moduleHitY: null,
    doorHitY: 0.4,
    primaryHitY: 0.4,
    hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
    hitUserData: door.userData,
  };
  tryHandleViewerMeasurementClick({ App, hitState: firstHit });
  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      ...firstHit,
      intersects: [{ object: door, point: { x: 0.15, y: 0.7, z: 0.01 } }],
      primaryHitPoint: { x: 0.15, y: 0.7, z: 0.01 },
      doorHitPoint: { x: 0.15, y: 0.7, z: 0.01 },
      doorHitY: 0.7,
      primaryHitY: 0.7,
    },
  });

  assert.ok(labels.includes('50'));
  const dimensionLine = wardrobe.children.find(
    child => child.type === 'Line' && child.userData?.__wpViewerMeasurementOverlay && !child.name
  );
  assert.ok(dimensionLine);
  const points = dimensionLine.geometry.points;
  assert.ok(Math.abs(points[0].x - points[1].x) > 0.39);
  assert.ok(Math.abs(points[0].y - points[1].y) > 0.29);
  assert.notEqual(dimensionLine.material.color, 0x16a34a);
});

test('viewer point measurement keeps the precision cursor for every click and hover cycle', () => {
  const wardrobe = createGroup();
  const door = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    userData: { partId: 'door_1_full' },
  });
  wardrobe.add(door);
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);
  setViewerMeasurementToolMode(App, 'points', false);

  const firstHit = {
    intersects: [{ object: door, point: { x: -0.25, y: 0.4, z: 0.01 } }],
    foundPartId: 'door_1_full',
    foundModuleIndex: null,
    foundModuleStack: 'top' as const,
    effectiveDoorId: 'door_1_full',
    foundDrawerId: null,
    primaryHitObject: door,
    doorHitObject: door,
    doorHitGroup: door,
    primaryHitPoint: { x: -0.25, y: 0.4, z: 0.01 },
    doorHitPoint: { x: -0.25, y: 0.4, z: 0.01 },
    moduleHitY: null,
    doorHitY: 0.4,
    primaryHitY: 0.4,
    hitIdentity: { partId: 'door_1_full', doorId: 'door_1_full' } as any,
    hitUserData: door.userData,
  };

  assert.match(App.__canvas.style.cursor, /crosshair/);
  tryHandleViewerMeasurementClick({ App, hitState: firstHit });
  App.__canvas.style.cursor = 'grab';
  tryHandleViewerMeasurementHover({
    App,
    hitState: {
      ...firstHit,
      intersects: [{ object: door, point: { x: 0.45, y: 0.47, z: 0.01 } }],
      primaryHitPoint: { x: 0.45, y: 0.47, z: 0.01 },
      doorHitPoint: { x: 0.45, y: 0.47, z: 0.01 },
      doorHitY: 0.47,
      primaryHitY: 0.47,
    },
  });
  assert.match(App.__canvas.style.cursor, /crosshair/);

  tryHandleViewerMeasurementClick({
    App,
    hitState: {
      ...firstHit,
      intersects: [{ object: door, point: { x: 0.45, y: 0.47, z: 0.01 } }],
      primaryHitPoint: { x: 0.45, y: 0.47, z: 0.01 },
      doorHitPoint: { x: 0.45, y: 0.47, z: 0.01 },
      doorHitY: 0.47,
      primaryHitY: 0.47,
    },
  });
  App.__canvas.style.cursor = 'grab';
  tryHandleViewerMeasurementHover({ App, hitState: firstHit });
  assert.match(App.__canvas.style.cursor, /crosshair/);
});

test('viewer measurement tool mode is cached and defaults back to part when invalid', () => {
  const wardrobe = createGroup();
  const labels: string[] = [];
  const App = createApp(wardrobe, labels);

  assert.equal(getViewerMeasurementToolMode(App), 'part');
  setViewerMeasurementToolMode(App, 'points', false);
  assert.equal(getViewerMeasurementToolMode(App), 'points');
  App.render.cache.__wpViewerMeasurementToolMode = 'bad-value';
  assert.equal(getViewerMeasurementToolMode(App), 'part');
});
