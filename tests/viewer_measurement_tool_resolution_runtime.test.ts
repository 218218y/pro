import test from 'node:test';
import assert from 'node:assert/strict';

import { FRONT_Z_EPSILON_M } from '../esm/native/services/viewer_measurement_tool_contracts.ts';
import { resolveViewerMeasurementPartLabel } from '../esm/native/services/viewer_measurement_part_label.ts';
import { createViewerMeasurementGeometryRuntime } from '../esm/native/services/viewer_measurement_geometry_runtime.ts';
import {
  resolvePointMeasurementStart,
  resolvePointMeasurementStartFromPointer,
} from '../esm/native/services/viewer_measurement_tool_point_resolution.ts';
import {
  hasVisibleFrontPlaneOcclusion,
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

function readFakeNumber(value: unknown, key: string): number | null {
  const rec = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  const raw = rec ? rec[key] : null;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function readFakeWorldPosition(node: any): { x: number; y: number; z: number } {
  let x = 0;
  let y = 0;
  let z = 0;
  let current: any = node;
  while (current) {
    x += readFakeNumber(current.position, 'x') ?? 0;
    y += readFakeNumber(current.position, 'y') ?? 0;
    z += readFakeNumber(current.position, 'z') ?? 0;
    current = current.parent || null;
  }
  return { x, y, z };
}

class FakeBox3 {
  min = new FakeVector3(Infinity, Infinity, Infinity);
  max = new FakeVector3(-Infinity, -Infinity, -Infinity);

  setFromObject(obj: any) {
    let found = false;
    const visit = (node: any) => {
      if (!node || node.visible === false) return;
      const params = node.geometry?.parameters;
      const width = readFakeNumber(params, 'width');
      const height = readFakeNumber(params, 'height');
      const depth = readFakeNumber(params, 'depth');
      if (width != null && height != null && depth != null && width > 0 && height > 0 && depth > 0) {
        const center = readFakeWorldPosition(node);
        this.min.x = Math.min(this.min.x, center.x - width / 2);
        this.max.x = Math.max(this.max.x, center.x + width / 2);
        this.min.y = Math.min(this.min.y, center.y - height / 2);
        this.max.y = Math.max(this.max.y, center.y + height / 2);
        this.min.z = Math.min(this.min.z, center.z - depth / 2);
        this.max.z = Math.max(this.max.z, center.z + depth / 2);
        found = true;
      }
      for (const child of node.children || []) visit(child);
    };
    visit(obj);
    if (!found) {
      this.min = new FakeVector3(0, 0, 0);
      this.max = new FakeVector3(0, 0, 0);
    }
    return this;
  }
}

function createFakeThree() {
  return {
    Vector3: FakeVector3,
    Box3: FakeBox3,
  };
}

function createGroup(userData: Record<string, unknown> = {}) {
  return {
    type: 'Group',
    parent: null as any,
    children: [] as any[],
    visible: true,
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
  visible?: boolean;
  materialVisible?: boolean;
  opacity?: number;
}) {
  return {
    type: 'Mesh',
    parent: null as any,
    children: [] as any[],
    visible: args.visible ?? true,
    geometry: { parameters: { width: args.width, height: args.height, depth: args.depth } },
    position: new FakeVector3(args.x ?? 0, args.y ?? 0, args.z ?? 0),
    rotation: new FakeVector3(),
    scale: new FakeVector3(1, 1, 1),
    material: { visible: args.materialVisible ?? true, opacity: args.opacity ?? 1 },
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
  foundDrawerId?: string | null;
  hitIdentity?: Record<string, unknown> | null;
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
    foundDrawerId: args.foundDrawerId ?? null,
    primaryHitObject: args.target,
    doorHitObject: null,
    doorHitGroup: null,
    primaryHitPoint: point,
    doorHitPoint: null,
    moduleHitY: point.y,
    doorHitY: null,
    primaryHitY: point.y,
    hitIdentity: args.hitIdentity ?? null,
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
    runtime: createViewerMeasurementGeometryRuntime(App),
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

test('resolveViewerMeasurementResolution gives sibling cavities distinct measurement keys under one module target', () => {
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
  wardrobeGroup.add(selector);
  wardrobeGroup.add(lowerShelf);
  wardrobeGroup.add(upperShelf);

  App.services.runtimeCache.internalGridMap['0'] = {
    effectiveBottomY: 0,
    effectiveTopY: 2,
    innerW: 1,
    internalCenterX: 0,
    internalDepth: 0.5,
    internalZ: 0,
    woodThick: 0.04,
  };

  const lower = resolveViewerMeasurementResolution({
    runtime: createViewerMeasurementGeometryRuntime(App),
    THREE,
    hitState: makeHitState({ target: selector, moduleIndex: 0, point: { x: 0, y: 0.25, z: 0 } }),
    wardrobeGroup: wardrobeGroup as any,
  });
  const middle = resolveViewerMeasurementResolution({
    runtime: createViewerMeasurementGeometryRuntime(App),
    THREE,
    hitState: makeHitState({ target: selector, moduleIndex: 0, point: { x: 0, y: 1, z: 0 } }),
    wardrobeGroup: wardrobeGroup as any,
  });

  assert.ok(lower);
  assert.ok(middle);
  assert.equal(lower.targetKey, '0');
  assert.equal(middle.targetKey, '0');
  assert.notEqual(lower.measurementKey, middle.measurementKey);
});

test('resolveViewerMeasurementResolution ignores hidden shelves as cavity boundaries', () => {
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
  const hiddenShelf = createMesh({
    width: 1,
    height: 0.04,
    depth: 0.45,
    y: 1,
    visible: false,
    userData: { __wpShelfGroupPartId: true, partId: 'hidden_shelf', moduleIndex: 0 },
  });
  const hiddenMaterialShelf = createMesh({
    width: 1,
    height: 0.04,
    depth: 0.45,
    y: 1.25,
    materialVisible: false,
    userData: { __wpShelfGroupPartId: true, partId: 'hidden_material_shelf', moduleIndex: 0 },
  });
  const transparentShelf = createMesh({
    width: 1,
    height: 0.04,
    depth: 0.45,
    y: 1.5,
    opacity: 0,
    userData: { __wpShelfGroupPartId: true, partId: 'transparent_shelf', moduleIndex: 0 },
  });
  wardrobeGroup.add(selector);
  wardrobeGroup.add(hiddenShelf);
  wardrobeGroup.add(hiddenMaterialShelf);
  wardrobeGroup.add(transparentShelf);

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
    runtime: createViewerMeasurementGeometryRuntime(App),
    THREE,
    hitState: makeHitState({ target: selector, moduleIndex: 0, point: { x: 0, y: 0.75, z: 0 } }),
    wardrobeGroup: wardrobeGroup as any,
  });

  assert.ok(resolution);
  assert.equal(resolution.shouldMeasureInterior, true);
  assertClose(resolution.box.centerY, 1);
  assertClose(resolution.box.height, 2);
});

test('resolveViewerMeasurementResolution measures profile door visual branches as one complete door face', () => {
  const App = createApp();
  const THREE = App.deps.THREE;
  const wardrobeGroup = createGroup();
  const doorGroup = createGroup({
    partId: 'd1_full',
    __doorWidth: 0.7,
    __doorHeight: 2,
    __doorMeshOffsetX: 0,
  });
  const profileVisual = createGroup();
  const centerPanel = createMesh({
    width: 0.42,
    height: 1.72,
    depth: 0.012,
    z: -0.004,
    userData: { partId: 'd1_full', __doorVisualRole: 'door_profile_center_panel' },
  });
  const leftRail = createMesh({
    width: 0.14,
    height: 2,
    depth: 0.02,
    x: -0.28,
    userData: { partId: 'd1_full', __doorVisualRole: 'door_profile_outer_left' },
  });
  const rightRail = createMesh({
    width: 0.14,
    height: 2,
    depth: 0.02,
    x: 0.28,
    userData: { partId: 'd1_full', __doorVisualRole: 'door_profile_outer_right' },
  });
  const topRail = createMesh({
    width: 0.7,
    height: 0.14,
    depth: 0.02,
    y: 0.93,
    userData: { partId: 'd1_full', __doorVisualRole: 'door_profile_outer_top' },
  });
  const bottomRail = createMesh({
    width: 0.7,
    height: 0.14,
    depth: 0.02,
    y: -0.93,
    userData: { partId: 'd1_full', __doorVisualRole: 'door_profile_outer_bottom' },
  });
  profileVisual.add(centerPanel);
  profileVisual.add(leftRail);
  profileVisual.add(rightRail);
  profileVisual.add(topRail);
  profileVisual.add(bottomRail);
  doorGroup.add(profileVisual);
  wardrobeGroup.add(doorGroup);

  const selector = createMesh({
    width: 0.44,
    height: 1.4,
    depth: 0.3,
    y: 0.3,
    userData: { isModuleSelector: true, moduleIndex: 0 },
  });
  wardrobeGroup.add(selector);
  App.services.runtimeCache.internalGridMap['0'] = {
    effectiveBottomY: -0.4,
    effectiveTopY: 1,
    innerW: 0.44,
    internalCenterX: 0,
    internalDepth: 0.3,
    internalZ: -0.2,
    woodThick: 0.04,
  };

  const hitPoint = { x: 0, y: 0, z: -0.01 };
  const resolution = resolveViewerMeasurementResolution({
    runtime: createViewerMeasurementGeometryRuntime(App),
    THREE,
    hitState: {
      ...makeHitState({
        target: centerPanel,
        intersects: [
          { object: centerPanel, point: hitPoint },
          { object: selector, point: hitPoint },
        ],
        hitIdentity: { partId: 'd1_full', doorId: 'd1_full' },
        moduleIndex: 0,
        point: hitPoint,
      }),
      effectiveDoorId: 'd1_full',
      doorHitObject: centerPanel,
      doorHitGroup: centerPanel,
      doorHitPoint: hitPoint,
      doorHitY: 0,
    } as any,
    wardrobeGroup: wardrobeGroup as any,
  });

  assert.ok(resolution);
  assert.equal(resolution.shouldMeasureInterior, false);
  assert.equal(resolution.target, profileVisual);
  assert.equal(resolution.targetKey, 'd1_full');
  assertClose(resolution.box.width, 0.7);
  assertClose(resolution.box.height, 2);
  assertClose(resolution.box.depth, 0.02);
  assert.equal(resolution.plane.kind, 'front');
  assert.equal(resolution.plane.normalSign, 1);
  assertClose(resolution.plane.normalValue, 0.01 + FRONT_Z_EPSILON_M);
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
    runtime: createViewerMeasurementGeometryRuntime(App),
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

test('resolveViewerMeasurementResolution preserves target keys for part and point starts', () => {
  const variants = [
    { userData: { partId: 'part-a' }, expected: 'part-a' },
    { userData: { pid: 'pid-a' }, expected: 'pid-a' },
    { userData: { surfaceId: 'surface-a' }, expected: 'surface-a' },
    { userData: { drawerId: 'drawer-a' }, expected: 'drawer-a', foundDrawerId: 'drawer-a' },
    { userData: { moduleIndex: 3 }, expected: '3', moduleIndex: 3 },
  ];

  for (const variant of variants) {
    const App = createApp();
    const THREE = App.deps.THREE;
    const wardrobeGroup = createGroup();
    const target = createMesh({
      width: 1,
      height: 2,
      depth: 0.5,
      y: 1,
      userData: variant.userData,
    });
    wardrobeGroup.add(target);
    const hitState = makeHitState({
      target,
      foundDrawerId: variant.foundDrawerId ?? null,
      hitIdentity: variant.userData,
      moduleIndex: variant.moduleIndex ?? null,
      point: { x: 0, y: 1, z: 0.25 },
    });

    const resolution = resolveViewerMeasurementResolution({
      runtime: createViewerMeasurementGeometryRuntime(App),
      THREE,
      hitState,
      wardrobeGroup: wardrobeGroup as any,
    });
    const pointStart = resolvePointMeasurementStart({
      runtime: createViewerMeasurementGeometryRuntime(App),
      THREE,
      hitState,
      wardrobeGroup: wardrobeGroup as any,
    });

    assert.equal(resolution?.targetKey, variant.expected);
    assert.equal(pointStart?.targetKey, variant.expected);
  }
});

test('resolveViewerMeasurementResolution keeps thin-depth fronts measurable', () => {
  const App = createApp();
  const THREE = App.deps.THREE;
  const wardrobeGroup = createGroup();
  const front = createMesh({
    width: 0.7,
    height: 2,
    depth: 0.001,
    y: 1,
    userData: { partId: 'thin_front' },
  });
  wardrobeGroup.add(front);

  const resolution = resolveViewerMeasurementResolution({
    runtime: createViewerMeasurementGeometryRuntime(App),
    THREE,
    hitState: makeHitState({ target: front, point: { x: 0, y: 1, z: 0.0005 } }),
    wardrobeGroup: wardrobeGroup as any,
  });

  assert.ok(resolution);
  assertClose(resolution.box.depth, 0.001);
});

test('resolvePointMeasurementStartFromPointer ignores non-structural objects for aggregate bounds', () => {
  const App = createApp();
  const THREE = App.deps.THREE;
  const wardrobeGroup = createGroup();
  const body = createMesh({
    width: 1,
    height: 2,
    depth: 0.5,
    y: 1,
    userData: { partId: 'cabinet_body' },
  });
  const overlay = createMesh({
    width: 60,
    height: 60,
    depth: 60,
    x: 25,
    y: 25,
    z: 25,
    userData: { __wpViewerMeasurementOverlay: true },
  });
  const transparent = createMesh({
    width: 70,
    height: 70,
    depth: 70,
    x: -25,
    y: 25,
    z: -25,
    opacity: 0,
    userData: { partId: 'transparent_helper' },
  });
  const hiddenObject = createMesh({
    width: 75,
    height: 75,
    depth: 75,
    x: 30,
    y: -30,
    z: 30,
    visible: false,
    userData: { partId: 'hidden_object_helper' },
  });
  const hiddenMaterial = createMesh({
    width: 85,
    height: 85,
    depth: 85,
    x: -35,
    y: -35,
    z: 35,
    materialVisible: false,
    userData: { partId: 'hidden_material_helper' },
  });
  const hiddenParent = createGroup();
  hiddenParent.visible = false;
  hiddenParent.add(
    createMesh({
      width: 95,
      height: 95,
      depth: 95,
      x: 45,
      y: -45,
      z: -45,
      userData: { partId: 'hidden_parent_child_helper' },
    })
  );
  const passiveFitting = createMesh({
    width: 80,
    height: 0.02,
    depth: 0.02,
    y: 35,
    userData: { __kind: 'wardrobe_rod' },
  });
  const selector = createMesh({
    width: 90,
    height: 90,
    depth: 90,
    x: 40,
    userData: { isModuleSelector: true, moduleIndex: 0 },
  });
  wardrobeGroup.add(body);
  wardrobeGroup.add(overlay);
  wardrobeGroup.add(transparent);
  wardrobeGroup.add(hiddenObject);
  wardrobeGroup.add(hiddenMaterial);
  wardrobeGroup.add(hiddenParent);
  wardrobeGroup.add(passiveFitting);
  wardrobeGroup.add(selector);

  const draft = resolvePointMeasurementStartFromPointer({
    runtime: createViewerMeasurementGeometryRuntime(App),
    THREE,
    wardrobeGroup: wardrobeGroup as any,
    pointer: {
      raycaster: {
        ray: {
          origin: { x: 0.49, y: 1, z: 3 },
          direction: { x: 0, y: 0, z: -1 },
        },
      } as any,
    },
  });

  assert.ok(draft);
  assert.equal(draft.targetKey, 'wardrobe');
  assert.equal(draft.plane.kind, 'front');
  assertClose(draft.plane.uMin, -0.5);
  assertClose(draft.plane.uMax, 0.5);
  assertClose(draft.plane.vMin, 0);
  assertClose(draft.plane.vMax, 2);
});

test('resolvePointMeasurementStartFromPointer supports thin-front-only aggregate bounds', () => {
  const App = createApp();
  const THREE = App.deps.THREE;
  const wardrobeGroup = createGroup();
  const thinFront = createMesh({
    width: 1,
    height: 2,
    depth: 0.001,
    y: 1,
    userData: { partId: 'thin_front_only' },
  });
  wardrobeGroup.add(thinFront);

  const draft = resolvePointMeasurementStartFromPointer({
    runtime: createViewerMeasurementGeometryRuntime(App),
    THREE,
    wardrobeGroup: wardrobeGroup as any,
    pointer: {
      raycaster: {
        ray: {
          origin: { x: 0.49, y: 1, z: 3 },
          direction: { x: 0, y: 0, z: -1 },
        },
      } as any,
    },
  });

  assert.ok(draft);
  assert.equal(draft.plane.kind, 'front');
  assertClose(draft.plane.uMin, -0.5);
  assertClose(draft.plane.uMax, 0.5);
  assertClose(draft.plane.vMin, 0);
  assertClose(draft.plane.vMax, 2);
  assertClose(draft.plane.normalValue, 0.0005 + FRONT_Z_EPSILON_M);
});

test('resolvePointMeasurementStart uses the shared visible-occlusion policy for front-plane promotion', () => {
  const startWithExternalDoor = (doorZ: number) => {
    const App = createApp();
    const THREE = App.deps.THREE;
    const wardrobeGroup = createGroup();
    const sidePanel = createMesh({
      width: 0.02,
      height: 2,
      depth: 0.58,
      x: -0.51,
      y: 1,
      userData: { partId: 'left_side_panel' },
    });
    const externalDoor = createMesh({
      width: 1,
      height: 2,
      depth: 0.02,
      y: 1,
      z: doorZ,
      userData: { partId: 'door_1_full' },
    });
    wardrobeGroup.add(sidePanel);
    wardrobeGroup.add(externalDoor);
    return resolvePointMeasurementStart({
      runtime: createViewerMeasurementGeometryRuntime(App),
      THREE,
      hitState: makeHitState({
        target: sidePanel,
        point: { x: -0.52, y: 1, z: 0.29 },
        hitIdentity: { partId: 'left_side_panel' },
      }),
      wardrobeGroup: wardrobeGroup as any,
    });
  };

  const targetBox = { centerX: -0.51, centerY: 1, centerZ: 0, width: 0.02, height: 2, depth: 0.58 };
  const visibleBoundsBox = { centerX: 0, centerY: 1, centerZ: 0.015, width: 1.02, height: 2, depth: 0.61 };
  const distantBoundsBox = { centerX: 0, centerY: 1, centerZ: 0.095, width: 1.02, height: 2, depth: 0.77 };

  assert.equal(
    hasVisibleFrontPlaneOcclusion({ targetBox, boundsBox: visibleBoundsBox, normalSign: 1 }),
    true
  );
  assert.equal(
    hasVisibleFrontPlaneOcclusion({ targetBox, boundsBox: distantBoundsBox, normalSign: 1 }),
    false
  );

  const visibleDraft = startWithExternalDoor(0.31);
  const distantDraft = startWithExternalDoor(0.47);
  assert.ok(visibleDraft);
  assert.ok(distantDraft);
  assertClose(visibleDraft.plane.normalValue, 0.32 + FRONT_Z_EPSILON_M);
  assertClose(distantDraft.plane.normalValue, 0.29 + FRONT_Z_EPSILON_M);
});

test('resolvePointMeasurementStart uses one aggregate-derived sign for front-plane promotion', () => {
  const App = createApp();
  App.render.camera.position = new FakeVector3(0, 1, 0.03);
  const THREE = App.deps.THREE;
  const wardrobeGroup = createGroup();
  const sidePanel = createMesh({
    width: 0.02,
    height: 2,
    depth: 0.58,
    x: -0.51,
    y: 1,
    z: 0,
    userData: { partId: 'left_side_panel' },
  });
  const shiftedFront = createMesh({
    width: 1,
    height: 2,
    depth: 0.02,
    y: 1,
    z: 0.4,
    userData: { partId: 'shifted_front' },
  });
  wardrobeGroup.add(sidePanel);
  wardrobeGroup.add(shiftedFront);

  const draft = resolvePointMeasurementStart({
    runtime: createViewerMeasurementGeometryRuntime(App),
    THREE,
    hitState: makeHitState({
      target: sidePanel,
      point: { x: -0.52, y: 1, z: -0.29 },
      hitIdentity: { partId: 'left_side_panel' },
    }),
    wardrobeGroup: wardrobeGroup as any,
  });

  assert.ok(draft);
  assert.equal(draft.plane.kind, 'front');
  assert.equal(draft.plane.normalSign, -1);
  assertClose(draft.plane.normalValue, -0.29 - FRONT_Z_EPSILON_M);
});

test('viewer measurement resolution core runs on injected geometry capabilities without AppContainer', () => {
  const THREE = createFakeThree() as any;
  const wardrobeGroup = createGroup();
  const target = createMesh({
    width: 0.8,
    height: 1.6,
    depth: 0.45,
    y: 0.8,
    userData: { partId: 'capability_panel' },
  });
  wardrobeGroup.add(target);
  const calls = { camera: 0, measure: 0, project: 0 };
  const runtime = {
    getCamera() {
      calls.camera += 1;
      return { position: new FakeVector3(0, 1, 3) };
    },
    getInternalGridMap() {
      return Object.create(null);
    },
    measureObjectLocalBox(value: unknown) {
      calls.measure += 1;
      assert.equal(value, target);
      return { centerX: 0, centerY: 0.8, centerZ: 0, width: 0.8, height: 1.6, depth: 0.45 };
    },
    projectWorldPointToLocal(value: unknown) {
      calls.project += 1;
      const point = value as { x?: number; y?: number; z?: number } | null;
      if (!point) return null;
      return { x: Number(point.x || 0), y: Number(point.y || 0), z: Number(point.z || 0) };
    },
  };

  const hitState = makeHitState({ target, point: { x: 0.1, y: 0.8, z: 0.22 } });
  const resolution = resolveViewerMeasurementResolution({
    runtime,
    THREE,
    hitState,
    wardrobeGroup,
    target,
  });

  assert.ok(resolution);
  assert.equal(resolution.box.width, 0.8);
  assert.equal(resolution.box.height, 1.6);
  assert.ok(calls.measure > 0);
  assert.ok(calls.camera > 0);
  assert.ok(calls.project > 0);

  const roomTarget = createMesh({
    width: 0.004,
    height: 2.8,
    depth: 3.2,
    x: -2,
    y: 1.4,
    z: 1.6,
    userData: {
      __wpRoomMeasurementTarget: true,
      __wpRoomMeasurementULength: 3.2,
      __wpRoomMeasurementHeight: 2.8,
      __wpRoomMeasurementThickness: 0.004,
      __wpRoomMeasurementUX: 0,
      __wpRoomMeasurementUZ: 1,
      __wpRoomMeasurementNormalX: 1,
      __wpRoomMeasurementNormalZ: 0,
      partId: 'room_wall_left',
      partLabel: 'קיר שמאלי',
    },
  });
  const roomRuntime = {
    getCamera() {
      return { position: new FakeVector3(0, 1, 3) };
    },
    getInternalGridMap() {
      return Object.create(null);
    },
    measureObjectLocalBox(value: unknown) {
      assert.equal(value, roomTarget);
      return { centerX: -2, centerY: 1.4, centerZ: 1.6, width: 0.004, height: 2.8, depth: 3.2 };
    },
    projectWorldPointToLocal(value: unknown) {
      const point = value as { x?: number; y?: number; z?: number } | null;
      if (!point) return null;
      return { x: Number(point.x || 0), y: Number(point.y || 0), z: Number(point.z || 0) };
    },
  };
  const roomHitState = makeHitState({
    target: roomTarget,
    point: { x: -2, y: 1.2, z: 0.8 },
    hitIdentity: { partId: 'room_wall_left' },
  });
  roomHitState.foundPartId = 'room_wall_left';
  roomHitState.hitUserData = roomTarget.userData;
  const roomResolution = resolveViewerMeasurementResolution({
    runtime: roomRuntime,
    THREE,
    hitState: roomHitState,
    wardrobeGroup,
    target: roomTarget,
  });
  assert.ok(roomResolution);
  assert.equal(roomResolution.targetKey, 'room_wall_left');
  assert.equal(roomResolution.plane.kind, 'side');
  assert.ok(roomResolution.plane.basis);
  assertClose(roomResolution.plane.uLength, 3.2);
  assertClose(roomResolution.plane.vLength, 2.8);
  assertClose(roomResolution.plane.basis?.u.z ?? Number.NaN, 1);
  assert.equal(resolveViewerMeasurementPartLabel(roomHitState, roomTarget), 'קיר שמאלי');

  const roomDraft = resolvePointMeasurementStart({
    runtime: roomRuntime,
    THREE,
    hitState: roomHitState,
    wardrobeGroup,
  });
  assert.ok(roomDraft);
  assert.equal(roomDraft.targetKey, 'room_wall_left');
  assertClose(roomDraft.plane.uMin, -1.6);
  assertClose(roomDraft.plane.uMax, 1.6);
  assertClose(roomDraft.plane.vMin, -1.4);
  assertClose(roomDraft.plane.vMax, 1.4);
});
