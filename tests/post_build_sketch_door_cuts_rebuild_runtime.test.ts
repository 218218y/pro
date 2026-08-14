import test from 'node:test';
import assert from 'node:assert/strict';

import { rebuildSketchSegmentedDoor } from '../esm/native/builder/post_build_sketch_door_cuts_shared.ts';
import { applyDoorHandles } from '../esm/native/builder/handles_apply_doors.ts';
import {
  appendHingedDoorHardware,
  bindHingedDoorHardwareRuntimeContext,
  createHingedDoorHardwareRenderState,
} from '../esm/native/builder/render_hinged_door_hardware.ts';
import {
  HINGED_DOOR_HARDWARE_RENDER_POLICY,
  HINGED_DOOR_RENDER_POLICY,
} from '../esm/shared/dimensions/door_system_policy.ts';
import { HANDLE_POLICY } from '../esm/shared/dimensions/handle_policy.ts';
import { MATERIAL_THICKNESS_POLICY } from '../esm/shared/dimensions/material_thickness_policy.ts';
import { SKETCH_BOX_DOOR_PREVIEW_POLICY } from '../esm/shared/dimensions/sketch_box_preview_policy.ts';

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
  CylinderGeometry: class FakeCylinderGeometry {
    radiusTop: number;
    radiusBottom: number;
    height: number;
    radialSegments: number;
    constructor(radiusTop: number, radiusBottom: number, height: number, radialSegments: number) {
      this.radiusTop = radiusTop;
      this.radiusBottom = radiusBottom;
      this.height = height;
      this.radialSegments = radialSegments;
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
    resolveGrooveLayout: () => null,
    isDoorRemoved: () => false,
    ...overrides,
  };
}

function hardwareGroups(parent: FakeNode, role: 'door' | 'carcass'): FakeNode[] {
  return parent.children.filter(
    child => child.userData.__wpDoorHingeHardware === true && child.userData.__wpHingeRole === role
  );
}

function installInitialHinges(args: {
  wardrobeGroup: FakeGroup;
  doorGroup: FakeGroup;
  partId: string;
  width: number;
  height: number;
  isLeftHinge: boolean;
  carcassMountFaceX?: number;
}): void {
  const state = createHingedDoorHardwareRenderState(
    FakeTHREE as any,
    HINGED_DOOR_HARDWARE_RENDER_POLICY,
    HINGED_DOOR_RENDER_POLICY.visualThicknessM
  );
  assert.ok(state);
  const doorOp = {
    x: 0,
    y: args.doorGroup.position.y,
    z: args.doorGroup.position.z,
    width: args.width,
    height: args.height,
    partId: args.partId,
    isLeftHinge: args.isLeftHinge,
    isRemoved: false,
    isMirror: false,
    hasGroove: false,
    pivotX: args.doorGroup.position.x,
    ...(args.carcassMountFaceX != null ? { carcassMountFaceX: args.carcassMountFaceX } : null),
  };
  bindHingedDoorHardwareRuntimeContext({ doorGroup: args.doorGroup as any, state, doorOp });
  appendHingedDoorHardware({
    THREE: FakeTHREE as any,
    wardrobeGroup: args.wardrobeGroup as any,
    doorGroup: args.doorGroup as any,
    doorOp,
    state,
  });
}

