import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendInteriorRodEndSupports,
  INTERIOR_ROD_SUPPORT_VISUAL_POLICY,
  resolveInteriorRodSupportInsertionDepth,
} from '../esm/native/builder/interior_rod_support_visuals.ts';
import { INTERIOR_ROD_RENDER_POLICY } from '../esm/shared/dimensions/interior_fittings_policy.ts';
import { HINGED_DOOR_HARDWARE_RENDER_POLICY } from '../esm/shared/dimensions/door_system_policy.ts';

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

class MeshStandardMaterial {
  params: Record<string, unknown>;
  constructor(params: Record<string, unknown> = {}) {
    this.params = params;
  }
}

class Mesh {
  geometry: unknown;
  material: unknown;
  rotation = { x: 0, y: 0, z: 0 };
  scale = {
    x: 1,
    y: 1,
    z: 1,
    set: (x: number, y: number, z: number) => {
      this.scale.x = x;
      this.scale.y = y;
      this.scale.z = z;
    },
  };
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

const THREE = { TorusGeometry, CylinderGeometry, MeshStandardMaterial, Mesh };

function closeTo(actual: number, expected: number, message?: string): void {
  assert.ok(Math.abs(actual - expected) <= 1e-9, message ?? `${actual} must equal ${expected}`);
}

test('rod support insertion extends visibly into the cup while preserving a mounting lip', () => {
  closeTo(resolveInteriorRodSupportInsertionDepth(0.02), 0.012);
  closeTo(resolveInteriorRodSupportInsertionDepth(0.03), 0.018);
  closeTo(resolveInteriorRodSupportInsertionDepth(0), 0);
  closeTo(resolveInteriorRodSupportInsertionDepth(Number.NaN), 0);
});

test('rod support visual mounts a half-round wall plate, projecting U-cup, and seated rod continuation', () => {
  const added: Mesh[] = [];
  const outlined: Mesh[] = [];
  const material = { id: 'rod-metal' };
  const rodLength = 0.76;
  const centerX = 1.2;
  const centerY = 1.45;
  const centerZ = -0.28;
  const negativeMountCoord = 0.8;
  const positiveMountCoord = 1.6;

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
    negativeMountCoord,
    positiveMountCoord,
    ownerPartId: 'rod-a',
    addOutlines: obj => outlined.push(obj as Mesh),
  });

  assert.equal(count, 6);
  assert.equal(added.length, 6);
  assert.equal(outlined.length, 6);
  assert.ok(added.every(mesh => mesh.userData.__wpRodSupportHardware === true));
  assert.ok(added.every(mesh => mesh.userData.__ignoreRaycast === true));
  assert.ok(added.every(mesh => mesh.userData.__wpRodOwnerPartId === 'rod-a'));

  const cups = added.filter(mesh => mesh.userData.__wpRodSupportRole === 'cup');
  const plates = added.filter(mesh => mesh.userData.__wpRodSupportRole === 'mount_plate');
  const rodExtensions = added.filter(mesh => mesh.userData.__wpRodSupportRole === 'rod_extension');
  assert.equal(cups.length, 2);
  assert.equal(plates.length, 2);
  assert.equal(rodExtensions.length, 2);
  assert.ok(cups.every(mesh => mesh.geometry instanceof TorusGeometry));
  assert.ok(plates.every(mesh => mesh.geometry instanceof CylinderGeometry));
  assert.ok(rodExtensions.every(mesh => mesh.geometry instanceof CylinderGeometry));
  assert.ok(cups.every(mesh => mesh.material instanceof MeshStandardMaterial));
  assert.ok(plates.every(mesh => mesh.material instanceof MeshStandardMaterial));
  assert.ok(rodExtensions.every(mesh => mesh.material === material));
  assert.deepEqual((cups[0].material as MeshStandardMaterial).params, {
    color: HINGED_DOOR_HARDWARE_RENDER_POLICY.metalColorHex,
    metalness: HINGED_DOOR_HARDWARE_RENDER_POLICY.metalness,
    roughness: HINGED_DOOR_HARDWARE_RENDER_POLICY.roughness,
    emissive: HINGED_DOOR_HARDWARE_RENDER_POLICY.metalEmissiveHex,
    emissiveIntensity: HINGED_DOOR_HARDWARE_RENDER_POLICY.metalEmissiveIntensity,
  });

  const expectedLeftEnd = centerX - rodLength / 2;
  const expectedRightEnd = centerX + rodLength / 2;
  const leftGap = expectedLeftEnd - negativeMountCoord;
  const rightGap = positiveMountCoord - expectedRightEnd;
  closeTo(leftGap, 0.02);
  closeTo(rightGap, 0.02);

