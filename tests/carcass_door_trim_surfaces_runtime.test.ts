import test from 'node:test';
import assert from 'node:assert/strict';

import { createApplyCarcassBaseOps } from '../esm/native/builder/render_carcass_ops_base.ts';
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

const THREE = { BoxGeometry, MeshStandardMaterial, Mesh };

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
  const { applyCarcassBaseOps } = createApplyCarcassBaseOps({
    isBackPanelSeg(value: unknown) {
      return !!value && typeof value === 'object';
    },
  });

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
