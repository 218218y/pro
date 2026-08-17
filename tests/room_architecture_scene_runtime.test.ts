import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROOM_WALL_THICKNESS_M,
  resolveRoomArchitectureGeometry,
  resolveRoomOpeningGeometry,
} from '../esm/native/builder/room_architecture_geometry.ts';
import {
  ROOM_ARCHITECTURE_GROUP_NAME,
  refreshRoomArchitectureScene,
} from '../esm/native/builder/room_architecture_scene.ts';

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
    runtime: { wardrobeWidthM: 2.4, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
    ...overrides,
  };
}

function createApp(rootState: ReturnType<typeof createRootState>, roomGroup?: any) {
  return {
    store: { getState: () => rootState },
    render: roomGroup ? { roomGroup } : {},
  } as any;
}

test('room architecture uses house-wall thickness and resolves left/right side walls independently', () => {
  const rootState = createRootState();
  const App = createApp(rootState);
  const geometry = resolveRoomArchitectureGeometry(App);

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
  const swapped = resolveRoomArchitectureGeometry(App);
  assert.equal(swapped.leftWall, null);
  assert.ok(swapped.rightWall);
  assert.equal(swapped.rightWall?.minX, swapped.wall.maxX);
  assertClose(swapped.rightWall?.maxZ ?? Number.NaN, swapped.wall.maxZ + 2.8);
});

test('room openings resolve against their host wall and scene rendering cuts the wall before adding visuals', () => {
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
    constructor(
      public width: number,
      public height: number,
      public depth: number
    ) {}
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
  const roomGeometry = resolveRoomArchitectureGeometry(App);
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
    MeshStandardMaterial: FakeMaterial,
    Mesh: FakeMesh,
  } as any;
  assert.equal(refreshRoomArchitectureScene(App, THREE), true);
  const architecture = roomGroup.getObjectByName(ROOM_ARCHITECTURE_GROUP_NAME);
  assert.ok(architecture);
  assert.equal(architecture.getObjectByName('wpBackWall'), null);
  assert.equal(architecture.getObjectByName('wpRightWall'), null);
  assert.ok(architecture.children.some((child: any) => child.name.startsWith('wpBackWall_piece_')));
  assert.ok(architecture.children.some((child: any) => child.name.startsWith('wpRightWall_piece_')));
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

  const backPiece = architecture.children.find((child: any) => child.name.startsWith('wpBackWall_piece_'));
  const rightPiece = architecture.children.find((child: any) => child.name.startsWith('wpRightWall_piece_'));
  assert.equal(backPiece.userData.__wpRoomWallSurface, true);
  assert.equal(backPiece.userData.roomWallAxis, 'x');
  assert.equal(rightPiece.userData.__wpRoomWallSurface, true);
  assert.equal(rightPiece.userData.roomWallAxis, 'z');
  assert.equal(rightPiece.userData.roomWallInwardNormalX, -1);
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

  assert.equal(refreshRoomArchitectureScene(App, THREE), true);
  const architectureGroup = roomGroup.getObjectByName(ROOM_ARCHITECTURE_GROUP_NAME);
  assert.ok(architectureGroup);
  assert.deepEqual(
    architectureGroup.children.map((child: any) => child.name),
    ['wpBackWall', 'wpLeftWall']
  );
  assert.ok(architectureGroup.children.every((child: any) => child.material.params.color === '#e8e1d4'));

  (rootState.config as any).roomArchitecture.rightWall.enabled = true;
  (rootState.config as any).roomArchitecture.surfacesHidden = true;
  assert.equal(refreshRoomArchitectureScene(App, THREE), true);
  const refreshed = roomGroup.getObjectByName(ROOM_ARCHITECTURE_GROUP_NAME);
  assert.equal(refreshed.visible, false);
  assert.deepEqual(
    refreshed.children.map((child: any) => child.name),
    ['wpBackWall', 'wpLeftWall', 'wpRightWall']
  );
});
