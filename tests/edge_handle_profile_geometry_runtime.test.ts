import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createDoorEdgeHandleProfile,
  createDrawerEdgeHandleProfile,
} from '../esm/native/builder/edge_handle_profile.ts';
import { SLIDING_DOOR_CONSTRUCTION_POLICY } from '../esm/shared/dimensions/door_system_policy.ts';
import { resolveEdgeHandleMount } from '../esm/shared/handle_catalog.ts';

const material = new THREE.MeshStandardMaterial();
const front = { minX: -0.28, maxX: 0.32, minY: -0.3, maxY: 0.3 };

function box(node: unknown): THREE.Box3 {
  return new THREE.Box3().setFromObject(node as THREE.Object3D);
}

function near(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} should be near ${expected}`);
}

test('handed edge profiles seat on the opening edge, with the back flange and grip outside the slab', () => {
  for (const left of [false, true]) {
    const mount = resolveEdgeHandleMount(front, 'door', left, 'long', { x: 0, y: 0.27 });
    assert.ok(mount);
    const profile = createDoorEdgeHandleProfile({
      THREE,
      material,
      length: mount.length,
      frontThicknessM: 0.019,
      isLeftHinge: left,
    });
    profile.position.set(mount.x, mount.y, 0.0095);
    near(mount.x, left ? front.maxX : front.minX);
    near(box(profile).max.y, front.maxY);
    const [flange, web, grip] = profile.children;
    near(box(flange).max.z, -0.0095);
    near(box(grip).max.z, 0.0095 + 0.023);
    near(left ? box(web).min.x : box(web).max.x, mount.x);
    near(box(web).max.x - box(web).min.x, 0.0015);
    assert.ok(left ? box(grip).max.x <= mount.x + 1e-8 : box(grip).min.x >= mount.x - 1e-8);
  }
});

test('drawer profiles stay at the top edge and fit the actual width with both end clearances', () => {
  const rect = { minX: 0.05, maxX: 0.4, minY: -0.06, maxY: 0.09 };
  const mount = resolveEdgeHandleMount(rect, 'drawer', true, 'long', { x: 1, y: -0.05 });
  assert.ok(mount);
  near(mount.length, 0.31);
  near(mount.y, rect.maxY);
  const profile = createDrawerEdgeHandleProfile({
    THREE,
    material,
    length: mount.length,
    frontThicknessM: 0.02,
  });
  profile.position.set(mount.x, mount.y, 0.01);
  const bounds = box(profile);
  near(bounds.min.x, 0.07);
  near(bounds.max.x, 0.38);
  near(bounds.max.y, 0.0915);
  near(box(profile.children[0]).max.z, -0.01);
  near(box(profile.children[2]).max.z, 0.033);
  assert.equal(
    resolveEdgeHandleMount({ ...rect, maxX: 0.16 }, 'drawer', true, 'short', { x: 0, y: 0 }),
    null
  );
});

test('opposing sliding profiles leave clearance in the nominal 8 mm track gap', () => {
  const { visualThicknessM, trackInnerLaneGapM } = SLIDING_DOOR_CONSTRUCTION_POLICY;
  const profile = createDoorEdgeHandleProfile({
    THREE,
    material,
    length: 0.6,
    frontThicknessM: visualThicknessM,
    isLeftHinge: true,
    sliding: true,
  });
  const bounds = box(profile);
  near(bounds.max.z, 0.005);
  near(bounds.min.z, -0.0235);
  assert.ok(bounds.max.z + (-bounds.min.z - visualThicknessM) < trackInnerLaneGapM - visualThicknessM);
});
