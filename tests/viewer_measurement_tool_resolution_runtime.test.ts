import test from 'node:test';
import assert from 'node:assert/strict';

import { FRONT_Z_EPSILON_M } from '../esm/native/services/viewer_measurement_tool_contracts.ts';
import {
  resolveViewerMeasurementResolution,
  resolveViewerMeasurementTarget,
} from '../esm/native/services/viewer_measurement_tool_resolution.ts';

class FakeVector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

function createFakeThree() {
  return {
    Vector3: FakeVector3,
    Box3: function FakeBox3() {},
  };
}

function createGroup(userData: Record<string, unknown> = {}) {
  return {
    type: 'Group',
    parent: null as any,
    children: [] as any[],
    position: new FakeVector3(),
    rotation: new FakeVector3(),
    scale: new FakeVector3(1, 1, 1),
    userData,
    add(obj: any) {
      obj.parent = this;
      this.children.push(obj);
    },
    traverse(fn: (obj: any) => void) {
      const visit = (node: any) => {
        fn(node);
        for (const child of node.children || []) visit(child);
      };
      visit(this);
    },
    worldToLocal(value: { x: number; y: number; z: number }) {
      return value;
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
  };
}

function createApp() {
  return {
    deps: { THREE: createFakeThree() },
    render: { camera: { position: new FakeVector3(0, 1, 3) } },
    services: { runtimeCache: { internalGridMap: Object.create(null) } },
  } as any;
}

function makeHitState(args: {
  target: any;
  intersects?: any[];
  point?: { x: number; y: number; z: number };
  moduleIndex?: number | null;
}) {
  const point = args.point || { x: 0, y: 1, z: 0 };
  return {
    intersects: (args.intersects || [{ object: args.target, point }]).map(item =>
      item.point ? item : { object: item, point }
    ),
    foundPartId: null,
    foundModuleIndex: args.moduleIndex ?? null,
    foundModuleStack: 'top',
    effectiveDoorId: null,
    foundDrawerId: null,
    primaryHitObject: args.target,
    doorHitObject: null,
    doorHitGroup: null,
    primaryHitPoint: point,
    doorHitPoint: null,
    moduleHitY: point.y,
    doorHitY: null,
    primaryHitY: point.y,
    hitIdentity: null,
    hitUserData: null,
  } as any;
}

function assertClose(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should equal ${expected}`);
}

test('resolveViewerMeasurementTarget prefers a real shelf over a transparent module selector', () => {
  const selector = createMesh({
    width: 1,
    height: 2,
    depth: 0.5,
    y: 1,
    userData: { isModuleSelector: true, moduleIndex: 0 },
    opacity: 0,
  });
  const shelf = createMesh({
    width: 1,
    height: 0.04,
    depth: 0.45,
    y: 1,
    userData: { __wpShelfGroupPartId: true, partId: 'shelf_1', moduleIndex: 0 },
  });

  assert.equal(
    resolveViewerMeasurementTarget(makeHitState({ target: selector, intersects: [selector, shelf] })),
    shelf
  );
});

test('resolveViewerMeasurementResolution resolves a shelf-bounded module cavity and ignores passive fittings', () => {
  const App = createApp();
  const THREE = App.deps.THREE;
  const wardrobeGroup = createGroup();
  const selector = createMesh({
    width: 1,
    height: 2,
    depth: 0.5,
    y: 1,
    userData: { isModuleSelector: true, moduleIndex: 0 },
  });
  const lowerShelf = createMesh({
    width: 1,
    height: 0.04,
    depth: 0.45,
    y: 0.5,
    userData: { __wpShelfGroupPartId: true, partId: 'shelf_lower', moduleIndex: 0 },
  });
  const upperShelf = createMesh({
    width: 1,
    height: 0.04,
    depth: 0.45,
    y: 1.5,
    userData: { __wpShelfGroupPartId: true, partId: 'shelf_upper', moduleIndex: 0 },
  });
  const hangingRod = createMesh({
    width: 0.02,
    height: 0.02,
    depth: 0.4,
    y: 1,
    userData: { kind: 'wardrobe_rod', moduleIndex: 0 },
  });
  wardrobeGroup.add(selector);
  wardrobeGroup.add(lowerShelf);
  wardrobeGroup.add(upperShelf);
  wardrobeGroup.add(hangingRod);

  App.services.runtimeCache.internalGridMap['0'] = {
    effectiveBottomY: 0,
    effectiveTopY: 2,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.5,
    internalZ: 0,
    woodThick: 0.04,
  };

  const resolution = resolveViewerMeasurementResolution({
    App,
    THREE,
    hitState: makeHitState({ target: selector, moduleIndex: 0, point: { x: 0, y: 1, z: 0 } }),
    wardrobeGroup: wardrobeGroup as any,
  });

  assert.ok(resolution);
  assert.equal(resolution.shouldMeasureInterior, true);
  assert.equal(resolution.target, selector);
  assert.equal(resolution.plane.kind, 'front');
  assertClose(resolution.box.centerY, 1);
  assertClose(resolution.box.height, 0.96);
});

test('resolveViewerMeasurementResolution returns a basis plane for corner pentagon doors', () => {
  const App = createApp();
  const THREE = App.deps.THREE;
  const wardrobeGroup = createGroup();
  const door = createGroup({
    partId: 'corner_door_1',
    __wpCornerPentDoor: true,
    __doorWidth: 0.8,
    __doorHeight: 2,
    __wpFrontThickness: 0.04,
    __doorMeshOffsetX: 0.1,
    __handleZSign: 1,
  });
  const slab = createMesh({ width: 0.8, height: 2, depth: 0.04 });
  door.add(slab);
  wardrobeGroup.add(door);

  const resolution = resolveViewerMeasurementResolution({
    App,
    THREE,
    hitState: makeHitState({ target: slab, point: { x: 0, y: 1, z: 0.02 } }),
    wardrobeGroup: wardrobeGroup as any,
  });

  assert.ok(resolution);
  assert.equal(resolution.target, door);
  assert.equal(resolution.plane.kind, 'front');
  assert.ok(resolution.plane.basis);
  assertClose(resolution.box.centerX, 0.1);
  assertClose(resolution.plane.normalValue, 0.02 + FRONT_Z_EPSILON_M);
});
