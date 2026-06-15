import test from 'node:test';
import assert from 'node:assert/strict';

import { rebuildSketchSegmentedDoor } from '../esm/native/builder/post_build_sketch_door_cuts_shared.ts';
import { applyDoorHandles } from '../esm/native/builder/handles_apply_doors.ts';
import { HANDLE_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

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
  }
}

class FakeNode {
  parent: FakeNode | null = null;
  children: FakeNode[] = [];
  userData: Record<string, unknown> = {};
  position = new FakeVector3();
  rotation = new FakeVector3();
  add(child: FakeNode) {
    child.parent = this;
    this.children.push(child);
  }
  remove(child: FakeNode) {
    this.children = this.children.filter(it => it !== child);
    child.parent = null;
  }
}

class FakeMesh extends FakeNode {
  geometry: { width: number; height: number; depth: number };
  material: unknown;
  constructor(geometry: { width: number; height: number; depth: number }, material: unknown) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

class FakeGroup extends FakeNode {}

const FakeTHREE = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  MeshStandardMaterial: class FakeMeshStandardMaterial {
    args: Record<string, unknown>;
    constructor(args: Record<string, unknown>) {
      this.args = args;
    }
  },
  MeshBasicMaterial: class FakeMeshBasicMaterial {
    args: Record<string, unknown>;
    constructor(args: Record<string, unknown>) {
      this.args = args;
    }
  },
  DoubleSide: 2,
  BoxGeometry: class FakeBoxGeometry {
    width: number;
    height: number;
    depth: number;
    constructor(width: number, height: number, depth: number) {
      this.width = width;
      this.height = height;
      this.depth = depth;
    }
  },
};

function createBaseRuntime(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    App: {},
    THREE: FakeTHREE,
    bodyMat: { name: 'body' },
    globalFrontMat: { name: 'front' },
    createDoorVisual: () => new FakeGroup(),
    createHandleMesh: () => new FakeGroup(),
    getPartMaterial: (partId: string) => ({ name: `mat:${partId}` }),
    getMirrorMaterial: null,
    resolveHandleType: () => 'standard',
    resolveEdgeHandleVariant: () => 'short',
    resolveHandleColor: () => 'black',
    resolveManualHandlePosition: () => null,
    resolveCurtain: () => null,
    resolveSpecial: () => null,
    doorStyle: 'flat',
    doorStyleMap: {},
    groovesMap: {},
    resolveMirrorLayout: () => null,
    isDoorRemoved: () => false,
    ...overrides,
  };
}

test('segmented sketch door rebuild clamps handle placement per segment and tags handle part ids', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd12_full',
    __doorWidth: 0.9,
    __doorHeight: 1.2,
    __hingeLeft: true,
    __handleAbsY: -10,
  };
  doorGroup.position.set(0, 0.6, 0);

  rebuildSketchSegmentedDoor({
    runtime: createBaseRuntime(),
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.5 },
      { yMin: 0.7, yMax: 1.2 },
    ],
    basePartId: 'd12_full',
  });

  assert.equal(doorGroup.children.length, 4);
  const firstSegmentHandle = doorGroup.children[1];
  const secondSegmentHandle = doorGroup.children[3];
  assert.equal(firstSegmentHandle.userData.partId, 'd12_bot');
  assert.equal(secondSegmentHandle.userData.partId, 'd12_top');
  assert.ok(Math.abs(firstSegmentHandle.position.y - -0.5) < 1e-6);
  assert.ok(Math.abs(secondSegmentHandle.position.y - 0.2) < 1e-6);
});

test('segmented sketch door rebuild falls back to the original full-door handle anchor before segment clamping', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd13_full',
    __doorWidth: 0.9,
    __doorHeight: 1.8,
    __hingeLeft: true,
  };
  doorGroup.position.set(0, 0.9, 0);

  rebuildSketchSegmentedDoor({
    runtime: createBaseRuntime(),
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.7 },
      { yMin: 1.1, yMax: 1.8 },
    ],
    basePartId: 'd13_full',
  });

  const firstSegmentHandle = doorGroup.children[1];
  const secondSegmentHandle = doorGroup.children[3];
  assert.equal(firstSegmentHandle.userData.partId, 'd13_bot');
  assert.equal(secondSegmentHandle.userData.partId, 'd13_top');
  assert.ok(Math.abs(firstSegmentHandle.position.y - -0.3) < 1e-9);
  assert.ok(Math.abs(secondSegmentHandle.position.y - 0.3) < 1e-9);
});