  closeTo(cups[0].position.x, negativeMountCoord + leftGap / 2);
  closeTo(cups[1].position.x, positiveMountCoord - rightGap / 2);
  closeTo(cups[0].position.y, centerY);
  closeTo(cups[0].position.z, centerZ);
  assert.equal(
    cups[0].rotation.z,
    (Math.PI * 3) / 4,
    'the three-quarter ring mouth must stay centered upward'
  );
  assert.equal(cups[0].rotation.y, Math.PI / 2, 'the cup plane must be perpendicular to the X rod');
  assert.equal(
    (cups[0].geometry as TorusGeometry).args[4],
    INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupArcLengthRad,
    'the cup must cover roughly three quarters of the rod circle'
  );
  closeTo(
    cups[0].scale.z,
    leftGap / (2 * INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupTubeRadiusM),
    'the half-ring itself must project from the wall to the rod'
  );

  const expectedInsertion = resolveInteriorRodSupportInsertionDepth(leftGap);
  closeTo((rodExtensions[0].geometry as CylinderGeometry).args[2] as number, expectedInsertion);
  closeTo((rodExtensions[1].geometry as CylinderGeometry).args[2] as number, expectedInsertion);
  closeTo(rodExtensions[0].position.x, expectedLeftEnd - expectedInsertion / 2);
  closeTo(rodExtensions[1].position.x, expectedRightEnd + expectedInsertion / 2);
  assert.equal(rodExtensions[0].rotation.z, Math.PI / 2);

  closeTo(
    plates[0].position.x,
    negativeMountCoord + INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountPlateThicknessM / 2
  );
  closeTo(
    plates[1].position.x,
    positiveMountCoord - INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountPlateThicknessM / 2
  );
  assert.equal(plates[0].rotation.z, Math.PI / 2);
  assert.equal((plates[0].geometry as CylinderGeometry).args[6], (Math.PI * 3) / 4);
  assert.equal(
    (plates[0].geometry as CylinderGeometry).args[7],
    INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountPlateArcLengthRad
  );
});

test('rod support visual uses the real mount gap and rotates the same hardware for a Z-axis rod', () => {
  const added: Mesh[] = [];
  const rodLength = 0.64;
  const centerZ = 0.5;
  const negativeMountCoord = centerZ - rodLength / 2 - 0.03;
  const positiveMountCoord = centerZ + rodLength / 2 + 0.03;

  const count = appendInteriorRodEndSupports({
    THREE,
    parent: { add: obj => added.push(obj as Mesh) },
    material: { id: 'metal' },
    centerX: 0.4,
    centerY: 1.3,
    centerZ,
    rodLength,
    rodRadius: INTERIOR_ROD_RENDER_POLICY.radiusM,
    axis: 'z',
    negativeMountCoord,
    positiveMountCoord,
  });

  assert.equal(count, 6);
  const cups = added.filter(mesh => mesh.userData.__wpRodSupportRole === 'cup');
  const plates = added.filter(mesh => mesh.userData.__wpRodSupportRole === 'mount_plate');
  const rodExtensions = added.filter(mesh => mesh.userData.__wpRodSupportRole === 'rod_extension');
  closeTo(cups[0].position.z, negativeMountCoord + 0.015);
  closeTo(cups[1].position.z, positiveMountCoord - 0.015);
  closeTo(cups[0].scale.z, 0.03 / (2 * INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupTubeRadiusM));
  assert.equal(cups[0].rotation.z, (Math.PI * 3) / 4);
  assert.equal(cups[0].rotation.y, 0);
  assert.equal(plates[0].rotation.x, Math.PI / 2);
  assert.equal((plates[0].geometry as CylinderGeometry).args[6], (-Math.PI * 3) / 4);
  assert.equal(
    (plates[0].geometry as CylinderGeometry).args[7],
    INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountPlateArcLengthRad
  );
  closeTo((rodExtensions[0].geometry as CylinderGeometry).args[2] as number, 0.018);
  closeTo(rodExtensions[0].position.z, centerZ - rodLength / 2 - 0.009);
  closeTo(rodExtensions[1].position.z, centerZ + rodLength / 2 + 0.009);
});

test('rod support visual keeps a useful cup projection when a clipped rod ends directly at its mount surface', () => {
  const added: Mesh[] = [];
  const rodLength = 0.5;
  const centerX = 0;
  const rodLeftEnd = centerX - rodLength / 2;

  appendInteriorRodEndSupports({
    THREE,
    parent: { add: obj => added.push(obj as Mesh) },
    material: {},
    centerX,
    centerY: 1.2,
    centerZ: 0,
    rodLength,
    rodRadius: INTERIOR_ROD_RENDER_POLICY.radiusM,
    axis: 'x',
    negativeMountCoord: rodLeftEnd,
    positiveMountCoord: centerX + rodLength / 2 + 0.02,
  });

  const cups = added.filter(mesh => mesh.userData.__wpRodSupportRole === 'cup');
  closeTo(cups[0].position.x, rodLeftEnd + INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupProjectionMinM / 2);
  closeTo(
    cups[0].scale.z,
    INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupProjectionMinM /
      (2 * INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupTubeRadiusM)
  );
  const rodExtensions = added.filter(mesh => mesh.userData.__wpRodSupportRole === 'rod_extension');
  assert.equal(rodExtensions.length, 1, 'the end already at its mount surface must not grow an extension');
  assert.equal(rodExtensions[0].userData.__wpRodSupportSide, 'positive');
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
