import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createShelfFrontEdgeMaterials } from '../esm/native/builder/shelf_front_edge_material.ts';
import {
  createWinterBraceShelfGeometry,
  resolveWinterBraceShelfFrame,
} from '../esm/native/builder/winter_brace_shelf_geometry.ts';
import { INTERIOR_SHELF_GEOMETRY_POLICY } from '../esm/shared/dimensions/interior_fittings_policy.ts';
import { computeInteriorCustomOps } from '../esm/native/builder/core_storage_compute_custom.ts';
import { normalizeSketchShelfVariant } from '../esm/native/builder/render_interior_sketch_layout.ts';
import {
  normalizeManualLayoutShelfVariant,
  toggleManualLayoutShelf,
} from '../esm/native/services/canvas_picking_manual_layout_config_ops.ts';
import { readExistingShelfVariant } from '../esm/native/services/canvas_picking_interior_hover_layout_family_shared.ts';
import { createSketchModuleShelfPreviewGeometry } from '../esm/native/services/canvas_picking_sketch_module_vertical_content.ts';
import {
  resolveShelfDepth,
  normalizeShelfVariant,
} from '../esm/native/services/canvas_picking_manual_layout_free_box_contracts.ts';
import { applySketchShelves } from '../esm/native/builder/render_interior_sketch_support.ts';
import {
  addCornerWingGridShelf,
  createCornerWingInteriorShelfRuntime,
} from '../esm/native/builder/corner_wing_cell_interiors_shelves.ts';

