import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendInteriorRodEndSupports,
  INTERIOR_ROD_SUPPORT_VISUAL_POLICY,
} from '../esm/native/builder/interior_rod_support_visuals.ts';
import { INTERIOR_ROD_RENDER_POLICY } from '../esm/shared/dimensions/interior_fittings_policy.ts';

class TorusGeometry {
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

class BoxGeometry {
  args: unknown[];
  constructor(...args: unknown[]) {
    this.args = args;
  }
}

class Mesh {
  geometry: unknown;
  material: unknown;
  rotation = { x: 0, y: 0, z: 0 };
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
  userData: Record<string, unknown> = {};

  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }
}

const THREE = { TorusGeometry, CylinderGeometry, BoxGeometry, Mesh };

function closeTo(actual: number, expected: number, message?: string): void {
  assert.ok(Math.abs(actual - expected) <= 1e-9, message ?? `${actual} must equal ${expected}`);
}

test('rod support visual emits two U-cups fixed back to the side surfaces for an X-axis rod', () => {
  const added: Mesh[] = [];
  const outlined: Mesh[] = [];
  const material = { id: 'rod-metal' };
  const rodLength = 0.76;
  const centerX = 1.2;
  const centerY = 1.45;
  const centerZ = -0.28;

  const count = appendInteriorRodEndSupports({
    THREE,
    parent: { add: obj => added.push(obj as Mesh) },
    material,
    centerX,
    centerY,
    centerZ,
    rodLength,
    rodRadius: INTERIOR_ROD_RENDER_POLICY.radiusM,
    axis: 'x',
    ownerPartId: 'rod-a',
    addOutlines: obj => outlined.push(obj as Mesh),
  });

  assert.equal(count, 6);
  assert.equal(added.length, 6);
  assert.equal(outlined.length, 6);
  assert.ok(added.every(mesh => mesh.material === material));
  assert.ok(added.every(mesh => mesh.userData.__wpRodSupportHardware === true));
  assert.ok(added.every(mesh => mesh.userData.__ignoreRaycast === true));
  assert.ok(added.every(mesh => mesh.userData.__wpRodOwnerPartId === 'rod-a'));

  const cups = added.filter(mesh => mesh.geometry instanceof TorusGeometry);
  const arms = added.filter(mesh => mesh.geometry instanceof BoxGeometry);
  const plates = added.filter(mesh => mesh.geometry instanceof CylinderGeometry);
  assert.equal(cups.length, 2);
  assert.equal(arms.length, 2);
  assert.equal(plates.length, 2);

  const expectedLeftEnd = centerX - rodLength / 2;
  const expectedRightEnd = centerX + rodLength / 2;
  closeTo(cups[0].position.x, expectedLeftEnd);
  closeTo(cups[1].position.x, expectedRightEnd);
  closeTo(cups[0].position.y, centerY);
  closeTo(cups[0].position.z, centerZ);
  assert.equal(cups[0].rotation.z, Math.PI, 'the half ring must open upward');
  assert.equal(cups[0].rotation.y, Math.PI / 2, 'the cup plane must be perpendicular to the X rod');
  assert.equal((cups[0].geometry as TorusGeometry).args[4], Math.PI, 'the cup must be a half ring');

  closeTo(
    plates[0].position.x,
    expectedLeftEnd -
      (INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountProjectionM -
        INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountPlateThicknessM / 2)
  );
  closeTo(
    plates[1].position.x,
    expectedRightEnd +
      (INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountProjectionM -
        INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountPlateThicknessM / 2)
  );
  assert.equal(plates[0].rotation.z, Math.PI / 2);
});

test('rod support visual rotates the same hardware correctly for a Z-axis corner rod', () => {
  const added: Mesh[] = [];
  const rodLength = 0.64;

  const count = appendInteriorRodEndSupports({
    THREE,
    parent: { add: obj => added.push(obj as Mesh) },
    material: { id: 'metal' },
    centerX: 0.4,
    centerY: 1.3,
    centerZ: 0.5,
    rodLength,
    rodRadius: INTERIOR_ROD_RENDER_POLICY.radiusM,
    axis: 'z',
  });

  assert.equal(count, 6);
  const cups = added.filter(mesh => mesh.geometry instanceof TorusGeometry);
  const plates = added.filter(mesh => mesh.geometry instanceof CylinderGeometry);
  closeTo(cups[0].position.z, 0.5 - rodLength / 2);
  closeTo(cups[1].position.z, 0.5 + rodLength / 2);
  assert.equal(cups[0].rotation.z, Math.PI);
  assert.equal(cups[0].rotation.y, 0);
  assert.equal(plates[0].rotation.x, Math.PI / 2);
});

test('rod support visual never emits orphan hardware when the rod geometry is not valid', () => {
  const added: unknown[] = [];
  const count = appendInteriorRodEndSupports({
    THREE,
    parent: { add: obj => added.push(obj) },
    material: {},
    centerX: 0,
    centerY: 0,
    centerZ: 0,
    rodLength: 0,
    rodRadius: INTERIOR_ROD_RENDER_POLICY.radiusM,
  });

  assert.equal(count, 0);
  assert.deepEqual(added, []);
});