test('segmented sketch door rebuild keeps auto handles at the original free-box door height when lower drawer cuts leave room', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'free_box_door_full',
    __doorWidth: 0.9,
    __doorHeight: 1.2,
    __hingeLeft: true,
  };
  doorGroup.position.set(0, 2, 0);

  rebuildSketchSegmentedDoor({
    runtime: createBaseRuntime(),
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [{ yMin: 1.8, yMax: 2.6 }],
    basePartId: 'free_box_door_full',
  });

  const handle = doorGroup.children[1];
  assert.equal(handle.userData.partId, 'free_box_door_full');
  assert.ok(Math.abs(handle.position.y) < 1e-9);
  assert.equal(doorGroup.children[0].userData.__handleAbsY, 2);
});

test('segmented sketch door rebuild applies manual handle position to rebuilt segment handles', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd60_full',
    __doorWidth: 0.9,
    __doorHeight: 1.2,
    __hingeLeft: true,
  };
  doorGroup.position.set(0, 0.6, 0);

  rebuildSketchSegmentedDoor({
    runtime: createBaseRuntime({
      resolveManualHandlePosition: (partId: string) =>
        partId === 'd60_top' ? { xRatio: 0.75, yRatio: 0.7 } : null,
      createHandleMesh: () => {
        const handle = new FakeGroup();
        handle.userData.__kind = 'handle';
        return handle;
      },
    }),
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.5 },
      { yMin: 0.7, yMax: 1.2 },
    ],
    basePartId: 'd60_full',
  });

  assert.equal(doorGroup.children.length, 4);
  const topHandle = doorGroup.children[3];
  assert.equal(topHandle.userData.partId, 'd60_top');
  assert.ok(Math.abs(topHandle.position.x - -0.625) < 1e-9);
  assert.ok(topHandle.position.y > 0.44 && topHandle.position.y < 0.46);
});

test('segmented sketch door manual handle placement includes hinged parent mesh offset on both hinge sides', () => {
  const cases = [
    {
      name: 'left hinge',
      partId: 'd61_full',
      hingeLeft: true,
      meshOffsetX: 0.45,
      xRatio: 0.75,
      expectedCenterX: 0.675,
    },
    {
      name: 'right hinge',
      partId: 'd62_full',
      hingeLeft: false,
      meshOffsetX: -0.45,
      xRatio: 0.25,
      expectedCenterX: -0.675,
    },
  ];

  for (const current of cases) {
    const doorGroup = new FakeGroup();
    doorGroup.userData = {
      partId: current.partId,
      __doorWidth: 0.9,
      __doorHeight: 1.2,
      __hingeLeft: current.hingeLeft,
      __doorMeshOffsetX: current.meshOffsetX,
    };
    doorGroup.position.set(0, 0.6, 0);

    rebuildSketchSegmentedDoor({
      runtime: createBaseRuntime({
        resolveManualHandlePosition: (partId: string) =>
          partId === current.partId ? { xRatio: current.xRatio, yRatio: 0.5 } : null,
        createHandleMesh: (_type: string, w: number, _h: number, isLeftHinge: boolean) => {
          const handle = new FakeGroup();
          handle.userData.__kind = 'handle';
          const visibleHandle = new FakeGroup();
          visibleHandle.position.x = isLeftHinge
            ? w - HANDLE_DIMENSIONS.standard.doorOffsetM
            : -w + HANDLE_DIMENSIONS.standard.doorOffsetM;
          handle.add(visibleHandle);
          return handle;
        },
      }),
      g: doorGroup,
      ud: doorGroup.userData,
      visibleSegments: [{ yMin: 0.7, yMax: 1.2 }],
      basePartId: current.partId,
    });

    const handle = doorGroup.children.find(child => child.userData.__kind === 'handle');
    assert.ok(handle, `${current.name}: expected rebuilt segment handle`);
    const visibleHandle = handle.children[0];
    assert.ok(visibleHandle, `${current.name}: expected visible handle child`);
    const renderedCenterX = handle.position.x + visibleHandle.position.x;
    assert.ok(
      Math.abs(renderedCenterX - current.expectedCenterX) < 1e-9,
      `${current.name}: expected rendered center ${current.expectedCenterX}, got ${renderedCenterX}`
    );
  }
});

