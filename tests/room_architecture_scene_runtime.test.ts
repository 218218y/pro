import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROOM_WALL_THICKNESS_M,
  buildRoomWallOpeningMeshData,
  resolveRoomOpeningGeometry,
} from '../esm/native/builder/room_architecture_geometry.ts';
import { createRoomArchitecturePlanFromApp } from '../esm/native/builder/room_architecture_plan_adapter.ts';
import {
  ROOM_ARCHITECTURE_GROUP_NAME,
  refreshRoomArchitectureScene,
} from '../esm/native/builder/room_architecture_scene.ts';
import {
  doesRoomDoorSweepCollide,
  resolveRoomDoorMaxOpenAngleRad,
  tryHandleRoomDoorToggleClick,
} from '../esm/native/services/room_door_interaction.ts';

function assertClose(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 1e-9, `${actual} must equal ${expected}`);
}

function createRootState(overrides: Record<string, unknown> = {}) {
  return {
    ui: { raw: { width: 240, height: 240, depth: 60 } },
    config: {
      roomArchitecture: {
        backWall: { enabled: true, widthCm: 400, heightCm: 280, wardrobeOffsetLeftCm: 50 },
        leftWall: { enabled: true, depthCm: 320, heightCm: 270 },
        rightWall: { enabled: false, depthCm: 280, heightCm: 260 },
        column: {
          enabled: false,
          offsetLeftCm: 180,
          widthCm: 30,
          depthCm: 20,
          heightCm: 280,
          bottomOffsetCm: 0,
        },
        openings: [],
        wallColor: '#e8e1d4',
        surfacesHidden: false,
      },
    },
    mode: { primary: 'none', opts: {} },
    runtime: { wardrobeWidthM: 2.4, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
    ...overrides,
  };
}

function createApp(rootState: ReturnType<typeof createRootState>, roomGroup?: any) {
  return {
    store: { getState: () => rootState, patch() {} },
    render: roomGroup ? { roomGroup } : {},
  } as any;
}

test('wall opening mesh emits reveal faces only on the exact door/window boundary', () => {
  const sideWall = { minX: 0, maxX: 0.2, minY: 0, maxY: 2.6, minZ: 0, maxZ: 2.8 };
  const throughWallX = { minX: -0.001, maxX: 0.201 };

  const quads = (mesh: ReturnType<typeof buildRoomWallOpeningMeshData>) => {
    const result: Array<{ positions: number[]; normal: number[] }> = [];
    for (let offset = 0; offset < mesh.positions.length; offset += 18) {
      result.push({
        positions: mesh.positions.slice(offset, offset + 18),
        normal: mesh.normals.slice(offset, offset + 3),
      });
    }
    return result;
  };
  const bounds = (positions: number[]) => {
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      xs.push(positions[i]);
      ys.push(positions[i + 1]);
      zs.push(positions[i + 2]);
    }
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    };
  };

  const door = buildRoomWallOpeningMeshData(
    sideWall,
    [{ ...throughWallX, minY: 0, maxY: 2.1, minZ: 0.8, maxZ: 1.7 }],
    'z'
  );
  const doorRevealSides = quads(door).filter(quad => Math.abs(quad.normal[2]) === 1);
  const doorJambs = doorRevealSides
    .map(quad => bounds(quad.positions))
    .filter(box => Math.abs(box.minZ - 0.8) <= 1e-9 || Math.abs(box.minZ - 1.7) <= 1e-9);
  assert.equal(doorJambs.length, 2);
  for (const jamb of doorJambs) {
    assertClose(jamb.minY, 0);
    assertClose(jamb.maxY, 2.1);
    assertClose(jamb.minX, sideWall.minX);
    assertClose(jamb.maxX, sideWall.maxX);
  }
  assert.ok(
    !doorRevealSides.some(quad => {
      const box = bounds(quad.positions);
      return (
        (Math.abs(box.minZ - 0.8) <= 1e-9 || Math.abs(box.minZ - 1.7) <= 1e-9) &&
        Math.abs(box.maxY - sideWall.maxY) <= 1e-9
      );
    }),
    'door jamb faces must stop at the door head instead of continuing to full wall height'
  );

  const window = buildRoomWallOpeningMeshData(
    sideWall,
    [{ ...throughWallX, minY: 0.9, maxY: 1.9, minZ: 0.35, maxZ: 1.55 }],
    'z'
  );
  const windowQuads = quads(window);
  const windowRevealSides = windowQuads.filter(quad => Math.abs(quad.normal[2]) === 1);
  const windowJambs = windowRevealSides
    .map(quad => bounds(quad.positions))
    .filter(box => Math.abs(box.minZ - 0.35) <= 1e-9 || Math.abs(box.minZ - 1.55) <= 1e-9);
  assert.equal(windowJambs.length, 2);
  for (const jamb of windowJambs) {
    assertClose(jamb.minY, 0.9);
    assertClose(jamb.maxY, 1.9);
  }
  const windowHorizontalReveals = windowQuads
    .filter(quad => Math.abs(quad.normal[1]) === 1)
    .map(quad => bounds(quad.positions))
    .filter(box => Math.abs(box.minY - 0.9) <= 1e-9 || Math.abs(box.minY - 1.9) <= 1e-9);
  assert.equal(windowHorizontalReveals.length, 2);
  for (const reveal of windowHorizontalReveals) {
    assertClose(reveal.minZ, 0.35);
    assertClose(reveal.maxZ, 1.55);
  }
});