test('segmented sketch door rebuild replaces original hinges with two hinges on every visible leaf around a middle external-drawer cut', () => {
  const wardrobeGroup = new FakeGroup();
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd40_full',
    __doorWidth: 0.9,
    __doorHeight: 2,
    __doorMeshOffsetX: 0.45,
    __hingeLeft: true,
  };
  doorGroup.position.set(-0.45, 1, 0.6);
  wardrobeGroup.add(doorGroup);
  installInitialHinges({
    wardrobeGroup,
    doorGroup,
    partId: 'd40_full',
    width: 0.9,
    height: 2,
    isLeftHinge: true,
    carcassMountFaceX: 0.006,
  });

  assert.equal(hardwareGroups(doorGroup, 'door').length, 2);
  assert.equal(hardwareGroups(wardrobeGroup, 'carcass').length, 2);
  assert.equal(Object.keys(doorGroup.userData).includes('__wpHingeHardwareRuntimeContext'), false);

  rebuildSketchSegmentedDoor({
    runtime: createBaseRuntime(),
    g: doorGroup as any,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.8 },
      { yMin: 1.2, yMax: 2 },
    ],
    basePartId: 'd40_full',
  });

  const movingHinges = hardwareGroups(doorGroup, 'door');
  const fixedHinges = hardwareGroups(wardrobeGroup, 'carcass');
  assert.equal(movingHinges.length, 4);
  assert.equal(fixedHinges.length, 4);
  assert.equal(fixedHinges.filter(hinge => hinge.userData.__wpHingeOwnerPartId === 'd40_bot').length, 2);
  assert.equal(fixedHinges.filter(hinge => hinge.userData.__wpHingeOwnerPartId === 'd40_top').length, 2);
  assert.equal(
    fixedHinges.some(hinge => hinge.userData.__wpHingeOwnerPartId === 'd40_full'),
    false
  );
  assert.ok(
    fixedHinges.every(hinge => hinge.position.y < 0.8 || hinge.position.y > 1.2),
    'no fixed hinge may remain inside the external-drawer cut'
  );
  assert.ok(
    movingHinges.every(hinge => {
      const absoluteY = doorGroup.position.y + hinge.position.y;
      return absoluteY < 0.8 || absoluteY > 1.2;
    }),
    'no moving hinge may remain inside the external-drawer cut'
  );
});

test('segmented sketch door rebuild moves the lower hinge above a bottom external-drawer cut', () => {
  const wardrobeGroup = new FakeGroup();
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd41_full',
    __doorWidth: 0.9,
    __doorHeight: 2,
    __doorMeshOffsetX: -0.45,
    __hingeLeft: false,
  };
  doorGroup.position.set(0.45, 1, 0.6);
  wardrobeGroup.add(doorGroup);
  installInitialHinges({
    wardrobeGroup,
    doorGroup,
    partId: 'd41_full',
    width: 0.9,
    height: 2,
    isLeftHinge: false,
    carcassMountFaceX: -0.006,
  });

  rebuildSketchSegmentedDoor({
    runtime: createBaseRuntime(),
    g: doorGroup as any,
    ud: doorGroup.userData,
    visibleSegments: [{ yMin: 0.45, yMax: 2 }],
    basePartId: 'd41_full',
  });

  const movingHinges = hardwareGroups(doorGroup, 'door');
  const fixedHinges = hardwareGroups(wardrobeGroup, 'carcass');
  assert.equal(movingHinges.length, 2);
  assert.equal(fixedHinges.length, 2);
  assert.ok(fixedHinges.every(hinge => hinge.position.y > 0.45));
  assert.ok(movingHinges.every(hinge => doorGroup.position.y + hinge.position.y > 0.45));
});

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
            ? w - HANDLE_POLICY.standard.doorOffsetM
            : -w + HANDLE_POLICY.standard.doorOffsetM;
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

test('segmented sketch door rebuild uses the selected canonical base id for surface-origin doors', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'sketch_box_free_0_boxSurface_door_main_mid2_groove_left',
    __doorWidth: 1,
    __doorHeight: 1.2,
    __hingeLeft: false,
  };
  doorGroup.position.set(0, 0.6, 0);

  rebuildSketchSegmentedDoor({
    runtime: createBaseRuntime(),
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.45 },
      { yMin: 0.75, yMax: 1.2 },
    ],
    basePartId: 'sketch_box_free_0_boxSurface_door_main',
  });

  const segmentLeaves = doorGroup.children.filter(child => child.userData.__wpSketchDoorLeaf === true);
  assert.deepEqual(
    segmentLeaves.map(child => child.userData.partId),
    ['sketch_box_free_0_boxSurface_door_main_bot', 'sketch_box_free_0_boxSurface_door_main_top']
  );
});

