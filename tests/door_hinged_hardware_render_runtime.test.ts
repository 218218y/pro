import test from 'node:test';
import assert from 'node:assert/strict';

import { createApplyHingedDoorsOps } from '../esm/native/builder/render_door_ops_hinged.ts';
import { HINGED_DOOR_HARDWARE_RENDER_POLICY } from '../esm/shared/dimensions/door_system_policy.ts';

function createThreeStub() {
  class Group {
    children: any[] = [];
    parent: any = null;
    userData: Record<string, unknown> = {};
    position = {
      x: 0,
      y: 0,
      z: 0,
      set: (x = 0, y = 0, z = 0) => {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
        return this.position;
      },
    };
    rotation = { x: 0, y: 0, z: 0 };
    scale = { x: 1, y: 1, z: 1 };
    add(...objects: any[]) {
      for (const object of objects) {
        object.parent = this;
        this.children.push(object);
      }
    }
    remove(object: any) {
      this.children = this.children.filter(child => child !== object);
      if (object?.parent === this) object.parent = null;
    }
  }

  class Mesh extends Group {
    geometry: unknown;
    material: unknown;
    raycast?: (...args: unknown[]) => unknown;
    constructor(geometry: unknown, material: unknown) {
      super();
      this.geometry = geometry;
      this.material = material;
    }
  }

  class BoxGeometry {
    args: unknown[];
    constructor(...args: unknown[]) {
      this.args = args;
    }
  }

  class CylinderGeometry {
    args: unknown[];
    constructor(...args: unknown[]) {
      this.args = args;
    }
  }

  class MeshBasicMaterial {
    constructor(props: Record<string, unknown> = {}) {
      Object.assign(this, props);
    }
  }

  class MeshStandardMaterial {
    constructor(props: Record<string, unknown> = {}) {
      Object.assign(this, props);
    }
  }

  class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }

  return {
    Group,
    Mesh,
    BoxGeometry,
    CylinderGeometry,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Vector3,
    DoubleSide: 'DoubleSide',
  };
}

function createHarness() {
  const THREE = createThreeStub();
  const wardrobeGroup = new THREE.Group();
  const doors: any[] = [];
  const applyHingedDoorsOps = createApplyHingedDoorsOps({
    __app: input => (input as any).App,
    __ops: () => undefined,
    __wardrobeGroup: () => wardrobeGroup as any,
    __reg: () => undefined,
    __doors: () => doors,
    __markSplitHoverPickablesDirty: () => undefined,
    __tagAndTrackMirrorSurfaces: () => 0,
    getMirrorMaterial: () => ({ kind: 'mirror' }) as any,
  });
  return { THREE, wardrobeGroup, doors, applyHingedDoorsOps };
}

function hardwareChildren(root: any, role: 'door' | 'carcass') {
  return root.children.filter((child: any) => child?.userData?.__wpHingeRole === role);
}