for (const frameWidthCm of [6, 8, 10, INTERIOR_SHELF_GEOMETRY_POLICY.winterBraceFrameWidthCm]) {
  test(`winter brace has four rims, a raycastable top and a real opening with frame ${frameWidthCm}cm`, () => {
    const w = 1.1,
      d = 0.56,
      h = 0.018;
    const bars = resolveWinterBraceShelfFrame(w, d, frameWidthCm);
    assert.equal(bars.length, 4);
    const rim = frameWidthCm / 100;
    assert.equal(bars[0]!.d, rim);
    assert.equal(bars[2]!.w, rim);
    const mesh = new THREE.Mesh(
      createWinterBraceShelfGeometry(THREE, w, h, d, frameWidthCm) as THREE.BufferGeometry,
      new THREE.MeshBasicMaterial()
    );
    mesh.updateMatrixWorld(true);
    const cast = (x: number, z: number) =>
      new THREE.Raycaster(new THREE.Vector3(x, 1, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh);
    assert.equal(cast(0, 0).length, 0, 'the opening must have no pickable/visible surface');
    for (const bar of bars) {
      const hit = cast(bar.x, bar.z)[0];
      assert.ok(hit);
      assert.ok(Math.abs(hit.point.y - h / 2) < 1e-7, 'top ray must hit the top face, not the underside');
      assert.equal(hit.face?.normal.y, 1);
    }
    const expectedVolume = (w * d - (w - 2 * rim) * (d - 2 * rim)) * h;
    assert.ok(Math.abs(bars.reduce((sum, bar) => sum + bar.w * bar.d * h, 0) - expectedVolume) < 1e-10);
    assert.equal(mesh.geometry.groups.length, 16);
    assert.ok(Array.from(mesh.geometry.getAttribute('normal').array).every(Number.isFinite));
    const positions = mesh.geometry.getAttribute('position');
    const normals = mesh.geometry.getAttribute('normal');
    for (let i = 0; i < positions.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(positions, i);
      const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
      const c = new THREE.Vector3().fromBufferAttribute(positions, i + 2);
      const winding = b.sub(a).cross(c.sub(a)).normalize();
      assert.ok(
        winding.dot(new THREE.Vector3().fromBufferAttribute(normals, i)) > 0.999,
        'triangle winding must agree with the outward normal for correct lighting'
      );
    }
  });
}

test('winter brace preserves an opening in narrow cells and rejects invalid frame dimensions', () => {
  const bars = resolveWinterBraceShelfFrame(0.1, 0.12, 8);
  assert.ok(bars.every(bar => bar.w > 0 && bar.d > 0));
  assert.ok(bars[0]!.d < 0.12 / 2);
  assert.throws(() => resolveWinterBraceShelfFrame(1, 0.5, 0));
  assert.throws(() => resolveWinterBraceShelfFrame(NaN, 0.5, 8));
});

test('winter ring has no internal faces and omits caps against cabinet side walls', () => {
  for (const exposedSide of [null, 'left', 'right', 'both'] as const) {
    const geometry = createWinterBraceShelfGeometry(
      THREE,
      1,
      0.018,
      0.6,
      8,
      exposedSide
    ) as THREE.BufferGeometry;
    const positions = geometry.getAttribute('position');
    const triangles = new Set<string>();
    const edgeCounts = new Map<string, number>();
    let leftCaps = 0,
      rightCaps = 0;
    for (let i = 0; i < positions.count; i += 3) {
      const points = [i, i + 1, i + 2].map(index => [
        positions.getX(index),
        positions.getY(index),
        positions.getZ(index),
      ]);
      if (points.every(point => point[0] === -0.5)) leftCaps++;
      if (points.every(point => point[0] === 0.5)) rightCaps++;
      const keys = points.map(point => point.map(value => value.toFixed(7)).join(','));
      const triangleKey = [...keys].sort().join('|');
      assert.equal(triangles.has(triangleKey), false, 'no coincident triangles at frame joints');
      triangles.add(triangleKey);
      for (let edge = 0; edge < 3; edge++) {
        const key = [keys[edge], keys[(edge + 1) % 3]].sort().join('|');
        edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
      }
    }
    assert.equal(leftCaps, exposedSide === 'left' || exposedSide === 'both' ? 2 : 0);
    assert.equal(rightCaps, exposedSide === 'right' || exposedSide === 'both' ? 2 : 0);
    if (exposedSide === 'both')
      assert.ok(
        [...edgeCounts.values()].every(count => count === 2),
        'a closed standalone ring has exactly two faces per edge and no interior junction surfaces'
      );
  }
});

for (const exposedSide of [null, 'left', 'right', 'both'] as const) {
  test(`winter frame colors only outer edges after color changes with exposed side ${exposedSide}`, () => {
    const geometry = createWinterBraceShelfGeometry(
      THREE,
      1,
      0.018,
      0.6,
      INTERIOR_SHELF_GEOMETRY_POLICY.winterBraceFrameWidthCm,
      exposedSide
    ) as THREE.BufferGeometry;
    const body = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const mesh = new THREE.Mesh(geometry, body);
    mesh.updateMatrixWorld(true);
    const materialAt = (origin: THREE.Vector3, direction: THREE.Vector3) => {
      const hit = new THREE.Raycaster(origin, direction).intersectObject(mesh)[0];
      assert.ok(hit?.face, 'the tested frame face must exist and face the ray');
      return Array.isArray(mesh.material) ? mesh.material[hit.face.materialIndex] : mesh.material;
    };
    for (const color of ['#804020', '#2266cc']) {
      const front = new THREE.MeshBasicMaterial({ color });
      mesh.material = createShelfFrontEdgeMaterials({
        shelfMaterial: body,
        frontEdgeMaterial: front,
        exposedSide,
      }) as THREE.Material[];
      for (const direction of [
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(-1, 0, 0),
      ]) {
        assert.equal(
          materialAt(new THREE.Vector3(), direction),
          body,
          'every wall facing the opening must retain the shelf body material'
        );
      }
      assert.equal(materialAt(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)), front);
      if (exposedSide === 'left' || exposedSide === 'both') {
        assert.equal(materialAt(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0)), front);
      }
      if (exposedSide === 'right' || exposedSide === 'both') {
        assert.equal(materialAt(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)), front);
      }
    }
    const paintedShelf = new THREE.MeshBasicMaterial({ color: '#557733' });
    mesh.material = paintedShelf;
    assert.equal(
      materialAt(new THREE.Vector3(), new THREE.Vector3(0, 0, -1)),
      paintedShelf,
      'individual shelf painting must still apply to the entire shelf'
    );
  });
}

