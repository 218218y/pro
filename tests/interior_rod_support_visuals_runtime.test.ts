import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendInteriorRodEndSupports,
  INTERIOR_ROD_SUPPORT_VISUAL_POLICY,
  resolveInteriorRodMountedAxisSpan,
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

const THREE = { TorusGeometry, CylinderGeometry, Mesh };

function closeTo(actual: number, expected: number, message?: string): void {
  assert.ok(Math.abs(actual - expected) <= 1e-9, message ?? `${actual} must equal ${expected}`);
}

test('mounted rod span extends the rod well into both support cups while preserving a front lip', () => {
  const mounted = resolveInteriorRodMountedAxisSpan({
    centerCoord: 1.2,
    rodLength: 0.76,
    negativeMountCoord: 0.8,
    positiveMountCoord: 1.6,
  });

  assert.ok(mounted);
  if (!mounted) return;
  closeTo(mounted.negativeMountGapM, 0.02);
  closeTo(mounted.positiveMountGapM, 0.02);
  closeTo(mounted.negativeInsertionM, 0.012);
  closeTo(mounted.positiveInsertionM, 0.012);
  closeTo(mounted.minCoord, 0.808);
  closeTo(mounted.maxCoord, 1.592);
  closeTo(mounted.centerCoord, 1.2);
  closeTo(mounted.rodLength, 0.784);
});

test('mounted rod span never invents insertion when an end already sits at its mount surface', () => {
  const mounted = resolveInteriorRodMountedAxisSpan({
    centerCoord: 0,
    rodLength: 0.5,
    negativeMountCoord: -0.25,
    positiveMountCoord: 0.28,
  });

  assert.ok(mounted);
  if (!mounted) return;
  closeTo(mounted.negativeMountGapM, 0);
  closeTo(mounted.positiveMountGapM, 0.03);
  closeTo(mounted.negativeInsertionM, 0);
  closeTo(mounted.positiveInsertionM, 0.018);
  closeTo(mounted.minCoord, -0.25);
  closeTo(mounted.maxCoord, 0.268);
  closeTo(mounted.rodLength, 0.518);
});

test('rod support visual mounts a round plate on each wall with a projecting U-cup and no arm', () => {
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

  assert.equal(count, 4);
  assert.equal(added.length, 4);
  assert.equal(outlined.length, 4);
  assert.ok(added.every(mesh => mesh.material === material));
  assert.ok(added.every(mesh => mesh.userData.__wpRodSupportHardware === true));
  assert.ok(added.every(mesh => mesh.userData.__ignoreRaycast === true));
  assert.ok(added.every(mesh => mesh.userData.__wpRodOwnerPartId === 'rod-a'));

  const cups = added.filter(mesh => mesh.geometry instanceof TorusGeometry);
  const plates = added.filter(mesh => mesh.geometry instanceof CylinderGeometry);
  assert.equal(cups.length, 2);
  assert.equal(plates.length, 2);

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
  assert.equal(cups[0].rotation.z, Math.PI, 'the half ring must open upward');
  assert.equal(cups[0].rotation.y, Math.PI / 2, 'the cup plane must be perpendicular to the X rod');
  assert.equal((cups[0].geometry as TorusGeometry).args[4], Math.PI, 'the cup must be a half ring');
  closeTo(
    cups[0].scale.z,
    leftGap / (2 * INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupTubeRadiusM),
    'the half-ring itself must project from the wall to the rod'
  );

  closeTo(
    plates[0].position.x,
    negativeMountCoord + INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountPlateThicknessM / 2
  );
  closeTo(
    plates[1].position.x,
    positiveMountCoord - INTERIOR_ROD_SUPPORT_VISUAL_POLICY.mountPlateThicknessM / 2
  );
  assert.equal(plates[0].rotation.z, Math.PI / 2);
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

  assert.equal(count, 4);
  const cups = added.filter(mesh => mesh.geometry instanceof TorusGeometry);
  const plates = added.filter(mesh => mesh.geometry instanceof CylinderGeometry);
  closeTo(cups[0].position.z, negativeMountCoord + 0.015);
  closeTo(cups[1].position.z, positiveMountCoord - 0.015);
  closeTo(cups[0].scale.z, 0.03 / (2 * INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupTubeRadiusM));
  assert.equal(cups[0].rotation.z, Math.PI);
  assert.equal(cups[0].rotation.y, 0);
  assert.equal(plates[0].rotation.x, Math.PI / 2);
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

  const cups = added.filter(mesh => mesh.geometry instanceof TorusGeometry);
  closeTo(cups[0].position.x, rodLeftEnd + INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupProjectionMinM / 2);
  closeTo(
    cups[0].scale.z,
    INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupProjectionMinM /
      (2 * INTERIOR_ROD_SUPPORT_VISUAL_POLICY.cupTubeRadiusM)
  );
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
