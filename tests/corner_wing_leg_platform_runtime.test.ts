import test from 'node:test';
import assert from 'node:assert/strict';

import { applyCornerWingCarcassFloorAndBase } from '../esm/native/builder/corner_wing_carcass_shell_floor_base.ts';
import { CARCASS_BASE_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

class FakeVector3 {
  x = 0;
  y = 0;
  z = 0;
  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class FakeBoxGeometry {
  parameters: { width: number; height: number; depth: number };
  constructor(width: number, height: number, depth: number) {
    this.parameters = { width, height, depth };
  }
}

class FakeMesh {
  position = new FakeVector3();
  userData: Record<string, unknown> = {};
  geometry: FakeBoxGeometry;
  material: unknown;
  constructor(geometry: FakeBoxGeometry, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }
}

test('corner wing legs stage emits lower and upper paintable platform boards', () => {
  const platformH = CARCASS_BASE_DIMENSIONS.legs.platform.heightM;
  const added: FakeMesh[] = [];
  const outlined: FakeMesh[] = [];
  const params = {
    ctx: {
      THREE: { Mesh: FakeMesh, BoxGeometry: FakeBoxGeometry },
      woodThick: 0.018,
      startY: 0.12 + platformH,
      wingD: 0.58,
      wingW: 1.2,
      activeWidth: 1.182,
      blindWidth: 0,
      stackOffsetY: 0,
      baseType: 'legs',
      baseLegHeightM: 0.12,
      baseLegPlatformMode: 'stage',
      baseLegPlatformSideMode: 'flush',
      baseLegPlatformSideOverhangM: 0.06,
      baseLegPlatformFrontOverhangM: 0.04,
      baseLegBottomPlatformHeightM: platformH,
      baseLegTopPlatformHeightM: platformH,
      baseH: 0.12 + platformH,
      cabinetBodyHeight: 2.1,
      __stackKey: 'top',
      __stackSplitUnifiedFrame: false,
      __individualColors: {},
      __cfg: { isMultiColorMode: true },
      getCornerMat: (partId: string) => `mat:${partId}`,
      bodyMat: 'body',
      addOutlines: (mesh: FakeMesh) => outlined.push(mesh),
      wingGroup: { add: (mesh: FakeMesh) => added.push(mesh) },
    },
    locals: {
      App: {},
      activeFaceCenter: 0.591,
      cornerCells: [
        { idx: 0, key: 'corner:0', width: 0.6, centerX: 0.3, depth: 0.58, cfg: {} },
        { idx: 1, key: 'corner:1', width: 0.582, centerX: 0.891, depth: 0.58, cfg: {} },
      ],
    },
    helpers: {
      readNumFrom: (obj: Record<string, unknown>, key: string, fallback: number) =>
        typeof obj[key] === 'number' ? Number(obj[key]) : fallback,
      readStrFrom: (obj: Record<string, unknown>, key: string, fallback: string) =>
        typeof obj[key] === 'string' ? String(obj[key]) : fallback,
    },
  } as any;
  const metrics = {
    __wingIsUnifiedCabinet: false,
    __horizZOffset: 0,
    __carcassBackInsetZ: 0,
    __carcassFrontInsetZ: 0,
    __wallZHalfInset: 0,
  } as any;

  applyCornerWingCarcassFloorAndBase(params, metrics);

  const bottomPlatforms = added.filter(mesh => mesh.userData.partId === 'corner_leg_platform_bottom');
  const topPlatforms = added.filter(mesh => mesh.userData.partId === 'corner_leg_platform_top');
  assert.equal(bottomPlatforms.length, 2);
  assert.equal(topPlatforms.length, 2);
  assert.equal(bottomPlatforms[0].geometry.parameters.height, platformH);
  assert.equal(bottomPlatforms[0].position.y, 0.12 + platformH / 2);
  assert.equal(topPlatforms[0].position.y, 0.12 + platformH + 2.1 + platformH / 2);
  assert.ok(bottomPlatforms[0].geometry.parameters.depth > 0.58, 'front overhang should deepen the platform');
  assert.equal(
    outlined.filter(mesh => String(mesh.userData.partId).startsWith('corner_leg_platform')).length,
    4
  );
});