test('room architecture uses house-wall thickness and resolves left/right side walls independently', () => {
  const rootState = createRootState();
  const App = createApp(rootState);
  const geometry = createRoomArchitecturePlanFromApp(App);

  assert.equal(ROOM_WALL_THICKNESS_M, 0.2);
  assertClose(geometry.wall.depth, 0.2);
  assert.ok(geometry.leftWall);
  assert.equal(geometry.rightWall, null);
  assertClose(geometry.leftWall?.width ?? Number.NaN, 0.2);
  assertClose(geometry.leftWall?.height ?? Number.NaN, 2.7);
  assertClose(geometry.leftWall?.maxZ ?? Number.NaN, geometry.wall.maxZ + 3.2);
  assert.equal(geometry.leftWall?.maxX, geometry.wall.minX);

  (rootState.config as any).roomArchitecture.leftWall.enabled = false;
  (rootState.config as any).roomArchitecture.rightWall.enabled = true;
  const swapped = createRoomArchitecturePlanFromApp(App);
  assert.equal(swapped.leftWall, null);
  assert.ok(swapped.rightWall);
  assert.equal(swapped.rightWall?.minX, swapped.wall.maxX);
  assertClose(swapped.rightWall?.maxZ ?? Number.NaN, swapped.wall.maxZ + 2.8);
});

test('room architecture never lets side walls overlap the wardrobe body', () => {
  const rootState = createRootState();
  (rootState.config as any).roomArchitecture.backWall.widthCm = 200;
  (rootState.config as any).roomArchitecture.backWall.wardrobeOffsetLeftCm = 50;
  (rootState.config as any).roomArchitecture.leftWall.enabled = true;
  (rootState.config as any).roomArchitecture.rightWall.enabled = true;

  const geometry = createRoomArchitecturePlanFromApp(createApp(rootState));
  const wardrobeHalfWidthM = geometry.wardrobeWidthM / 2;

  assertClose(geometry.wall.width, geometry.wardrobeWidthM);
  assertClose(geometry.wall.minX, -wardrobeHalfWidthM);
  assertClose(geometry.wall.maxX, wardrobeHalfWidthM);
  assert.ok(geometry.leftWall);
  assert.ok(geometry.rightWall);
  assert.ok((geometry.leftWall?.maxX ?? Number.POSITIVE_INFINITY) <= -wardrobeHalfWidthM);
  assert.ok((geometry.rightWall?.minX ?? Number.NEGATIVE_INFINITY) >= wardrobeHalfWidthM);
});