test('segmented sketch door rebuild keeps canonical segment ids for 4-way splits and removed restore targets', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd15_full',
    __doorWidth: 1,
    __doorHeight: 2.4,
    __hingeLeft: false,
  };
  doorGroup.position.set(0, 1.2, 0);

  rebuildSketchSegmentedDoor({
    runtime: createBaseRuntime({ isDoorRemoved: (partId: string) => partId === 'd15_mid2' }),
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.4 },
      { yMin: 0.6, yMax: 1.0 },
      { yMin: 1.2, yMax: 1.6 },
      { yMin: 1.8, yMax: 2.2 },
    ],
    basePartId: 'd15_full',
  });

  assert.equal(doorGroup.children.length, 7);
  const segmentLeaves = doorGroup.children.filter(child => child.userData.__wpSketchDoorLeaf === true);
  assert.deepEqual(
    segmentLeaves.map(child => child.userData.partId),
    ['d15_bot', 'd15_mid1', 'd15_mid2', 'd15_top']
  );
  assert.equal(segmentLeaves[2].userData.__wpDoorRemoved, true);
  assert.equal(segmentLeaves[2].userData.__wpSketchDoorSegmentIndex, 2);
  assert.equal(segmentLeaves[2].userData.__wpSketchDoorSegmentPartId, undefined);
});

test('segmented sketch door rebuild disposes detached non-cached subtree resources before replacing segments', () => {
  const disposed = {
    geometry: 0,
    material: 0,
    texture: 0,
    cachedGeometry: 0,
    cachedMaterial: 0,
    cachedTexture: 0,
  };
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd31_full',
    __doorWidth: 0.9,
    __doorHeight: 1.4,
    __hingeLeft: true,
  };
  doorGroup.position.set(0, 0.7, 0);

  const runtime = createBaseRuntime({
    createHandleMesh: null,
    resolveHandleType: () => 'none',
    createDoorVisual: () => {
      const root = new FakeGroup();
      const texture = { dispose: () => (disposed.texture += 1) };
      const material = { map: texture, dispose: () => (disposed.material += 1) };
      const geometry = { dispose: () => (disposed.geometry += 1) };
      root.add(new FakeMesh(geometry as never, material));

      const cachedTexture = { userData: { isCached: true }, dispose: () => (disposed.cachedTexture += 1) };
      const cachedMaterial = {
        userData: { isCached: true },
        map: cachedTexture,
        dispose: () => (disposed.cachedMaterial += 1),
      };
      const cachedGeometry = { userData: { isCached: true }, dispose: () => (disposed.cachedGeometry += 1) };
      root.add(new FakeMesh(cachedGeometry as never, cachedMaterial));
      return root;
    },
  });

  rebuildSketchSegmentedDoor({
    runtime,
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [{ yMin: 0, yMax: 1.4 }],
    basePartId: 'd31_full',
  });
  assert.equal(doorGroup.children.length, 1);

  rebuildSketchSegmentedDoor({
    runtime,
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [{ yMin: 0, yMax: 1.4 }],
    basePartId: 'd31_full',
  });

  assert.equal(disposed.geometry, 1);
  assert.equal(disposed.material, 1);
  assert.equal(disposed.texture, 1);
  assert.equal(disposed.cachedGeometry, 0);
  assert.equal(disposed.cachedMaterial, 0);
  assert.equal(disposed.cachedTexture, 0);
  assert.equal(doorGroup.children.length, 1);
});

test('segmented sketch door rebuild suppresses handles whose real footprint cannot fit', () => {
  const toasts: Array<[string, string | undefined]> = [];
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd44_full',
    __doorWidth: 0.9,
    __doorHeight: 0.6,
    __hingeLeft: true,
  };
  doorGroup.position.set(0, 0.3, 0);

  const runtime = createBaseRuntime({
    App: {
      services: {
        uiFeedback: {
          toast: (message: string, type?: string) => {
            toasts.push([message, type]);
          },
        },
      },
    },
    resolveHandleType: () => 'edge',
    resolveEdgeHandleVariant: () => 'long',
    createHandleMesh: () => {
      const handle = new FakeGroup();
      handle.userData.__kind = 'handle';
      return handle;
    },
  });

  rebuildSketchSegmentedDoor({
    runtime,
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [{ yMin: 0, yMax: 0.25 }],
    basePartId: 'd44_full',
  });

  assert.equal(
    doorGroup.children.some(child => child.userData.__kind === 'handle'),
    false
  );
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /ידית הוסרה/);
  assert.equal(toasts[0]![1], 'info');
});