test('hinged door render emits two realistic hinge assemblies at 100 mm edge inset', () => {
  const { THREE, wardrobeGroup, applyHingedDoorsOps } = createHarness();

  assert.equal(
    applyHingedDoorsOps({
      App: {},
      THREE,
      ops: [
        {
          partId: 'd1_full',
          width: 0.5,
          height: 2,
          y: 1,
          z: 0.6,
          pivotX: -0.25,
          meshOffsetX: 0.25,
          isLeftHinge: true,
        },
      ],
      cfg: {},
      getPartMaterial: () => ({ kind: 'wood' }),
    }),
    true
  );

  const doorGroup = wardrobeGroup.children.find((child: any) => child?.userData?.partId === 'd1_full');
  assert.ok(doorGroup);
  const doorHalves = hardwareChildren(doorGroup, 'door');
  const carcassHalves = hardwareChildren(wardrobeGroup, 'carcass');

  assert.equal(doorHalves.length, 2);
  assert.equal(carcassHalves.length, 2);
  assert.deepEqual(
    doorHalves.map((half: any) => half.position.y),
    [-0.9, 0.9]
  );
  const carcassYs = carcassHalves.map((half: any) => half.position.y);
  assert.ok(Math.abs(carcassYs[0] - 0.1) < 1e-12);
  assert.ok(Math.abs(carcassYs[1] - 1.9) < 1e-12);
  assert.ok(carcassHalves.every((half: any) => half.parent === wardrobeGroup));
  assert.ok(doorHalves.every((half: any) => half.parent === doorGroup));
  assert.ok(
    doorHalves.flatMap((half: any) => half.children).every((mesh: any) => typeof mesh.raycast === 'function')
  );

  const firstDoorHalfMeshes = doorHalves[0].children;
  const firstCarcassHalfMeshes = carcassHalves[0].children;
  assert.equal(firstDoorHalfMeshes.length, 3);
  assert.equal(firstCarcassHalfMeshes.length, 4);
  assert.deepEqual(
    firstDoorHalfMeshes.map((mesh: any) => mesh.userData.__wpHingeComponent),
    ['doorCup', 'doorCupCollar', 'doorConnector']
  );
  assert.deepEqual(
    firstCarcassHalfMeshes.map((mesh: any) => mesh.userData.__wpHingeComponent),
    ['carcassPlate', 'carcassLinkUpper', 'carcassLinkLower', 'carcassConnector']
  );
  assert.ok(firstDoorHalfMeshes.every((mesh: any) => mesh.position.x > 0));
  assert.ok(firstCarcassHalfMeshes.every((mesh: any) => mesh.position.x > 0));
  assert.equal(doorHalves[0].userData.__keepMaterialSubtree, true);
  assert.equal(carcassHalves[0].userData.__keepMaterialSubtree, true);
  assert.ok(firstDoorHalfMeshes.every((mesh: any) => mesh.userData.__keepMaterial === true));
  assert.ok(firstCarcassHalfMeshes.every((mesh: any) => mesh.userData.__keepMaterial === true));
  assert.equal(
    (firstDoorHalfMeshes[1].material as any).color,
    HINGED_DOOR_HARDWARE_RENDER_POLICY.metalColorHex
  );
  assert.equal(HINGED_DOOR_HARDWARE_RENDER_POLICY.metalColorHex, 0xe5e9ef);
  assert.equal(HINGED_DOOR_HARDWARE_RENDER_POLICY.metalness, 0.28);

  const doorConnector = firstDoorHalfMeshes.find(
    (mesh: any) => mesh.userData.__wpHingeComponent === 'doorConnector'
  );
  const carcassConnector = firstCarcassHalfMeshes.find(
    (mesh: any) => mesh.userData.__wpHingeComponent === 'carcassConnector'
  );
  assert.ok(doorConnector && carcassConnector);
  const doorConnectorLength = Number(doorConnector.geometry.args[0]);
  const carcassConnectorLength = Number(carcassConnector.geometry.args[0]);
  const doorInnerX = doorConnector.position.x - doorConnectorLength / 2;
  const carcassOuterX = carcassConnector.position.x + carcassConnectorLength / 2;
  assert.ok(
    carcassOuterX - doorInnerX >= 0.0009,
    'carcass and door connector bars should overlap enough to hide any visible air gap'
  );
});

test('right-hinged door mounts carcass hardware on the inner side of the right panel', () => {
  const { THREE, wardrobeGroup, applyHingedDoorsOps } = createHarness();

  applyHingedDoorsOps({
    App: {},
    THREE,
    ops: [
      {
        partId: 'd_right',
        width: 0.45,
        height: 1.8,
        y: 0.9,
        z: 0.6,
        pivotX: 0.42,
        meshOffsetX: -0.225,
        isLeftHinge: false,
      },
    ],
    cfg: {},
    getPartMaterial: () => ({ kind: 'wood' }),
  });

  const doorGroup = wardrobeGroup.children.find((child: any) => child?.userData?.partId === 'd_right');
  const doorHalves = hardwareChildren(doorGroup, 'door');
  const carcassHalves = hardwareChildren(wardrobeGroup, 'carcass');

  assert.equal(doorHalves.length, 2);
  assert.equal(carcassHalves.length, 2);
  assert.ok(doorHalves[0].children.every((mesh: any) => mesh.position.x < 0));
  assert.ok(carcassHalves[0].children.every((mesh: any) => mesh.position.x < 0));
  assert.ok(
    Math.abs(
      carcassHalves[0].children[0].position.x +
        HINGED_DOOR_HARDWARE_RENDER_POLICY.carcassPlateCenterFromPivotM
    ) < 1e-12
  );
});