test('room openings resolve against their host wall and scene rendering cuts the wall before adding visuals', () => {
  class FakeGroup {
    name = '';
    visible = true;
    userData: Record<string, unknown> = {};
    children: any[] = [];
    add(child: any) {
      child.parent = this;
      this.children.push(child);
    }
    traverse(fn: (value: any) => void) {
      const visit = (value: any) => {
        fn(value);
        for (const child of value.children || []) visit(child);
      };
      visit(this);
    }
    remove(child: any) {
      this.children = this.children.filter(entry => entry !== child);
    }
    getObjectByName(name: string): any {
      for (const child of this.children) {
        if (child?.name === name) return child;
        const nested = child?.getObjectByName?.(name);
        if (nested) return nested;
      }
      return null;
    }
  }
  class FakeBoxGeometry {
    constructor(
      public width: number,
      public height: number,
      public depth: number
    ) {}
    dispose() {}
  }
  class FakeBufferAttribute {
    constructor(
      public array: number[],
      public itemSize: number
    ) {}
  }
  class FakeBufferGeometry {
    attributes: Record<string, FakeBufferAttribute> = {};
    setAttribute(name: string, attribute: FakeBufferAttribute) {
      this.attributes[name] = attribute;
      return this;
    }
    computeBoundingBox() {}
    computeBoundingSphere() {}
    dispose() {}
  }
  class FakeMaterial {
    constructor(public params: Record<string, unknown>) {}
    dispose() {}
  }
  class FakeMesh {
    name = '';
    castShadow = false;
    receiveShadow = false;
    userData: Record<string, unknown> = {};
    position = {
      x: 0,
      y: 0,
      z: 0,
      set: (x: number, y: number, z: number) => Object.assign(this.position, { x, y, z }),
    };
    rotation = { x: 0, y: 0, z: 0 };
    updateMatrixWorld() {}
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
  }

  const roomGroup = new FakeGroup();
  const rootState = createRootState();
  (rootState.config as any).roomArchitecture.rightWall.enabled = true;
  (rootState.config as any).roomArchitecture.openings = [
    {
      id: 'win-back',
      kind: 'window',
      wall: 'back',
      widthCm: 120,
      heightCm: 100,
      offsetAlongCm: 70,
      bottomOffsetCm: 90,
    },
    {
      id: 'door-right',
      kind: 'door',
      wall: 'right',
      widthCm: 90,
      heightCm: 210,
      offsetAlongCm: 80,
      bottomOffsetCm: 0,
    },
  ];
  const App = createApp(rootState, roomGroup);
  const roomGeometry = createRoomArchitecturePlanFromApp(App);
  const backWindow = resolveRoomOpeningGeometry(
    roomGeometry,
    (rootState.config as any).roomArchitecture.openings[0]
  );
  const rightDoor = resolveRoomOpeningGeometry(
    roomGeometry,
    (rootState.config as any).roomArchitecture.openings[1]
  );
  assert.ok(backWindow);
  assert.ok(rightDoor);
  assert.equal(backWindow.surface.wall, 'back');
  assert.equal(rightDoor.surface.wall, 'right');
  assertClose(backWindow.clearancesCm.bottom, 90);
  assertClose(rightDoor.clearancesCm.bottom, 0);

  const THREE = {
    Group: FakeGroup,
    BoxGeometry: FakeBoxGeometry,
    BufferGeometry: FakeBufferGeometry,
    Float32BufferAttribute: FakeBufferAttribute,
    MeshStandardMaterial: FakeMaterial,
    Mesh: FakeMesh,
  } as any;
  assert.equal(refreshRoomArchitectureScene(App, THREE, createRoomArchitecturePlanFromApp(App)), true);
  const architecture = roomGroup.getObjectByName(ROOM_ARCHITECTURE_GROUP_NAME);
  assert.ok(architecture);
  const backWallMesh = architecture.getObjectByName('wpBackWall');
  const rightWallMesh = architecture.getObjectByName('wpRightWall');
  assert.ok(backWallMesh);
  assert.ok(rightWallMesh);
  assert.ok(backWallMesh.geometry instanceof FakeBufferGeometry);
  assert.ok(rightWallMesh.geometry instanceof FakeBufferGeometry);
  assert.ok(backWallMesh.geometry.attributes.position.array.length > 0);
  assert.ok(rightWallMesh.geometry.attributes.position.array.length > 0);
  assert.equal(
    architecture.children.some((child: any) => child.name.startsWith('wpBackWall_piece_')),
    false,
    'a wall with openings must stay one mesh instead of adjacent box pieces'
  );
  assert.equal(
    architecture.children.some((child: any) => child.name.startsWith('wpRightWall_piece_')),
    false,
    'side-wall openings must not split the wall into seam-producing box pieces'
  );
  assert.ok(architecture.getObjectByName('wpRoomOpening_win-back_glass'));
  assert.ok(architecture.getObjectByName('wpRoomOpening_door-right_doorLeaf'));
  assert.equal(architecture.getObjectByName('wpRoomOpening_win-back_mullionH'), null);

  const windowFrameStart = architecture.getObjectByName('wpRoomOpening_win-back_frameStart');
  const windowFrameEnd = architecture.getObjectByName('wpRoomOpening_win-back_frameEnd');
  const windowFrameTop = architecture.getObjectByName('wpRoomOpening_win-back_frameTop');
  const windowFrameBottom = architecture.getObjectByName('wpRoomOpening_win-back_frameBottom');
  assert.ok(windowFrameStart && windowFrameEnd && windowFrameTop && windowFrameBottom);
  assertClose(
    windowFrameStart.position.x - windowFrameStart.geometry.width / 2,
    windowFrameTop.position.x - windowFrameTop.geometry.width / 2
  );
  assertClose(
    windowFrameEnd.position.x + windowFrameEnd.geometry.width / 2,
    windowFrameTop.position.x + windowFrameTop.geometry.width / 2
  );
  assertClose(
    windowFrameStart.position.y + windowFrameStart.geometry.height / 2,
    windowFrameTop.position.y - windowFrameTop.geometry.height / 2
  );
  assertClose(
    windowFrameStart.position.y - windowFrameStart.geometry.height / 2,
    windowFrameBottom.position.y + windowFrameBottom.geometry.height / 2
  );
  const windowGlass = architecture.getObjectByName('wpRoomOpening_win-back_glass');
  const windowMullionV = architecture.getObjectByName('wpRoomOpening_win-back_mullionV');
  assert.ok(windowGlass && windowMullionV);
  assertClose(
    windowGlass.position.x - windowGlass.geometry.width / 2,
    windowFrameStart.position.x + windowFrameStart.geometry.width / 2
  );
  assertClose(
    windowGlass.position.x + windowGlass.geometry.width / 2,
    windowFrameEnd.position.x - windowFrameEnd.geometry.width / 2
  );
  assertClose(
    windowGlass.position.y + windowGlass.geometry.height / 2,
    windowFrameTop.position.y - windowFrameTop.geometry.height / 2
  );
  assertClose(
    windowGlass.position.y - windowGlass.geometry.height / 2,
    windowFrameBottom.position.y + windowFrameBottom.geometry.height / 2
  );
  assertClose(windowMullionV.geometry.height, windowGlass.geometry.height);

  const doorFrameStart = architecture.getObjectByName('wpRoomOpening_door-right_frameStart');
  const doorFrameEnd = architecture.getObjectByName('wpRoomOpening_door-right_frameEnd');
  const doorFrameTop = architecture.getObjectByName('wpRoomOpening_door-right_frameTop');
  assert.ok(doorFrameStart && doorFrameEnd && doorFrameTop);
  assertClose(
    doorFrameStart.position.z - doorFrameStart.geometry.depth / 2,
    doorFrameTop.position.z - doorFrameTop.geometry.depth / 2
  );
  assertClose(
    doorFrameEnd.position.z + doorFrameEnd.geometry.depth / 2,
    doorFrameTop.position.z + doorFrameTop.geometry.depth / 2
  );
  assertClose(
    doorFrameStart.position.y + doorFrameStart.geometry.height / 2,
    doorFrameTop.position.y - doorFrameTop.geometry.height / 2
  );
  const doorLeaf = architecture.getObjectByName('wpRoomOpening_door-right_doorLeaf');
  assert.ok(doorLeaf);
  const leafStartReveal =
    doorLeaf.position.z -
    doorLeaf.geometry.depth / 2 -
    (doorFrameStart.position.z + doorFrameStart.geometry.depth / 2);
  const leafEndReveal =
    doorFrameEnd.position.z -
    doorFrameEnd.geometry.depth / 2 -
    (doorLeaf.position.z + doorLeaf.geometry.depth / 2);
  const leafTopReveal =
    doorFrameTop.position.y -
    doorFrameTop.geometry.height / 2 -
    (doorLeaf.position.y + doorLeaf.geometry.height / 2);
  assertClose(leafStartReveal, 0.004);
  assertClose(leafEndReveal, 0.004);
  assertClose(leafTopReveal, 0.004);
  assert.equal(doorLeaf.userData.__wpRoomDoorMovable, true);
  assert.equal(doorLeaf.userData.__wpRoomDoorDirectionX, 0);
  assert.equal(doorLeaf.userData.__wpRoomDoorDirectionZ, 1);
  assert.equal(doorLeaf.userData.__wpRoomDoorTargetAngleSign, -1);

  const wallMeasurement = architecture.getObjectByName('wpRoomMeasurementWall_back');
  const windowMeasurement = architecture.getObjectByName('wpRoomOpening_win-back_measurementTarget');
  const doorMeasurement = architecture.getObjectByName('wpRoomOpening_door-right_measurementTarget');
  assert.ok(wallMeasurement && windowMeasurement && doorMeasurement);
  assert.equal(wallMeasurement.userData.partLabel, 'קיר אחורי');
  assert.equal(windowMeasurement.userData.partLabel, 'חלון');
  assert.equal(doorMeasurement.userData.partLabel, 'דלת');
  assert.equal(doorMeasurement.userData.__wpRoomMeasurementTarget, true);
  assert.equal(doorMeasurement.userData.__wpRoomDoorMovable, true);

  const rightDoorSpec = {
    hingeX: doorLeaf.userData.__wpRoomDoorHingeX as number,
    hingeZ: doorLeaf.userData.__wpRoomDoorHingeZ as number,
    leafWidth: doorLeaf.userData.__wpRoomDoorLeafWidth as number,
    leafHeight: doorLeaf.userData.__wpRoomDoorLeafHeight as number,
    bottom: doorLeaf.userData.__wpRoomDoorBottom as number,
    directionX: doorLeaf.userData.__wpRoomDoorDirectionX as number,
    directionZ: doorLeaf.userData.__wpRoomDoorDirectionZ as number,
    targetAngleSign: doorLeaf.userData.__wpRoomDoorTargetAngleSign as 1 | -1,
    thickness: 0.035,
  };
  assertClose(resolveRoomDoorMaxOpenAngleRad(rightDoorSpec, []), -Math.PI / 2);
  const swingObstacle = {
    minX: rightDoorSpec.hingeX - 0.52,
    maxX: rightDoorSpec.hingeX - 0.28,
    minY: 0,
    maxY: 2.2,
    minZ: rightDoorSpec.hingeZ + 0.28,
    maxZ: rightDoorSpec.hingeZ + 0.52,
  };
  assert.equal(doesRoomDoorSweepCollide(rightDoorSpec, [swingObstacle], -Math.PI / 4), true);
  const limitedAngle = resolveRoomDoorMaxOpenAngleRad(rightDoorSpec, [swingObstacle]);
  assert.ok(limitedAngle < 0 && Math.abs(limitedAngle) < Math.PI / 2);

  const closedDoorX = doorLeaf.position.x;
  const closedDoorZ = doorLeaf.position.z;
  (App.render as any).camera = {};
  const wardrobeGroup = {
    children: [] as any[],
    parent: roomGroup,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
  (App.render as any).wardrobeGroup = wardrobeGroup;
  let nextFrameId = 1;
  const pendingFrames = new Map<number, FrameRequestCallback>();
  (App as any).deps = {
    browser: {
      requestAnimationFrame(callback: FrameRequestCallback) {
        const id = nextFrameId++;
        pendingFrames.set(id, callback);
        return id;
      },
      cancelAnimationFrame(id: number) {
        pendingFrames.delete(id);
      },
    },
  };
  const runNextDoorFrame = () => {
    const next = pendingFrames.entries().next();
    assert.equal(next.done, false, 'door animation must have a pending animation frame');
    const [id, callback] = next.value;
    pendingFrames.delete(id);
    callback(id * 16.67);
  };
  const flushDoorAnimation = () => {
    for (let i = 0; i < 180 && pendingFrames.size; i += 1) runNextDoorFrame();
    assert.equal(pendingFrames.size, 0, 'door animation must settle');
  };
  const doorRaycaster = {
    setFromCamera() {},
    intersectObjects() {
      return [{ object: doorLeaf, point: { x: closedDoorX, y: 1, z: closedDoorZ }, distance: 2 }];
    },
  } as any;
  assert.equal(
    tryHandleRoomDoorToggleClick({
      App,
      ndcX: 0,
      ndcY: 0,
      raycaster: doorRaycaster,
      mouse: { x: 0, y: 0 },
    }),
    true
  );
  assertClose(doorLeaf.rotation.y, 0);
  assert.equal(pendingFrames.size, 1);
  runNextDoorFrame();
  assert.ok(doorLeaf.rotation.y < 0 && doorLeaf.rotation.y > -Math.PI / 2);
  assert.ok(doorLeaf.position.x < closedDoorX, 'right-wall door must swing inward into the room');
  flushDoorAnimation();
  assertClose(doorLeaf.rotation.y, -Math.PI / 2);

  assert.equal(
    tryHandleRoomDoorToggleClick({
      App,
      ndcX: 0,
      ndcY: 0,
      raycaster: doorRaycaster,
      mouse: { x: 0, y: 0 },
    }),
    true
  );
  assertClose(doorLeaf.rotation.y, -Math.PI / 2);
  runNextDoorFrame();
  assert.ok(doorLeaf.rotation.y > -Math.PI / 2 && doorLeaf.rotation.y < 0);
  flushDoorAnimation();
  assertClose(doorLeaf.rotation.y, 0);
  assertClose(doorLeaf.position.x, closedDoorX);
  assertClose(doorLeaf.position.z, closedDoorZ);

  const freeBoxObstacle = {
    type: 'Mesh',
    parent: wardrobeGroup,
    children: [],
    userData: { __wpSketchFreeBox: true },
    geometry: {
      parameters: {
        width: swingObstacle.maxX - swingObstacle.minX,
        height: swingObstacle.maxY - swingObstacle.minY,
        depth: swingObstacle.maxZ - swingObstacle.minZ,
      },
    },
    position: {
      x: (swingObstacle.minX + swingObstacle.maxX) / 2,
      y: (swingObstacle.minY + swingObstacle.maxY) / 2,
      z: (swingObstacle.minZ + swingObstacle.maxZ) / 2,
    },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
  wardrobeGroup.children.push(freeBoxObstacle);
  assert.equal(
    tryHandleRoomDoorToggleClick({
      App,
      ndcX: 0,
      ndcY: 0,
      raycaster: doorRaycaster,
      mouse: { x: 0, y: 0 },
    }),
    true
  );
  assertClose(doorLeaf.rotation.y, 0);
  runNextDoorFrame();
  assert.ok(doorLeaf.rotation.y < 0);
  flushDoorAnimation();
  assert.ok(doorLeaf.rotation.y < 0);
  assert.ok(Math.abs(doorLeaf.rotation.y) < Math.PI / 2);

  assert.equal(backWallMesh.userData.__wpRoomWallSurface, true);
  assert.equal(backWallMesh.userData.roomWallAxis, 'x');
  assert.equal(rightWallMesh.userData.__wpRoomWallSurface, true);
  assert.equal(rightWallMesh.userData.roomWallAxis, 'z');
  assert.equal(rightWallMesh.userData.roomWallInwardNormalX, -1);
});

test('room architecture scene renders enabled wall boxes with the persisted wall color', () => {
  class FakeGroup {
    name = '';
    visible = true;
    userData: Record<string, unknown> = {};
    children: any[] = [];

    add(child: any) {
      this.children.push(child);
    }

    remove(child: any) {
      this.children = this.children.filter(entry => entry !== child);
    }

    getObjectByName(name: string): any {
      for (const child of this.children) {
        if (child?.name === name) return child;
        const nested = child?.getObjectByName?.(name);
        if (nested) return nested;
      }
      return null;
    }
  }

  class FakeBoxGeometry {
    args: number[];
    constructor(...args: number[]) {
      this.args = args;
    }
    dispose() {}
  }

  class FakeMaterial {
    params: Record<string, unknown>;
    constructor(params: Record<string, unknown>) {
      this.params = params;
    }
    dispose() {}
  }

  class FakeMesh {
    name = '';
    castShadow = false;
    receiveShadow = false;
    userData: Record<string, unknown> = {};
    position = {
      x: 0,
      y: 0,
      z: 0,
      set: (x: number, y: number, z: number) => {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
      },
    };
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
  }

  const roomGroup = new FakeGroup();
  const rootState = createRootState();
  const App = createApp(rootState, roomGroup);
  const THREE = {
    Group: FakeGroup,
    BoxGeometry: FakeBoxGeometry,
    MeshStandardMaterial: FakeMaterial,
    Mesh: FakeMesh,
  } as any;

  assert.equal(refreshRoomArchitectureScene(App, THREE, createRoomArchitecturePlanFromApp(App)), true);
  const architectureGroup = roomGroup.getObjectByName(ROOM_ARCHITECTURE_GROUP_NAME);
  assert.ok(architectureGroup);
  assert.deepEqual(
    architectureGroup.children.map((child: any) => child.name),
    ['wpBackWall', 'wpLeftWall', 'wpRoomMeasurementWall_back', 'wpRoomMeasurementWall_left']
  );
  assert.ok(
    architectureGroup.children
      .filter((child: any) => !child.userData.__wpRoomMeasurementTarget)
      .every((child: any) => child.material.params.color === '#e8e1d4')
  );

  (rootState.config as any).roomArchitecture.rightWall.enabled = true;
  (rootState.config as any).roomArchitecture.surfacesHidden = true;
  assert.equal(refreshRoomArchitectureScene(App, THREE, createRoomArchitecturePlanFromApp(App)), true);
  const refreshed = roomGroup.getObjectByName(ROOM_ARCHITECTURE_GROUP_NAME);
  assert.equal(refreshed.visible, false);
  assert.deepEqual(
    refreshed.children.map((child: any) => child.name),
    [
      'wpBackWall',
      'wpLeftWall',
      'wpRightWall',
      'wpRoomMeasurementWall_back',
      'wpRoomMeasurementWall_left',
      'wpRoomMeasurementWall_right',
    ]
  );
});