test('segmented sketch door rebuild keeps drawer-cut ids scoped under an already split parent leaf', () => {
  const doorGroup = new FakeGroup();
  doorGroup.userData = {
    partId: 'd25_bot',
    __doorWidth: 1,
    __doorHeight: 1.2,
    __hingeLeft: false,
  };
  doorGroup.position.set(0, 0.6, 0);

  rebuildSketchSegmentedDoor({
    runtime: createBaseRuntime(),
    g: doorGroup,
    ud: doorGroup.userData,
    visibleSegments: [
      { yMin: 0, yMax: 0.45 },
      { yMin: 0.75, yMax: 1.2 },
    ],
    basePartId: 'd25_bot',
  });

  const segmentLeaves = doorGroup.children.filter(child => child.userData.__wpSketchDoorLeaf === true);
  assert.deepEqual(
    segmentLeaves.map(child => child.userData.partId),
    ['d25_bot_bot', 'd25_bot_top']
  );
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
  const acknowledgements: Array<[string, string]> = [];
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
          acknowledge: (title: string, message: string) => {
            acknowledgements.push([title, message]);
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
  assert.equal(acknowledgements.length, 1);
  assert.equal(acknowledgements[0]![0], 'שינוי אוטומטי בבנייה');
  assert.match(acknowledgements[0]![1], /ידית הוסרה/);
});

test('segmented sketch door rebuild reports all suppressed segment handles through one acknowledgement', () => {
  const acknowledgements: Array<[string, string]> = [];
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
          acknowledge: (title: string, message: string) => {
            acknowledgements.push([title, message]);
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
  assert.equal(acknowledgements.length, 1);
  assert.equal(acknowledgements[0]![0], 'שינוי אוטומטי בבנייה');
  assert.match(acknowledgements[0]![1], /הוסרו 3 ידיות/);
});

test('segmented sketch handle suppressions are not reported again during generic handle refresh', () => {
  const acknowledgements: Array<[string, string]> = [];
  const App: any = {
    deps: { THREE: FakeTHREE },
    render: { doorsArray: [] },
    services: {
      builder: {},
      uiFeedback: {
        acknowledge: (title: string, message: string) => {
          acknowledgements.push([title, message]);
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
    addOutlines: () => undefined,
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
  assert.equal(acknowledgements.length, 1);
  assert.equal(acknowledgements[0]![0], 'שינוי אוטומטי בבנייה');
  assert.match(acknowledgements[0]![1], /הוסרו 2 ידיות/);
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
    addOutlines: () => undefined,
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
    addOutlines: () => undefined,
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

test('segmented sketch door rebuild preserves focused threshold, clearance, minimum dimensions, and thickness fallbacks', () => {
  const createDoor = (frontThickness: unknown, segmentHeight: number) => {
    const doorGroup = new FakeGroup();
    doorGroup.userData = {
      partId: 'focused_policy_door_full',
      __doorWidth: 0.01,
      __doorHeight: 0.5,
      __hingeLeft: true,
      __wpFrontThickness: frontThickness,
    };
    doorGroup.position.set(0, 0.25, 0);
    rebuildSketchSegmentedDoor({
      runtime: createBaseRuntime(),
      g: doorGroup,
      ud: doorGroup.userData,
      visibleSegments: [{ yMin: 0, yMax: segmentHeight }],
      basePartId: 'focused_policy_door_full',
    });
    return doorGroup;
  };

  const exactThresholdHeight =
    SKETCH_BOX_DOOR_PREVIEW_POLICY.segmentedDoorMinHeightM +
    SKETCH_BOX_DOOR_PREVIEW_POLICY.segmentedDoorVisualClearanceM;
  assert.equal(createDoor(0.03, exactThresholdHeight).children.length, 0);
  assert.equal(createDoor(0.03, exactThresholdHeight - 1e-9).children.length, 0);

  const rendered = createDoor(0.03, exactThresholdHeight + 1e-9);
  assert.ok(rendered.children.length >= 1);
  const renderedSegment = rendered.children[0];
  assert.equal(renderedSegment.userData.__wpFrontThickness, 0.03);
  assert.ok(
    Math.abs(renderedSegment.userData.__wpDoorConstructionHeight - (exactThresholdHeight + 1e-9)) < 1e-12
  );
  assert.equal(
    renderedSegment.userData.__doorWidth,
    SKETCH_BOX_DOOR_PREVIEW_POLICY.segmentedDoorMinDimensionM
  );
  assert.equal(
    renderedSegment.userData.__doorHeight,
    SKETCH_BOX_DOOR_PREVIEW_POLICY.segmentedDoorMinDimensionM
  );

  for (const invalidThickness of [0, -0.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    const fallback = createDoor(invalidThickness, exactThresholdHeight + 0.1);
    assert.equal(
      fallback.children[0]?.userData.__wpFrontThickness,
      MATERIAL_THICKNESS_POLICY.wood.thicknessM
    );
  }
});
