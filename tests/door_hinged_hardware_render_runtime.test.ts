import test from 'node:test';
import assert from 'node:assert/strict';

import { createApplyHingedDoorsOps } from '../esm/native/builder/render_door_ops_hinged.ts';
import {
  attachHingedDoorHardware,
  createHingedDoorHardwareRenderState,
  readHingedDoorHardwareRuntimeContext,
} from '../esm/native/builder/render_hinged_door_hardware.ts';
import { HINGED_DOOR_HARDWARE_RENDER_POLICY } from '../esm/shared/dimensions/door_system_policy.ts';
import {
  resolveHingedDoorMotionFrameX,
  resolveHingedDoorTargetRotationY,
} from '../esm/native/runtime/hinged_door_kinematics.ts';

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
  assert.equal(firstDoorHalfMeshes.length, 2);
  assert.equal(firstCarcassHalfMeshes.length, 4);
  assert.deepEqual(
    firstDoorHalfMeshes.map((mesh: any) => mesh.userData.__wpHingeComponent),
    ['doorCup', 'doorCupCollar']
  );
  assert.deepEqual(
    firstCarcassHalfMeshes.map((mesh: any) => mesh.userData.__wpHingeComponent),
    ['carcassPlate', 'carcassLinkUpper', 'carcassLinkLower', 'carcassConnector']
  );
  assert.equal(doorHalves[0].userData.__keepMaterialSubtree, true);
  assert.equal(carcassHalves[0].userData.__keepMaterialSubtree, true);
  assert.ok(firstDoorHalfMeshes.every((mesh: any) => mesh.userData.__keepMaterial === true));
  assert.ok(firstCarcassHalfMeshes.every((mesh: any) => mesh.userData.__keepMaterial === true));
  assert.equal(
    (firstDoorHalfMeshes[1].material as any).color,
    HINGED_DOOR_HARDWARE_RENDER_POLICY.metalColorHex
  );
  assert.equal(
    (firstDoorHalfMeshes[0].material as any).color,
    HINGED_DOOR_HARDWARE_RENDER_POLICY.accentColorHex
  );
  assert.equal(HINGED_DOOR_HARDWARE_RENDER_POLICY.metalColorHex, 0xe5e9ef);
  assert.equal(HINGED_DOOR_HARDWARE_RENDER_POLICY.metalness, 0.28);

  const carcassConnector = firstCarcassHalfMeshes[3];
  assert.ok(carcassConnector.userData.__wpConnectorStartX > 0);
  assert.ok(carcassConnector.userData.__wpConnectorEndX > carcassConnector.userData.__wpConnectorStartX);
  assert.ok(carcassConnector.userData.__wpConnectorEndZ > carcassConnector.userData.__wpConnectorStartZ);
  assert.equal(
    firstDoorHalfMeshes.some((mesh: any) => mesh.userData.__wpHingeComponent === 'doorConnector'),
    false
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
        (HINGED_DOOR_HARDWARE_RENDER_POLICY.nominalCarcassMountFaceFromPivotM +
          HINGED_DOOR_HARDWARE_RENDER_POLICY.carcassPlateThicknessM / 2)
    ) < 1e-12
  );
  const rightConnector = carcassHalves[0].children.find(
    (mesh: any) => mesh.userData.__wpHingeComponent === 'carcassConnector'
  );
  assert.ok(rightConnector.userData.__wpConnectorStartX < 0);
  assert.ok(rightConnector.userData.__wpConnectorEndX < rightConnector.userData.__wpConnectorStartX);
  assert.ok(rightConnector.userData.__wpConnectorEndZ > rightConnector.userData.__wpConnectorStartZ);
});

