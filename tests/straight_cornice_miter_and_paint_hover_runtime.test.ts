import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { computeCarcassOps } from '../esm/native/builder/core_pure_compute.ts';
import { createProfileSegment } from '../esm/native/builder/render_carcass_ops_cornice_segments.ts';
import { buildCornerWingProfileCornicePlan } from '../esm/native/builder/corner_wing_cornice_plan.ts';
import { renderCornerCornicePlan } from '../esm/native/builder/corner_cornice_render.ts';
import { resolvePaintPreviewGroupBox } from '../esm/native/services/canvas_picking_generic_paint_hover_preview.ts';

function makeStraightCornice() {
  const cornice = computeCarcassOps({
    totalW: 1.6,
    D: 0.55,
    H: 2.4,
    woodThick: 0.018,
    doorsCount: 4,
    hasCornice: true,
    corniceType: 'straight',
  }).cornice;
  assert.ok(cornice);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const meshes = cornice.segments.map(segment => {
    assert.equal(segment.kind, 'cornice_profile_seg');
    if (segment.kind !== 'cornice_profile_seg') throw new Error('non-profile straight cornice');
    const mesh = createProfileSegment(
      {
        THREE: THREE as never,
        seg: segment,
        segMat: material,
        getPartMaterial: () => null,
        segPid: 'cornice_color',
        profile: segment.profile,
        segLen: segment.length,
      },
      { App: {}, renderOpsHandleCatch: () => {} } as never
    );
    assert.ok(mesh);
    if (segment.flipX) mesh.scale.x *= -1;
    mesh.rotation.y = segment.rotationY;
    mesh.position.set(segment.x, segment.y, segment.z);
    mesh.userData.partId = 'cornice_color';
    mesh.updateMatrixWorld(true);
    return mesh;
  });
  return { cornice, meshes };
}

test('straight cornice front and side returns have one top surface, without overlapping triangles at both 45-degree corners', () => {
  const { cornice, meshes } = makeStraightCornice();
  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    assert.ok(geometry.index, 'non-indexed Three.js extrusion must remove the internal miter cap');
    assert.ok(
      geometry.index.count < geometry.getAttribute('position').count,
      'the miter must not leave its internal end-cap triangles drawable'
    );
  }
  const front = cornice.segments.find(seg => Math.abs((seg.rotationY ?? 0) + Math.PI / 2) < 1e-9);
  assert.ok(front);
  const outerX = 1.6 / 2;
  const frontZ = 0.55 / 2;
  const topY = front.y + 0.03;
  const ray = new THREE.Raycaster();
  const hitsByPiece = new Set<number>();
  let covered = 0;
  for (const side of [-1, 1]) {
    for (let ix = -18; ix <= 3; ix += 1) {
      for (let iz = -18; iz <= 3; iz += 1) {
        const x = side * (outerX + ix * 0.005 + 0.001);
        const z = frontZ + iz * 0.005 + 0.001;
        ray.set(new THREE.Vector3(x, topY + 0.05, z), new THREE.Vector3(0, -1, 0));
        const hits = ray.intersectObjects(meshes).filter(hit => Math.abs(hit.point.y - topY) < 1e-5);
        assert.ok(hits.length <= 1, `overlapping top faces at x=${x.toFixed(3)} z=${z.toFixed(3)}`);
        if (hits.length) {
          covered += 1;
          hitsByPiece.add(meshes.indexOf(hits[0]!.object as THREE.Mesh));
        }
      }
    }
  }
  assert.ok(covered > 100, 'both mitered corners should have substantial visible wood surface');
  assert.equal(hitsByPiece.size, 3, 'front and both returns should all remain visible');
});

test('cornice paint hover produces per-part object previews for the three straight boards', () => {
  const { meshes } = makeStraightCornice();
  const wardrobeGroup = new THREE.Group();
  for (const mesh of meshes) wardrobeGroup.add(mesh);
  wardrobeGroup.updateMatrixWorld(true);
  const App = { deps: { THREE } };
  const preview = resolvePaintPreviewGroupBox({
    App: App as never,
    wardrobeGroup: wardrobeGroup as never,
    partKeys: ['cornice_color'],
    anchorObject: meshes[0] as never,
    anchorParent: wardrobeGroup as never,
  });
  assert.ok(preview);
  assert.equal(preview.kind, 'object_boxes');
  if (preview.kind !== 'object_boxes') return;
  assert.equal(preview.previewObjects.length, 3);
  assert.ok(meshes.every(mesh => preview.previewObjects.includes(mesh as never)));
});

test('corner-wing straight cornice applies full-depth miters and removes the joined end caps', () => {
  const plan = buildCornerWingProfileCornicePlan(
    {
      wingW: 1.2,
      wingD: 0.6,
      wingH: 2,
      startY: 0.1,
      woodThick: 0.018,
      baseLegTopPlatformHeightM: 0,
      cornerConnectorActive: false,
    } as never,
    { __wingBackPanelCenterZ: -0.3, __wingBackPanelThick: 0.005 } as never,
    true
  );
  assert.equal(plan.mode, 'straight');
  assert.equal(plan.operations.length, 3);
  assert.ok(plan.operations.every(op => op.kind === 'corner_profile' && op.miterMode === 'full_depth_miter'));

  const group = new THREE.Group();
  renderCornerCornicePlan(plan, {
    THREE,
    group,
    bodyMat: new THREE.MeshBasicMaterial(),
    getCornerMat: (_partId, fallback) => fallback,
    addOutlines: () => {},
    sketchMode: false,
  });
  assert.equal(group.children.length, 3);
  for (const child of group.children) {
    const geo = (child as THREE.Mesh).geometry;
    assert.ok(geo.index, 'angled corner-wing joint should not retain coplanar internal end caps');
    assert.ok(geo.index.count < geo.getAttribute('position').count);
  }
});