test('winter brace survives grid editing, build derivation and both module and free-box previews', () => {
  const cfg = { isCustom: true, customData: { shelves: [], rods: [], shelfVariants: [] }, braceShelves: [] };
  const mutation = { divs: 6, topY: 2.4, bottomY: 0, arrayIdx: 2, shelfVariant: 'winter_brace' as const };
  toggleManualLayoutShelf(cfg, mutation);
  assert.equal(cfg.customData.shelfVariants[2], 'winter_brace');
  assert.equal(computeInteriorCustomOps(cfg.customData, 6).shelfVariants?.[3], 'winter_brace');
  assert.equal(normalizeSketchShelfVariant('winter_brace'), 'winter_brace');
  assert.equal(normalizeManualLayoutShelfVariant('winter_brace'), 'winter_brace');
  assert.equal(normalizeShelfVariant('winter_brace'), 'winter_brace');
  assert.equal(
    readExistingShelfVariant({ braceList: [], shelfIndex: 3, shelfVariants: cfg.customData.shelfVariants }),
    'winter_brace'
  );
  const preview = createSketchModuleShelfPreviewGeometry({
    innerW: 1,
    internalDepth: 0.6,
    backZ: -0.3,
    woodThick: 0.018,
    regularDepth: 0.45,
    variant: 'winter_brace',
    shelfDepthOverrideM: null,
  });
  assert.equal(preview.w, 1);
  assert.equal(preview.d, 0.6);
  assert.equal(preview.h, 0.018);
  assert.equal(resolveShelfDepth({ variant: 'winter_brace', innerD: 0.6, woodThick: 0.018 }), 0.6);
  toggleManualLayoutShelf(cfg, mutation);
  assert.equal(cfg.customData.shelves[2], false, 'clicking the same variant removes that shelf');
});

test('authored winter shelf uses the brace material, shape and one paint identity without floating contents', () => {
  const calls: unknown[][] = [];
  const mesh = { userData: {} as Record<string, unknown> };
  const braceMaterial = { id: 'brace' };
  applySketchShelves({
    shelves: [{ yNorm: 0.5, variant: 'winter_brace' }],
    yFromNorm: () => 1,
    findBoxAtY: () => null,
    braceCenterX: 0,
    braceShelfWidth: 1,
    regularShelfWidth: 0.98,
    internalCenterX: 0,
    internalDepth: 0.6,
    internalZ: 0,
    regularDepth: 0.45,
    backZ: -0.3,
    woodThick: 0.018,
    shelfThick: 0.018,
    effectiveTopY: 2.4,
    showContentsEnabled: true,
    addFoldedClothes() {
      assert.fail('an open shelf cannot support a pile in its opening');
    },
    contentsPolicy: {},
    currentShelfMat: {},
    currentBraceShelfMat: braceMaterial,
    moduleKeyStr: 'bottom_0',
    getPartMaterial: undefined,
    getPartColorValue: undefined,
    glassMat: null,
    createBoard(...args: unknown[]) {
      calls.push(args);
      return mesh;
    },
    group: {},
    addShelfPins(...args: unknown[]) {
      assert.equal(args[6], false);
    },
  } as never);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]![6], braceMaterial);
  assert.equal((calls[0]![8] as { shape: string }).shape, 'winter_brace_shelf');
  assert.equal(mesh.userData.__wpShelfVariant, 'winter_brace');
  assert.equal(mesh.userData.__wpShelfIsBrace, true);
});

for (const stack of ['top', 'bottom']) {
  test(`corner winter shelf keeps ${stack} stack identity and the real frame geometry`, () => {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    const runtime = {
      THREE,
      woodThick: 0.018,
      wingGroup: group,
      App: {},
      __cfg: {},
      __stackKey: stack,
      __stackScopePartKey: (id: string) => `bottom_${id}`,
      getCornerShelfMat: () => material,
      getOrCreateCacheRecord: () => ({}),
      asRecord: (value: unknown) => value,
      isRecord: (value: unknown) => !!value && typeof value === 'object',
      getMaterial: () => material,
      addOutlines() {},
      showContentsEnabled: true,
      addFoldedClothes() {
        assert.fail('no floating contents in winter frame');
      },
    };
    const shelfRuntime = createCornerWingInteriorShelfRuntime(runtime as never);
    addCornerWingGridShelf(
      {
        runtime,
        cfgCell: { customData: { shelfVariants: ['winter_brace'], shelves: [true] } },
        cellKey: 'L0',
        cellShelfW: 0.98,
        cellInnerCenterX: 0,
        cellInnerW: 1,
        __braceSet: {},
        effectiveBottomY: 0,
        effectiveTopY: 2.4,
        localGridStep: 0.4,
        __internalDepth: 0.6,
        __regularDepth: 0.45,
        __backFaceZ: -0.3,
      } as never,
      shelfRuntime,
      1
    );
    const shelf = group.children[0] as THREE.Mesh;
    assert.equal(shelf.userData.__wpShelfVariant, 'winter_brace');
    assert.equal(shelf.userData.__wpShelfIsBrace, true);
    assert.equal(shelf.material, material);
    assert.equal(shelf.userData.partId.startsWith('bottom_'), stack === 'bottom');
    shelf.updateMatrixWorld(true);
    assert.equal(
      new THREE.Raycaster(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0)).intersectObject(shelf)
        .length,
      0
    );
  });
}