test('middle and outer hinged doors use the same carcass hinge geometry and z placement', () => {
  const { THREE, wardrobeGroup, applyHingedDoorsOps } = createHarness();

  applyHingedDoorsOps({
    App: {},
    THREE,
    ops: [
      {
        partId: 'd_outer',
        width: 0.45,
        height: 1.8,
        y: 0.9,
        z: 0.6,
        pivotX: -0.5,
        meshOffsetX: 0.225,
        isLeftHinge: true,
      },
      {
        partId: 'd_middle',
        width: 0.45,
        height: 1.8,
        y: 0.9,
        z: 0.6,
        pivotX: 0,
        meshOffsetX: 0.225,
        isLeftHinge: true,
      },
    ],
    cfg: {},
    getPartMaterial: () => ({ kind: 'wood' }),
  });

  const carcassHalves = hardwareChildren(wardrobeGroup, 'carcass');
  const outer = carcassHalves.filter((half: any) => half.userData.__wpHingeOwnerPartId === 'd_outer');
  const middle = carcassHalves.filter((half: any) => half.userData.__wpHingeOwnerPartId === 'd_middle');
  assert.equal(outer.length, 2);
  assert.equal(middle.length, 2);
  assert.deepEqual(
    middle.map((half: any) => half.position.z),
    outer.map((half: any) => half.position.z)
  );
  assert.deepEqual(
    middle.map((half: any) => half.children.map((mesh: any) => mesh.geometry.args)),
    outer.map((half: any) => half.children.map((mesh: any) => mesh.geometry.args))
  );
});

test('split hinged door segments each receive their own independent pair of hinges', () => {
  const { THREE, wardrobeGroup, applyHingedDoorsOps } = createHarness();

  applyHingedDoorsOps({
    App: {},
    THREE,
    ops: [
      {
        partId: 'd2_bot',
        width: 0.5,
        height: 0.2,
        y: 0.1,
        z: 0.6,
        pivotX: 0.25,
        meshOffsetX: -0.25,
        isLeftHinge: false,
      },
      {
        partId: 'd2_top',
        width: 0.5,
        height: 0.8,
        y: 0.7,
        z: 0.6,
        pivotX: 0.25,
        meshOffsetX: -0.25,
        isLeftHinge: false,
      },
    ],
    cfg: {},
    getPartMaterial: () => ({ kind: 'wood' }),
  });

  const doorGroups = wardrobeGroup.children.filter((child: any) =>
    child?.userData?.partId?.startsWith('d2_')
  );
  assert.equal(doorGroups.length, 2);
  assert.ok(doorGroups.every((group: any) => hardwareChildren(group, 'door').length === 2));

  const carcassHalves = hardwareChildren(wardrobeGroup, 'carcass');
  assert.equal(carcassHalves.length, 4);
  assert.equal(
    carcassHalves.filter((half: any) => half.userData.__wpHingeOwnerPartId === 'd2_bot').length,
    2
  );
  assert.equal(
    carcassHalves.filter((half: any) => half.userData.__wpHingeOwnerPartId === 'd2_top').length,
    2
  );

  const shortDoor = doorGroups.find((group: any) => group.userData.partId === 'd2_bot');
  assert.deepEqual(
    hardwareChildren(shortDoor, 'door').map((half: any) => half.position.y),
    [-0.05, 0.05]
  );
  assert.equal(HINGED_DOOR_HARDWARE_RENDER_POLICY.shortDoorInsetRatio, 0.25);
});

test('removed hinged door does not leave either door-side or carcass-side hinge hardware behind', () => {
  const { THREE, wardrobeGroup, applyHingedDoorsOps } = createHarness();

  applyHingedDoorsOps({
    App: {},
    THREE,
    ops: [
      {
        partId: 'd3_full',
        width: 0.5,
        height: 2,
        y: 1,
        z: 0.6,
        pivotX: -0.25,
        meshOffsetX: 0.25,
        isLeftHinge: true,
        isRemoved: true,
      },
    ],
    cfg: {},
    removeDoorsEnabled: true,
    isRemoveDoorMode: false,
    getPartMaterial: () => ({ kind: 'wood' }),
  });

  const removedGroup = wardrobeGroup.children.find((child: any) => child?.userData?.partId === 'd3_full');
  assert.ok(removedGroup);
  assert.equal(hardwareChildren(removedGroup, 'door').length, 0);
  assert.equal(hardwareChildren(wardrobeGroup, 'carcass').length, 0);
});