test('carcass plate mounts directly on the supplied panel face and fixed connector aims outward at the open cup edge', () => {
  const { THREE, wardrobeGroup, applyHingedDoorsOps } = createHarness();

  applyHingedDoorsOps({
    App: {},
    THREE,
    ops: [
      {
        partId: 'd_direct_mount',
        width: 0.45,
        height: 1.8,
        y: 0.9,
        z: 0.6,
        pivotX: 0.12,
        meshOffsetX: 0.225,
        isLeftHinge: true,
        carcassMountFaceX: 0.006,
      },
    ],
    cfg: {},
    getPartMaterial: () => ({ kind: 'wood' }),
  });

  const doorGroup = wardrobeGroup.children.find((child: any) => child?.userData?.partId === 'd_direct_mount');
  const doorHalf = hardwareChildren(doorGroup, 'door')[0];
  const carcassHalf = hardwareChildren(wardrobeGroup, 'carcass')[0];
  const byName = (root: any, name: string) =>
    root.children.find((mesh: any) => mesh.userData.__wpHingeComponent === name);

  const plate = byName(carcassHalf, 'carcassPlate');
  const upper = byName(carcassHalf, 'carcassLinkUpper');
  const lower = byName(carcassHalf, 'carcassLinkLower');
  const carcassConnector = byName(carcassHalf, 'carcassConnector');

  const plateInnerFaceX = plate.position.x - HINGED_DOOR_HARDWARE_RENDER_POLICY.carcassPlateThicknessM / 2;
  assert.ok(Math.abs(plateInnerFaceX - 0.006) < 1e-12);
  assert.ok(upper.position.x > plate.position.x);
  assert.ok(lower.position.x > plate.position.x);
  assert.ok(upper.position.y > 0);
  assert.ok(lower.position.y < 0);

  assert.equal(byName(doorHalf, 'doorConnector'), undefined);

  const startX = Number(carcassConnector.userData.__wpConnectorStartX);
  const startZ = Number(carcassConnector.userData.__wpConnectorStartZ);
  const endX = Number(carcassConnector.userData.__wpConnectorEndX);
  const endZ = Number(carcassConnector.userData.__wpConnectorEndZ);
  assert.ok(startX > 0);
  assert.ok(endX > startX, 'connector must lean slightly away from the left carcass face');
  assert.ok(endZ > startZ, 'connector must point predominantly outward/front, not back into the carcass');
  assert.ok(endZ > 0, 'open-door target must reach the visible cup side of the hinge');

  const localNearCupX = Math.max(
    0.0005,
    HINGED_DOOR_HARDWARE_RENDER_POLICY.cupCenterFromHingeEdgeM -
      HINGED_DOOR_HARDWARE_RENDER_POLICY.cupCollarRadiusM +
      HINGED_DOOR_HARDWARE_RENDER_POLICY.carcassConnectorCupOverlapM
  );
  const cupRearZ = -0.018 / 2 - HINGED_DOOR_HARDWARE_RENDER_POLICY.cupVisibleDepthM - 0.0002;
  const angle = -HINGED_DOOR_HARDWARE_RENDER_POLICY.carcassConnectorOpenAngleRad;
  const expectedX = localNearCupX * Math.cos(angle) + cupRearZ * Math.sin(angle);
  const expectedZ = -localNearCupX * Math.sin(angle) + cupRearZ * Math.cos(angle);
  assert.ok(Math.abs(endX - expectedX) < 1e-12);
  assert.ok(Math.abs(endZ - expectedZ) < 1e-12);
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

test('shared-divider hinge connectors target the translated cup position used by middle-door collision clearance', () => {
  const { THREE, wardrobeGroup, doors, applyHingedDoorsOps } = createHarness();

  applyHingedDoorsOps({
    App: {},
    THREE,
    ops: [
      {
        partId: 'd_middle_left',
        width: 0.45,
        height: 1.8,
        y: 0.9,
        z: 0.6,
        pivotX: 0,
        meshOffsetX: -0.225,
        isLeftHinge: false,
      },
      {
        partId: 'd_middle_right',
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

  for (const door of doors) {
    const doorGroup = door.group;
    const partId = String(doorGroup.userData.partId);
    const carcassHalf = hardwareChildren(wardrobeGroup, 'carcass').find(
      (half: any) => half.userData.__wpHingeOwnerPartId === partId
    );
    assert.ok(carcassHalf);
    const connector = carcassHalf.children.find(
      (mesh: any) => mesh.userData.__wpHingeComponent === 'carcassConnector'
    );
    assert.ok(connector);

    const targetRotationY = resolveHingedDoorTargetRotationY(door as any, true);
    const targetFrameX = resolveHingedDoorMotionFrameX(door as any, doors as any, targetRotationY);
    assert.notEqual(targetFrameX, null);

    const hingeDirection = door.hingeSide === 'left' ? 1 : -1;
    const nearCupLocalX =
      hingeDirection *
      Math.max(
        0.0005,
        HINGED_DOOR_HARDWARE_RENDER_POLICY.cupCenterFromHingeEdgeM -
          HINGED_DOOR_HARDWARE_RENDER_POLICY.cupCollarRadiusM +
          HINGED_DOOR_HARDWARE_RENDER_POLICY.carcassConnectorCupOverlapM
      );
    const cupRearZ = -0.018 / 2 - HINGED_DOOR_HARDWARE_RENDER_POLICY.cupVisibleDepthM - 0.0002;
    const expectedEndX =
      Number(targetFrameX) -
      carcassHalf.position.x +
      nearCupLocalX * Math.cos(targetRotationY) +
      cupRearZ * Math.sin(targetRotationY);
    const expectedEndZ = -nearCupLocalX * Math.sin(targetRotationY) + cupRearZ * Math.cos(targetRotationY);

    assert.ok(Math.abs(Number(connector.userData.__wpConnectorEndX) - expectedEndX) < 1e-12);
    assert.ok(Math.abs(Number(connector.userData.__wpConnectorEndZ) - expectedEndZ) < 1e-12);
    assert.ok(
      Math.abs(Number(readHingedDoorHardwareRuntimeContext(doorGroup)?.openFrameOffsetX)) > 0.009,
      'shared-divider hardware must preserve the non-zero lateral frame correction'
    );
  }
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

test('hinge hardware mirrors its door-back geometry for a negative front direction and preserves that direction for later segmented rebuilds', () => {
  const THREE = createThreeStub();
  const mount = new THREE.Group();
  const doorGroup = new THREE.Group();
  mount.add(doorGroup);
  doorGroup.position.set(0, 0.9, -0.3);
  const state = createHingedDoorHardwareRenderState(THREE as any, HINGED_DOOR_HARDWARE_RENDER_POLICY, 0.018);

  attachHingedDoorHardware({
    THREE: THREE as any,
    wardrobeGroup: mount as any,
    doorGroup: doorGroup as any,
    doorOp: {
      x: 0,
      y: 0.9,
      z: -0.3,
      width: 0.45,
      height: 1.8,
      partId: 'corner_pent_door_1_full',
      isLeftHinge: true,
      isRemoved: false,
      isMirror: false,
      hasGroove: false,
      pivotX: 0,
      carcassMountFaceX: 0,
    },
    state,
    frontSign: -1,
  });

  const doorHalf = hardwareChildren(doorGroup, 'door')[0];
  const carcassHalf = hardwareChildren(mount, 'carcass')[0];
  const cup = doorHalf.children.find((mesh: any) => mesh.userData.__wpHingeComponent === 'doorCup');
  const plate = carcassHalf.children.find((mesh: any) => mesh.userData.__wpHingeComponent === 'carcassPlate');
  const connector = carcassHalf.children.find(
    (mesh: any) => mesh.userData.__wpHingeComponent === 'carcassConnector'
  );

  assert.ok(cup.position.z > 0, 'door-side cup must sit behind a -Z-facing leaf');
  assert.ok(plate.position.z > 0, 'carcass plate must mirror to the interior side of a -Z-facing front');
  assert.ok(
    connector.userData.__wpConnectorEndZ < connector.userData.__wpConnectorStartZ,
    'fixed connector must point outward in -Z for a negative-facing front'
  );
  assert.equal(readHingedDoorHardwareRuntimeContext(doorGroup as any)?.frontSign, -1);
});
