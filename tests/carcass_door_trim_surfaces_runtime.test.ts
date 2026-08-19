import test from 'node:test';
import assert from 'node:assert/strict';

import { createApplyCarcassBaseOps } from '../esm/native/builder/render_carcass_ops_base.ts';
import { ROOM_COLUMN_LINER_THICKNESS_M } from '../esm/native/builder/room_architecture_geometry.ts';
import { createRoomArchitecturePlanFromApp } from '../esm/native/builder/room_architecture_plan_adapter.ts';
import { appendDoorTrimVisuals } from '../esm/native/builder/door_trim_visuals.ts';

class BoxGeometry {
  args: [number, number, number];
  constructor(w: number, h: number, d: number) {
    this.args = [w, h, d];
  }
}

class MeshStandardMaterial {
  params: Record<string, unknown>;
  __keepMaterial?: boolean;
  constructor(params: Record<string, unknown>) {
    this.params = params;
  }
}

class Mesh {
  geometry: unknown;
  material: unknown;
  userData: Record<string, unknown> = {};
  children: unknown[] = [];
  castShadow = false;
  receiveShadow = false;
  renderOrder = 0;
  position = {
    last: null as [number, number, number] | null,
    set: (x: number, y: number, z: number) => {
      this.position.last = [x, y, z];
    },
  };

  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }

  add(child: unknown) {
    this.children.push(child);
  }
}

class Group {
  userData: Record<string, unknown> = {};
  children: unknown[] = [];
  position = {
    last: null as [number, number, number] | null,
    set: (x: number, y: number, z: number) => {
      this.position.last = [x, y, z];
    },
  };

  add(child: unknown) {
    this.children.push(child);
  }
}

const THREE = { BoxGeometry, MeshStandardMaterial, Mesh, Group };