test('segmented sketch door rebuild reports all suppressed segment handles through one shared toast', () => {
  const toasts: Array<[string, string | undefined]> = [];
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd45_full',
    __doorWidth: 0.9,
    __doorHeight: 1.2,
    __hingeLeft: true,
  };
  doorGroup.position.set(0, 0.6, 0);

  const runtime = createBaseRuntime({
    App: {
      services: {
        uiFeedback: {
          toast: (message: string, type?: string) => {
            toasts.push([message, type]);
          },
        },
      },
    },
    resolveHandleType: () => 'edge',
    resolveEdgeHandleVariant: () => 'long',
    createHandleMesh: () => {
      const handle = new FakeGroup();
      handle.userData.__kind = 'handle';
      return handle;
    },
  });

  rebuildSketchSegmentedDoor({
    runtime,
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.25 },
      { yMin: 0.45, yMax: 0.7 },
      { yMin: 0.95, yMax: 1.2 },
    ],
    basePartId: 'd45_full',
  });

  assert.equal(
    doorGroup.children.some(child => child.userData.__kind === 'handle'),
    false
  );
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /הוסרו 3 ידיות/);
  assert.equal(toasts[0]![1], 'info');
});

test('segmented sketch handle suppressions are not reported again during generic handle refresh', () => {
  const toasts: Array<[string, string | undefined]> = [];
  const App: any = {
    deps: { THREE: FakeTHREE },
    render: { doorsArray: [] },
    services: {
      builder: {},
      uiFeedback: {
        toast: (message: string, type?: string) => {
          toasts.push([message, type]);
        },
      },
    },
  };

  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'sketch_low_drawers_door_full',
    __doorWidth: 0.9,
    __doorHeight: 1.2,
    __hingeLeft: true,
  };
  doorGroup.position.set(0, 0.6, 0);

  const runtime = createBaseRuntime({
    App,
    resolveHandleType: () => 'edge',
    resolveEdgeHandleVariant: () => 'long',
    createHandleMesh: () => {
      const handle = new FakeGroup();
      handle.userData.__kind = 'handle';
      return handle;
    },
  });

  rebuildSketchSegmentedDoor({
    runtime,
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.25 },
      { yMin: 0.95, yMax: 1.2 },
    ],
    basePartId: 'sketch_low_drawers_door_full',
  });

  App.render.doorsArray = [{ group: doorGroup, type: 'hinged' }];
  applyDoorHandles({
    App,
    THREE: FakeTHREE as any,
    removeDoorsEnabled: false,
    isDoorRemovedV7: () => false,
    syncDoorVisibilityForRemovedDoors: () => undefined,
    getEdgeHandleVariant: () => 'long',
    getHandleType: () => 'edge',
    getHandleColor: () => 'black',
    getManualHandlePosition: () => null,
    clampAbsYToGroup: absY => absY,
    removeExistingHandleChildren(group: FakeNode) {
      for (let i = group.children.length - 1; i >= 0; i -= 1) {
        const child = group.children[i];
        if (
          child.name === 'handle_group_v7' ||
          child.userData.__kind === 'handle' ||
          child.userData.isHandle
        ) {
          group.remove(child);
        }
      }
    },
  } as any);

  assert.equal(
    doorGroup.children.some(child => child.userData.__kind === 'handle'),
    false
  );
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]![0], /הוסרו 2 ידיות/);
  assert.equal(toasts[0]![1], 'info');
});

test('handle refresh rebuilds custom sketch box segmented-door handles from current handle config', () => {
  const basePartId = 'sketch_box_free_box1_door_d1';
  const topPartId = `${basePartId}_top`;
  const calls: string[] = [];

  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: basePartId,
    __doorWidth: 0.9,
    __doorHeight: 1.2,
    __doorMeshOffsetX: 0.45,
    __hingeLeft: true,
    __wpSketchCustomHandles: true,
    __wpSketchSegmentedDoor: true,
  };
  doorGroup.position.set(0, 0.6, 0);

  const topSegment = new FakeGroup();
  topSegment.userData = {
    partId: topPartId,
    __wpSketchDoorLeaf: true,
    __wpSketchDoorSegment: true,
    __wpSketchDoorSegmentPartId: topPartId,
    __wpSketchDoorSegmentIndex: 1,
    __doorWidth: 0.88,
    __doorHeight: 0.5,
    __hingeLeft: true,
    __handleAbsY: 1.05,
  };
  topSegment.position.set(0.45, 0.35, 0);
  doorGroup.add(topSegment);

  const staleHandle = new FakeGroup();
  staleHandle.name = 'handle_group_v7';
  staleHandle.userData = { __kind: 'handle', partId: topPartId, handleType: 'standard', isHandle: true };
  doorGroup.add(staleHandle);

  const App: any = {
    deps: { THREE: FakeTHREE },
    render: { doorsArray: [{ group: doorGroup, type: 'hinged' }] },
    services: { builder: {} },
  };

  applyDoorHandles({
    App,
    THREE: FakeTHREE as any,
    removeDoorsEnabled: false,
    isDoorRemovedV7: () => false,
    syncDoorVisibilityForRemovedDoors: () => undefined,
    getEdgeHandleVariant: partId => {
      calls.push(`variant:${String(partId)}`);
      return 'short';
    },
    getHandleType: partId => {
      calls.push(`type:${String(partId)}`);
      return 'edge';
    },
    getHandleColor: partId => {
      calls.push(`color:${String(partId)}`);
      return 'gold';
    },
    getManualHandlePosition: () => null,
    clampAbsYToGroup: absY => absY,
    removeExistingHandleChildren(group: FakeNode) {
      for (let i = group.children.length - 1; i >= 0; i -= 1) {
        const child = group.children[i];
        if (
          child.name === 'handle_group_v7' ||
          child.userData.__kind === 'handle' ||
          child.userData.isHandle
        ) {
          group.remove(child);
        }
      }
    },
  } as any);

  const handles = doorGroup.children.filter(child => child.userData.__kind === 'handle');
  assert.equal(handles.length, 1);
  const handle = handles[0]!;
  assert.equal(handle.userData.partId, topPartId);
  assert.equal(handle.userData.handleType, 'edge');
  assert.ok(Math.abs(handle.position.y - 0.45) < 1e-9);
  assert.deepEqual(calls, [`type:${topPartId}`, `variant:${topPartId}`, `color:${topPartId}`]);
});

test('handle refresh applies manual handle position to custom sketch box segmented-door handles', () => {
  const basePartId = 'sketch_box_free_box2_door_d1';
  const topPartId = `${basePartId}_top`;

  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: basePartId,
    __doorWidth: 0.9,
    __doorHeight: 1.2,
    __doorMeshOffsetX: 0.45,
    __hingeLeft: true,
    __wpSketchCustomHandles: true,
    __wpSketchSegmentedDoor: true,
  };
  doorGroup.position.set(0, 0.6, 0);

  const topSegment = new FakeGroup();
  topSegment.userData = {
    partId: topPartId,
    __wpSketchDoorLeaf: true,
    __wpSketchDoorSegment: true,
    __wpSketchDoorSegmentPartId: topPartId,
    __wpSketchDoorSegmentIndex: 1,
    __doorWidth: 0.88,
    __doorHeight: 0.5,
    __hingeLeft: true,
  };
  topSegment.position.set(0.45, 0.35, 0);
  doorGroup.add(topSegment);

  const App: any = {
    deps: { THREE: FakeTHREE },
    render: { doorsArray: [{ group: doorGroup, type: 'hinged' }] },
    services: { builder: {} },
  };

  applyDoorHandles({
    App,
    THREE: FakeTHREE as any,
    removeDoorsEnabled: false,
    isDoorRemovedV7: () => false,
    syncDoorVisibilityForRemovedDoors: () => undefined,
    getEdgeHandleVariant: () => 'short',
    getHandleType: () => 'standard',
    getHandleColor: () => 'black',
    getManualHandlePosition: partId => (partId === topPartId ? { xRatio: 0.75, yRatio: 0.7 } : null),
    clampAbsYToGroup: absY => absY,
    removeExistingHandleChildren(group: FakeNode) {
      for (let i = group.children.length - 1; i >= 0; i -= 1) {
        const child = group.children[i];
        if (
          child.name === 'handle_group_v7' ||
          child.userData.__kind === 'handle' ||
          child.userData.isHandle
        ) {
          group.remove(child);
        }
      }
    },
  } as any);

  const handle = doorGroup.children.find(child => child.userData.__kind === 'handle');
  assert.ok(handle, 'expected refreshed segmented sketch handle');
  assert.equal(handle.userData.partId, topPartId);
  assert.ok(handle.position.x < 0, `expected manual x offset, got ${handle.position.x}`);
  assert.ok(handle.position.y > 0.44 && handle.position.y < 0.46);
});