test('room column cuts carcass boards into real geometry around the obstacle', () => {
  const wardrobeChildren: unknown[] = [];
  const app = {
    services: {},
    store: {
      getState() {
        return {
          config: {
            roomArchitecture: {
              backWall: { enabled: true, widthCm: 300, heightCm: 280, wardrobeOffsetLeftCm: 50 },
              column: {
                enabled: true,
                offsetLeftCm: 140,
                widthCm: 30,
                depthCm: 20,
                heightCm: 240,
                bottomOffsetCm: 0,
              },
              surfacesHidden: true,
            },
          },
          ui: { raw: { width: 200, height: 240, depth: 60 } },
          runtime: { wardrobeWidthM: 2, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
        };
      },
    },
  } as never;
  const { applyCarcassBaseOps } = createApplyCarcassBaseOps();

  applyCarcassBaseOps(
    {
      boards: [
        {
          kind: 'board',
          partId: 'body_floor',
          width: 2,
          height: 0.018,
          depth: 0.6,
          x: 0,
          y: 0.009,
          z: 0,
        },
      ],
    },
    {
      App: app,
      roomArchitecturePlan: createRoomArchitecturePlanFromApp(app),
      THREE,
      wardrobeGroup: {
        add(child: unknown) {
          wardrobeChildren.push(child);
        },
      },
      ctx: { bodyMat: { name: 'body' } },
      addOutlines() {},
      getPartMaterial: null,
      sketchMode: false,
      reg() {},
      renderOpsHandleCatch() {},
    } as never
  );

  assert.equal(wardrobeChildren.length, 2);
  const board = wardrobeChildren[0] as Group;
  assert.equal(board.userData.partId, 'body_floor');
  assert.equal(board.userData.__wpRoomColumnAdjusted, true);
  assert.equal(board.children.length, 3);
  assert.deepEqual(board.position.last, [0, 0.009, 0]);

  const linerGroup = wardrobeChildren[1] as Group;
  assert.equal(linerGroup.userData.__wpRoomColumnLiner, true);
  assert.equal(linerGroup.userData.ignorePicking, true);
  assert.deepEqual(
    (linerGroup.children as Mesh[]).map(child => child.userData.__wpRoomColumnLinerFace).sort(),
    ['front', 'left', 'right']
  );
});

test('room column cuts plinth and leg platforms instead of leaving base boards through concrete', () => {
  const app = {
    services: {},
    store: {
      getState() {
        return {
          config: {
            roomArchitecture: {
              backWall: { enabled: true, widthCm: 300, heightCm: 280, wardrobeOffsetLeftCm: 50 },
              column: {
                enabled: true,
                offsetLeftCm: 140,
                widthCm: 30,
                depthCm: 20,
                heightCm: 240,
                bottomOffsetCm: 0,
              },
              surfacesHidden: false,
            },
          },
          ui: { raw: { width: 200, height: 240, depth: 60 } },
          runtime: { wardrobeWidthM: 2, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
        };
      },
    },
  } as never;
  const { applyCarcassBaseOps } = createApplyCarcassBaseOps();

  for (const base of [
    {
      kind: 'plinth',
      partId: 'plinth_color',
      width: 2,
      height: 0.1,
      depth: 0.55,
      x: 0,
      y: 0.05,
      z: 0,
    },
    {
      kind: 'leg_platforms',
      platforms: [
        {
          width: 2,
          height: 0.018,
          depth: 0.6,
          x: 0,
          y: 0.009,
          z: 0,
          partId: 'base_leg_platform_bottom',
        },
      ],
    },
  ]) {
    const wardrobeChildren: unknown[] = [];
    applyCarcassBaseOps({ base }, {
      App: app,
      roomArchitecturePlan: createRoomArchitecturePlanFromApp(app),
      THREE,
      wardrobeGroup: {
        add(child: unknown) {
          wardrobeChildren.push(child);
        },
      },
      ctx: {
        bodyMat: { name: 'body' },
        plinthMat: { name: 'plinth' },
        masoniteMat: { name: 'masonite' },
        whiteMat: { name: 'white' },
      },
      addOutlines() {},
      getPartMaterial: null,
      sketchMode: false,
      reg() {},
      renderOpsHandleCatch() {},
    } as never);

    const adjustedBase = wardrobeChildren[0] as Group;
    assert.equal(adjustedBase.userData.__wpRoomColumnAdjusted, true);
    assert.equal(adjustedBase.children.length, 3);
    assert.equal((wardrobeChildren[1] as Group).userData.__wpRoomColumnLiner, true);
  }
});

test('room column suppresses only legs that physically collide with the column cut volume', () => {
  const wardrobeChildren: unknown[] = [];
  const app = {
    services: {},
    store: {
      getState() {
        return {
          config: {
            roomArchitecture: {
              backWall: { enabled: true, widthCm: 300, heightCm: 280, wardrobeOffsetLeftCm: 50 },
              column: {
                enabled: true,
                offsetLeftCm: 140,
                widthCm: 30,
                depthCm: 20,
                heightCm: 240,
                bottomOffsetCm: 0,
              },
              surfacesHidden: false,
            },
          },
          ui: { raw: { width: 200, height: 240, depth: 60 } },
          runtime: { wardrobeWidthM: 2, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
        };
      },
    },
  } as never;
  const { applyCarcassBaseOps } = createApplyCarcassBaseOps();

  applyCarcassBaseOps(
    {
      base: {
        kind: 'legs',
        height: 0.12,
        geo: { shape: 'square', width: 0.04, depth: 0.04 },
        positions: [
          { x: 0, z: -0.2 },
          { x: 0.8, z: -0.2 },
        ],
      },
    },
    {
      App: app,
      roomArchitecturePlan: createRoomArchitecturePlanFromApp(app),
      THREE,
      wardrobeGroup: {
        add(child: unknown) {
          wardrobeChildren.push(child);
        },
      },
      ctx: {
        bodyMat: { name: 'body' },
        legMat: { name: 'leg' },
        masoniteMat: { name: 'masonite' },
        whiteMat: { name: 'white' },
      },
      addOutlines() {},
      getPartMaterial: null,
      sketchMode: false,
      reg() {},
      renderOpsHandleCatch() {},
    } as never
  );

  const visibleLegs = wardrobeChildren.filter(
    child => (child as Group).userData?.__wpRoomColumnLiner !== true
  ) as Mesh[];
  assert.equal(visibleLegs.length, 1);
  assert.deepEqual(visibleLegs[0].position.last, [0.8, 0.06, -0.2]);
  assert.equal((wardrobeChildren.at(-1) as Group).userData.__wpRoomColumnLiner, true);
});

test('room column liners cover every exposed notch face with the white masonite side toward the cabinet interior', () => {
  const wardrobeChildren: unknown[] = [];
  const masoniteMat = { name: 'masonite' };
  const whiteMat = { name: 'white' };
  const app = {
    services: {},
    store: {
      getState() {
        return {
          config: {
            roomArchitecture: {
              backWall: { enabled: true, widthCm: 300, heightCm: 280, wardrobeOffsetLeftCm: 50 },
              column: {
                enabled: true,
                offsetLeftCm: 140,
                widthCm: 30,
                depthCm: 20,
                heightCm: 120,
                bottomOffsetCm: 40,
              },
              surfacesHidden: true,
            },
          },
          ui: { raw: { width: 200, height: 240, depth: 60 } },
          runtime: { wardrobeWidthM: 2, wardrobeHeightM: 2.4, wardrobeDepthM: 0.6 },
        };
      },
    },
  } as never;
  const { applyCarcassBaseOps } = createApplyCarcassBaseOps();

  applyCarcassBaseOps({}, {
    App: app,
    roomArchitecturePlan: createRoomArchitecturePlanFromApp(app),
    THREE,
    wardrobeGroup: {
      add(child: unknown) {
        wardrobeChildren.push(child);
      },
    },
    ctx: { bodyMat: { name: 'body' }, masoniteMat, whiteMat },
    addOutlines() {},
    getPartMaterial: null,
    sketchMode: false,
    reg() {},
    renderOpsHandleCatch() {},
  } as never);

  assert.equal(wardrobeChildren.length, 1);
  const linerGroup = wardrobeChildren[0] as Group;
  assert.equal(linerGroup.userData.__wpRoomColumnLiner, true);
  const liners = linerGroup.children as Mesh[];
  assert.deepEqual(liners.map(mesh => mesh.userData.__wpRoomColumnLinerFace).sort(), [
    'bottom',
    'front',
    'left',
    'right',
    'top',
  ]);

  const visibleFaceIndex = { right: 0, left: 1, top: 2, bottom: 3, front: 4 } as const;
  for (const liner of liners) {
    const face = liner.userData.__wpRoomColumnLinerFace as keyof typeof visibleFaceIndex;
    const materials = liner.material as unknown[];
    assert.equal(materials[visibleFaceIndex[face]], whiteMat, `${face} liner must face white inward`);
    assert.equal(materials[5], masoniteMat, `${face} liner backside remains masonite`);
  }

  const frontLiner = liners.find(mesh => mesh.userData.__wpRoomColumnLinerFace === 'front');
  assert.ok(frontLiner);
  assert.ok(
    Math.abs((frontLiner.geometry as BoxGeometry).args[2] - ROOM_COLUMN_LINER_THICKNESS_M) < 1e-12,
    'column liner must reserve the canonical carcass back-panel thickness'
  );
});

test('carcass rendering tags side/top boards as trim surfaces and renders configured trim visuals', () => {
  const wardrobeChildren: unknown[] = [];
  const wardrobeGroup = {
    add(child: unknown) {
      wardrobeChildren.push(child);
    },
  };
  const app = {
    services: {},
    store: {
      getState() {
        return {
          config: {
            doorTrimMap: {
              body_left: [{ id: 'trim-body-left', axis: 'horizontal', span: 'full', color: 'nickel' }],
            },
          },
        };
      },
    },
  } as never;
  const { applyCarcassBaseOps } = createApplyCarcassBaseOps();

  applyCarcassBaseOps(
    {
      boards: [
        {
          kind: 'board',
          partId: 'body_left',
          width: 0.018,
          height: 2.1,
          depth: 0.6,
          x: -0.5,
          y: 1.05,
          z: 0,
        },
      ],
    },
    {
      App: app,
      roomArchitecturePlan: createRoomArchitecturePlanFromApp(app),
      THREE,
      wardrobeGroup,
      ctx: { bodyMat: { name: 'body' } },
      addOutlines() {},
      getPartMaterial: null,
      sketchMode: false,
      reg() {},
      renderOpsHandleCatch() {},
    } as never
  );

  assert.equal(wardrobeChildren.length, 1);
  const board = wardrobeChildren[0] as Mesh;
  assert.equal(board.userData.partId, 'body_left');
  assert.equal(board.userData.__wpDoorTrimSurface, true);
  assert.equal(board.userData.__doorWidth, 0.6);
  assert.equal(board.userData.__doorHeight, 2.1);
  assert.equal(board.userData.__wpDoorTrimSurfacePlane, 'yz');
  assert.equal(board.userData.__wpDoorTrimSurfaceFaceSign, -1);
  assert.equal(board.children.length, 1);
  const trim = board.children[0] as Mesh;
  assert.equal(trim.userData.partId, 'body_left');
  assert.equal(trim.userData.__wpDoorTrim, true);
  assert.equal(trim.userData.__wpDoorTrimId, 'trim-body-left');
  assert.equal(trim.userData.__wpDoorTrimSurfacePlane, 'yz');
  assert.deepEqual((trim.geometry as BoxGeometry).args, [0.01, 0.035, 0.6]);
  assert.ok(trim.position.last);
  assert.ok(Math.abs(trim.position.last[0] + 0.0145) < 1e-12);
  assert.equal(trim.position.last[1], 0);
  assert.equal(trim.position.last[2], 0);
});

test('door trim visuals preserve XY, YZ, and XZ geometry, front offset, and surface nudge', () => {
  const expected = {
    xy: { geometry: [1, 0.035, 0.01], position: [0, 0, 0.0165] },
    yz: { geometry: [0.01, 0.035, 1], position: [0.0165, 0, 0] },
    xz: { geometry: [1, 0.01, 0.035], position: [0, 0.0165, 0] },
  } as const;

  for (const surfacePlane of ['xy', 'yz', 'xz'] as const) {
    const children: unknown[] = [];
    appendDoorTrimVisuals({
      App: { services: {} },
      THREE,
      group: {
        add(child: unknown) {
          children.push(child);
        },
      },
      partId: `trim-${surfacePlane}`,
      trims: [{ id: `trim-${surfacePlane}`, axis: 'horizontal', span: 'full', color: 'nickel' }],
      doorWidth: 1,
      doorHeight: 2,
      frontZ: 0.011,
      faceSign: 1,
      surfacePlane,
      surfaceFaceCoord: 0.011,
    });

    assert.equal(children.length, 1);
    const trim = children[0] as Mesh;
    assert.deepEqual((trim.geometry as BoxGeometry).args, expected[surfacePlane].geometry);
    assert.deepEqual(trim.position.last, expected[surfacePlane].position);
    assert.equal(trim.userData.__wpDoorTrimSurfacePlane, surfacePlane);
  }
});
