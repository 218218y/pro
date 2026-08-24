import test from 'node:test';
import assert from 'node:assert/strict';

import { appendDrawerRunnerVisuals } from '../esm/native/builder/drawer_runner_visuals.ts';
import { pruneCachesSafe } from '../esm/native/platform/cache_pruning_runtime.ts';
import { cleanGroup } from '../esm/native/platform/three_cleanup.ts';
import { readConfigScalarOrDefault } from '../esm/native/runtime/config_selectors.ts';
import {
  BLUM_TANDEM_DRAWER_RUNNER_POLICY,
  ROLLER_DRAWER_RUNNER_POLICY,
  DEFAULT_DRAWER_RUNNER_TYPE,
  INTERNAL_DRAWER_RUNNER_CLEARANCE_POLICY,
  normalizeDrawerRunnerType,
  resolveDrawerRunnerUnderDrawerDepthM,
  resolveInternalDrawerBottomLiftM,
} from '../esm/native/builder/drawer_runner_policy.ts';

type Position = { x: number; y: number; z: number; set(x: number, y: number, z: number): void };

class FakeBoxGeometry {
  readonly kind = 'box';
  constructor(
    public width = 1,
    public height = 1,
    public depth = 1
  ) {}
}

class FakeCylinderGeometry {
  readonly kind = 'cylinder';
  constructor(
    public radiusTop = 1,
    public radiusBottom = 1,
    public height = 1,
    public radialSegments = 8
  ) {}
}

class FakeMaterial {
  userData: Record<string, unknown> = {};
  disposeCount = 0;
  constructor(public params: Record<string, unknown>) {}

  dispose(): void {
    this.disposeCount += 1;
  }
}

class FakeMesh {
  userData: Record<string, unknown> = {};
  rotation = { z: 0 };
  position: Position = {
    x: 0,
    y: 0,
    z: 0,
    set: (x, y, z) => {
      this.position.x = x;
      this.position.y = y;
      this.position.z = z;
    },
  };
  children: FakeMesh[] = [];

  constructor(
    public geometry: FakeBoxGeometry | FakeCylinderGeometry,
    public material: FakeMaterial
  ) {}

  add(obj: FakeMesh): void {
    this.children.push(obj);
  }
}

class FakeParent {
  children: FakeMesh[] = [];
  add(obj: FakeMesh): void {
    this.children.push(obj);
  }

  remove(obj: FakeMesh): void {
    const index = this.children.indexOf(obj);
    if (index >= 0) this.children.splice(index, 1);
  }
}

const FakeTHREE = {
  Mesh: FakeMesh,
  BoxGeometry: FakeBoxGeometry,
  CylinderGeometry: FakeCylinderGeometry,
  MeshStandardMaterial: FakeMaterial,
};

function createFakeApp(): Record<string, unknown> {
  return {
    services: { builder: { scheduler: { activeExecutionId: null } } },
    render: { cache: {}, meta: {} },
    platform: { util: {} },
  };
}

const fakeApp = createFakeApp();

function roles(parent: FakeParent): string[] {
  return parent.children.map(child => String(child.userData.__wpDrawerRunnerRole));
}

function assertHardwareMetadata(parent: FakeParent, ownerPartId: string): void {
  for (const child of parent.children) {
    assert.equal(child.userData.__wpDrawerRunnerHardware, true);
    assert.equal(child.userData.__ignoreRaycast, true);
    assert.equal(
      child.userData.__keepMaterial,
      true,
      'drawer runner finish must stay independent from inherited drawer-box paint'
    );
    assert.equal(child.userData.__wpDrawerRunnerOwnerPartId, ownerPartId);
  }
}

function append(
  args: {
    App?: Record<string, unknown>;
    type?: unknown;
    depth?: number;
    boxOffsetZ?: number;
    mountingWidth?: number;
  } = {}
): {
  fixed: FakeParent;
  moving: FakeParent;
} {
  const fixed = new FakeParent();
  const moving = new FakeParent();
  appendDrawerRunnerVisuals({
    App: (args.App || fakeApp) as never,
    THREE: FakeTHREE,
    runnerType: args.type,
    fixedParent: fixed,
    movingParent: moving,
    drawerWidthM: 0.56,
    mountingWidthM: args.mountingWidth ?? 0.604,
    drawerHeightM: 0.18,
    drawerDepthM: args.depth ?? 0.45,
    drawerBoxOffsetZM: args.boxOffsetZ ?? 0.01,
    closedPosition: { x: 1.2, y: 0.7, z: -0.35 },
    ownerPartId: 'drawer:test',
  });
  return { fixed, moving };
}

function readMaterialCache(App: Record<string, unknown>): Map<string, FakeMaterial> {
  return (App.render as { cache: { materialCache: Map<string, FakeMaterial> } }).cache.materialCache;
}

function findRunnerMaterial(parent: FakeParent, role: string): FakeMaterial {
  const material = parent.children
    .map(child => child.material)
    .find(item => item.userData.__wpDrawerRunnerMaterialRole === role);
  assert.ok(material, `expected Drawer Runner material role ${role}`);
  return material;
}

test('[drawer-runner-visuals-runtime] roller is the canonical default', () => {
  assert.equal(DEFAULT_DRAWER_RUNNER_TYPE, 'roller');
  assert.equal(normalizeDrawerRunnerType(undefined), 'roller');
  assert.equal(normalizeDrawerRunnerType('invalid'), 'roller');
  assert.equal(normalizeDrawerRunnerType('blum'), 'blum');
});

test('[drawer-runner-visuals-runtime] internal Blum clearance is derived from concealed hardware geometry', () => {
  const expectedUnderhang =
    BLUM_TANDEM_DRAWER_RUNNER_POLICY.visualRailHeightM / 2 +
    BLUM_TANDEM_DRAWER_RUNNER_POLICY.visualLockHeightM;
  assert.equal(resolveDrawerRunnerUnderDrawerDepthM('roller'), 0);
  assert.equal(resolveDrawerRunnerUnderDrawerDepthM('blum'), expectedUnderhang);
  assert.equal(resolveInternalDrawerBottomLiftM('roller', 0.002), 0.002);
  assert.equal(
    resolveInternalDrawerBottomLiftM('blum', 0.002),
    expectedUnderhang + INTERNAL_DRAWER_RUNNER_CLEARANCE_POLICY.minimumHardwareGapM
  );
});

test('[drawer-runner-visuals-runtime] canonical config scalar reader rejects invalid runner values', () => {
  assert.equal(readConfigScalarOrDefault({}, 'drawerRunnerType'), 'roller');
  assert.equal(readConfigScalarOrDefault({ drawerRunnerType: 'blum' }, 'drawerRunnerType'), 'blum');
  assert.equal(readConfigScalarOrDefault({ drawerRunnerType: 'ball-bearing' }, 'drawerRunnerType'), 'roller');
});

test('[drawer-runner-visuals-runtime] roller runner separates cabinet and moving drawer hardware', () => {
  const { fixed, moving } = append({ type: 'roller' });

  assert.equal(fixed.children.length, 8);
  assert.equal(moving.children.length, 6);
  assert.deepEqual(
    roles(fixed).sort(),
    [
      'roller-fixed-flange-left',
      'roller-fixed-flange-right',
      'roller-fixed-front-wheel-left',
      'roller-fixed-front-wheel-right',
      'roller-fixed-lower-flange-left',
      'roller-fixed-lower-flange-right',
      'roller-fixed-web-left',
      'roller-fixed-web-right',
    ].sort()
  );
  assert.deepEqual(
    roles(moving).sort(),
    [
      'roller-moving-flange-left',
      'roller-moving-flange-right',
      'roller-moving-rear-wheel-left',
      'roller-moving-rear-wheel-right',
      'roller-moving-web-left',
      'roller-moving-web-right',
    ].sort()
  );
  assert.equal(
    fixed.children.filter(child => child.geometry instanceof FakeCylinderGeometry).length,
    2,
    'cabinet member should have one front plastic wheel per side'
  );
  assert.equal(
    moving.children.filter(child => child.geometry instanceof FakeCylinderGeometry).length,
    2,
    'drawer member should have one rear plastic wheel per side'
  );
  const rightFixedWeb = fixed.children.find(
    child => child.userData.__wpDrawerRunnerRole === 'roller-fixed-web-right'
  );
  const rightMovingWeb = moving.children.find(
    child => child.userData.__wpDrawerRunnerRole === 'roller-moving-web-right'
  );
  const rightFixedUpperFlange = fixed.children.find(
    child => child.userData.__wpDrawerRunnerRole === 'roller-fixed-flange-right'
  );
  const rightFixedLowerFlange = fixed.children.find(
    child => child.userData.__wpDrawerRunnerRole === 'roller-fixed-lower-flange-right'
  );
  const rightMovingLowerFlange = moving.children.find(
    child => child.userData.__wpDrawerRunnerRole === 'roller-moving-flange-right'
  );
  assert.ok(rightFixedWeb?.geometry instanceof FakeBoxGeometry);
  assert.ok(rightMovingWeb?.geometry instanceof FakeBoxGeometry);
  assert.ok(rightFixedUpperFlange?.geometry instanceof FakeBoxGeometry);
  assert.ok(rightFixedLowerFlange?.geometry instanceof FakeBoxGeometry);
  assert.ok(rightMovingLowerFlange?.geometry instanceof FakeBoxGeometry);
  assert.ok(
    Math.abs(rightFixedWeb.position.x + rightFixedWeb.geometry.width / 2 - (1.2 + 0.604 / 2)) < 1e-12,
    'roller cabinet member outer face must touch the actual cabinet side'
  );
  assert.ok(
    Math.abs(rightMovingWeb.position.x - rightMovingWeb.geometry.width / 2 - 0.56 / 2) < 1e-12,
    'roller moving member inner face must touch the drawer side'
  );
  assert.equal(
    rightFixedUpperFlange.geometry.width,
    ROLLER_DRAWER_RUNNER_POLICY.visualFixedFlangeWidthM,
    'fixed upper lip should use the independently tunable cabinet-side width'
  );
  assert.equal(
    rightFixedLowerFlange.geometry.width,
    ROLLER_DRAWER_RUNNER_POLICY.visualFixedFlangeWidthM,
    'fixed lower lip should match the fixed upper lip width'
  );
  assert.equal(
    rightMovingLowerFlange.geometry.width,
    ROLLER_DRAWER_RUNNER_POLICY.visualMovingFlangeWidthM,
    'moving lower lip should use its independent drawer-side width'
  );
  assert.ok(
    Math.abs(
      rightFixedUpperFlange.position.x + rightFixedUpperFlange.geometry.width / 2 - (1.2 + 0.604 / 2)
    ) < 1e-12,
    'fixed roller lips must stay anchored at the cabinet wall while extending inward'
  );
  assert.ok(
    Math.abs(rightMovingLowerFlange.position.x - rightMovingLowerFlange.geometry.width / 2 - 0.56 / 2) <
      1e-12,
    'moving roller lower lip must stay anchored at the drawer side while extending toward the wall'
  );
  assert.ok(
    rightFixedUpperFlange.position.y > rightFixedLowerFlange.position.y,
    'cabinet-fixed roller member should expose both upper and lower inward lips'
  );
  const rollerRails = [...fixed.children, ...moving.children].filter(
    child => child.geometry instanceof FakeBoxGeometry
  );
  assert.ok(rollerRails.length > 0);
  for (const rail of rollerRails) {
    assert.equal(
      rail.material.params.color,
      0xf2f2ee,
      'roller steel should use the restored off-white coating'
    );
    assert.equal(
      rail.material.params.roughness,
      0.55,
      'roller steel should preserve the previous visible finish'
    );
    assert.equal(
      rail.material.params.metalness,
      0.25,
      'roller steel should preserve the previous visible contrast'
    );
  }
  assertHardwareMetadata(fixed, 'drawer:test');
  assertHardwareMetadata(moving, 'drawer:test');
});

test('[drawer-runner-visuals-runtime] Blum TANDEM runner stays concealed below the drawer and locks at the moving front', () => {
  const { fixed, moving } = append({ type: 'blum' });

  assert.deepEqual(
    roles(fixed).sort(),
    [
      'blum-fixed-runner-left',
      'blum-fixed-runner-right',
      'blum-fixed-wall-web-left',
      'blum-fixed-wall-web-right',
    ].sort()
  );
  assert.deepEqual(
    roles(moving).sort(),
    [
      'blum-locking-device-left',
      'blum-locking-device-right',
      'blum-moving-runner-left',
      'blum-moving-runner-right',
    ].sort()
  );
  const fixedRunnerBodies = fixed.children.filter(child =>
    String(child.userData.__wpDrawerRunnerRole).startsWith('blum-fixed-runner')
  );
  for (const rail of fixedRunnerBodies) {
    assert.ok(
      rail.position.y < 0.7 - 0.18 / 2,
      'fixed TANDEM horizontal runner should stay below the closed drawer'
    );
  }
  const rightFixedRunner = fixed.children.find(
    child => child.userData.__wpDrawerRunnerRole === 'blum-fixed-runner-right'
  );
  const rightFixedWallWeb = fixed.children.find(
    child => child.userData.__wpDrawerRunnerRole === 'blum-fixed-wall-web-right'
  );
  const rightMovingRunner = moving.children.find(
    child => child.userData.__wpDrawerRunnerRole === 'blum-moving-runner-right'
  );
  assert.ok(rightFixedRunner?.geometry instanceof FakeBoxGeometry);
  assert.ok(rightFixedWallWeb?.geometry instanceof FakeBoxGeometry);
  assert.ok(rightMovingRunner?.geometry instanceof FakeBoxGeometry);
  const cabinetPlaneLocalX = 0.604 / 2;
  const drawerSideLocalX = 0.56 / 2;
  const targetFixedInnerLocalX = Math.max(
    0,
    drawerSideLocalX - BLUM_TANDEM_DRAWER_RUNNER_POLICY.visualFixedUnderDrawerReachM
  );
  const expectedFixedWidth = Math.min(
    cabinetPlaneLocalX,
    Math.max(
      BLUM_TANDEM_DRAWER_RUNNER_POLICY.cabinetRunnerEnvelopeWidthM,
      cabinetPlaneLocalX - targetFixedInnerLocalX
    )
  );
  assert.ok(
    Math.abs(rightFixedRunner.geometry.width - expectedFixedWidth) < 1e-12,
    'fixed TANDEM body should bridge the real side gap and continue beneath the drawer'
  );
  assert.ok(
    Math.abs(rightFixedRunner.position.x + rightFixedRunner.geometry.width / 2 - (1.2 + 0.604 / 2)) < 1e-12,
    'fixed TANDEM body outer face must touch the actual cabinet side'
  );
  assert.ok(
    Math.abs(rightFixedWallWeb.position.x + rightFixedWallWeb.geometry.width / 2 - (1.2 + 0.604 / 2)) < 1e-12,
    'fixed TANDEM wall web outer face must stay flush with the cabinet mounting plane'
  );
  assert.ok(
    Math.abs(
      rightFixedWallWeb.geometry.height -
        rightFixedRunner.geometry.width *
          BLUM_TANDEM_DRAWER_RUNNER_POLICY.visualFixedWallRiseHeightToRailWidthRatio
    ) < 1e-12,
    'fixed TANDEM wall web rise should track the horizontal rail width'
  );
  assert.equal(
    rightFixedWallWeb.geometry.width,
    BLUM_TANDEM_DRAWER_RUNNER_POLICY.visualFixedWallWebThicknessM,
    'fixed TANDEM wall web should use the independently tunable wall thickness'
  );
  const fixedRunnerBottomY = rightFixedRunner.position.y - rightFixedRunner.geometry.height / 2;
  const fixedWallBottomY = rightFixedWallWeb.position.y - rightFixedWallWeb.geometry.height / 2;
  assert.ok(
    Math.abs(fixedRunnerBottomY - fixedWallBottomY) < 1e-12,
    'fixed TANDEM wall web and horizontal rail should share one bottom edge to form an L-profile'
  );
  const fixedInnerLocalX = rightFixedRunner.position.x - 1.2 - rightFixedRunner.geometry.width / 2;
  const fixedOuterLocalX = rightFixedRunner.position.x - 1.2 + rightFixedRunner.geometry.width / 2;
  const movingInnerLocalX = rightMovingRunner.position.x - rightMovingRunner.geometry.width / 2;
  const movingOuterLocalX = rightMovingRunner.position.x + rightMovingRunner.geometry.width / 2;
  const nestedOverlap =
    Math.min(fixedOuterLocalX, movingOuterLocalX) - Math.max(fixedInnerLocalX, movingInnerLocalX);
  assert.ok(
    movingInnerLocalX < 0.56 / 2,
    'moving TANDEM member must retain a real support reach beneath the drawer'
  );
  assert.ok(
    fixedInnerLocalX <= movingInnerLocalX + 1e-12,
    'fixed TANDEM body must reach at least as far under the drawer as the moving member'
  );
  assert.ok(
    fixedOuterLocalX + 1e-12 >= movingOuterLocalX,
    'fixed TANDEM body must laterally cover the moving member in the closed position'
  );
  assert.ok(
    nestedOverlap + 1e-12 >= BLUM_TANDEM_DRAWER_RUNNER_POLICY.visualMovingNestedOverlapM,
    'closed TANDEM members must keep the configured telescoping overlap'
  );
  assert.ok(
    Math.abs(
      rightMovingRunner.geometry.width - BLUM_TANDEM_DRAWER_RUNNER_POLICY.visualMovingUnderDrawerReachM
    ) < 1e-12,
    'once the fixed body bridges the real side gap, the moving member should keep only its intended under-drawer reach'
  );
  const rightLock = moving.children.find(
    child => child.userData.__wpDrawerRunnerRole === 'blum-locking-device-right'
  );
  assert.ok(rightLock);
  assert.ok(
    Math.abs(rightLock.position.x - rightMovingRunner.position.x) < 1e-12,
    'front locking device must stay centered on the coupled runner span'
  );
  assert.equal(
    moving.children.filter(child =>
      String(child.userData.__wpDrawerRunnerRole).startsWith('blum-locking-device')
    ).length,
    2,
    'expected a left/right front locking-device pair'
  );

  for (const rail of fixed.children) {
    assert.equal(rail.material.params.color, 0xe5e9ef, 'fixed Blum runners should use light nickel');
  }
  for (const rail of moving.children.filter(child =>
    String(child.userData.__wpDrawerRunnerRole).startsWith('blum-moving-runner')
  )) {
    assert.equal(rail.material.params.color, 0xd8dde4, 'moving Blum runners should stay light nickel');
  }
  for (const lock of moving.children.filter(child =>
    String(child.userData.__wpDrawerRunnerRole).startsWith('blum-locking-device')
  )) {
    assert.equal(lock.material.params.color, 0xb8c0c8, 'Blum locking devices should use darker nickel');
  }

  assertHardwareMetadata(fixed, 'drawer:test');
  assertHardwareMetadata(moving, 'drawer:test');
});

test('[drawer-runner-visuals-runtime] Blum moving member does not over-widen when the drawer already sits inside the real planning envelope', () => {
  const { fixed, moving } = append({ type: 'blum', mountingWidth: 0.574 });
  const rightFixedRunner = fixed.children.find(
    child => child.userData.__wpDrawerRunnerRole === 'blum-fixed-runner-right'
  );
  const rightMovingRunner = moving.children.find(
    child => child.userData.__wpDrawerRunnerRole === 'blum-moving-runner-right'
  );
  assert.ok(rightFixedRunner?.geometry instanceof FakeBoxGeometry);
  assert.ok(rightMovingRunner?.geometry instanceof FakeBoxGeometry);

  const fixedInnerLocalX = rightFixedRunner.position.x - 1.2 - rightFixedRunner.geometry.width / 2;
  const movingInnerLocalX = rightMovingRunner.position.x - rightMovingRunner.geometry.width / 2;
  const movingOuterLocalX = rightMovingRunner.position.x + rightMovingRunner.geometry.width / 2;
  const nestedOverlap = movingOuterLocalX - Math.max(fixedInnerLocalX, movingInnerLocalX);

  assert.ok(Math.abs(movingOuterLocalX - 0.56 / 2) < 1e-12);
  assert.ok(
    Math.abs(
      rightMovingRunner.geometry.width - BLUM_TANDEM_DRAWER_RUNNER_POLICY.visualMovingUnderDrawerReachM
    ) < 1e-12,
    'a naturally overlapping TANDEM layout should keep the nominal under-drawer moving profile'
  );
  assert.ok(
    nestedOverlap + 1e-12 >= BLUM_TANDEM_DRAWER_RUNNER_POLICY.visualMovingNestedOverlapM,
    'the nominal profile must still remain nested in the fixed runner'
  );
});

test('[drawer-runner-visuals-runtime] drawer-box offset only moves fixed hardware, never moving hardware inside the box', () => {
  for (const type of ['roller', 'blum'] as const) {
    const base = append({ type, boxOffsetZ: -0.28 });
    const shifted = append({ type, boxOffsetZ: -0.08 });

    const movingBase = new Map(
      base.moving.children.map(child => [String(child.userData.__wpDrawerRunnerRole), child.position.z])
    );
    const movingShifted = new Map(
      shifted.moving.children.map(child => [String(child.userData.__wpDrawerRunnerRole), child.position.z])
    );
    assert.deepEqual(
      movingShifted,
      movingBase,
      `${type} moving hardware must stay in drawer-box-local coordinates when the box offset changes`
    );

    const fixedBase = new Map(
      base.fixed.children.map(child => [String(child.userData.__wpDrawerRunnerRole), child.position.z])
    );
    const fixedShifted = new Map(
      shifted.fixed.children.map(child => [String(child.userData.__wpDrawerRunnerRole), child.position.z])
    );
    for (const [role, baseZ] of fixedBase) {
      const shiftedZ = fixedShifted.get(role);
      assert.equal(typeof shiftedZ, 'number');
      assert.ok(
        Math.abs((shiftedZ as number) - baseZ - 0.2) < 1e-12,
        `${type} ${role} should follow the drawer-box center offset exactly once`
      );
    }
  }
});

test('[drawer-runner-visuals-runtime] moving rails stay inside the drawer depth when the drawer box is offset far behind its front', () => {
  const depth = 0.5;
  for (const type of ['roller', 'blum'] as const) {
    const { moving } = append({ type, depth, boxOffsetZ: -0.295 });
    const railBoxes = moving.children.filter(
      child =>
        child.geometry instanceof FakeBoxGeometry &&
        !String(child.userData.__wpDrawerRunnerRole).includes('locking-device')
    );
    assert.ok(railBoxes.length > 0);
    for (const rail of railBoxes) {
      const geometry = rail.geometry as FakeBoxGeometry;
      const front = rail.position.z + geometry.depth / 2;
      const back = rail.position.z - geometry.depth / 2;
      assert.ok(front <= depth / 2 + Number.EPSILON, `${type} moving rail must not pass the box front`);
      assert.ok(back >= -depth / 2 - Number.EPSILON, `${type} moving rail must not pass the box back`);
    }
  }
});

test('[drawer-runner-visuals-runtime] simplified runner geometry never exceeds a shallow drawer depth', () => {
  for (const type of ['roller', 'blum'] as const) {
    const depth = 0.12;
    const { fixed, moving } = append({ type, depth });
    const all = [...fixed.children, ...moving.children];
    const railBoxes = all.filter(
      child =>
        child.geometry instanceof FakeBoxGeometry &&
        !String(child.userData.__wpDrawerRunnerRole).includes('locking-device')
    );
    assert.ok(railBoxes.length > 0);
    for (const rail of railBoxes) {
      assert.ok(
        (rail.geometry as FakeBoxGeometry).depth <= depth + Number.EPSILON,
        `${type} rail depth must not exceed drawer depth`
      );
    }
  }
});

test('[drawer-runner-visuals-runtime] canonical material lifetime is App-owned and isolated across Apps', () => {
  const AppA = createFakeApp();
  const AppB = createFakeApp();
  const first = append({ App: AppA, type: 'roller' });
  const second = append({ App: AppA, type: 'roller' });
  const otherApp = append({ App: AppB, type: 'roller' });

  const firstSteel = findRunnerMaterial(first.fixed, 'rollerSteel');
  assert.equal(findRunnerMaterial(second.fixed, 'rollerSteel'), firstSteel);
  assert.notEqual(findRunnerMaterial(otherApp.fixed, 'rollerSteel'), firstSteel);
  assert.equal(firstSteel.userData.isCached, true);
  assert.equal(firstSteel.userData.__keepMaterial, undefined);
});

test('[drawer-runner-visuals-runtime] all five canonical material roles preserve their exact finishes', () => {
  const App = createFakeApp();
  append({ App, type: 'roller' });
  append({ App, type: 'blum' });
  const byRole = new Map<string, FakeMaterial>();
  for (const material of readMaterialCache(App).values()) {
    byRole.set(String(material.userData.__wpDrawerRunnerMaterialRole), material);
  }
  assert.deepEqual(Object.fromEntries(Array.from(byRole, ([role, material]) => [role, material.params])), {
    rollerSteel: { color: 0xf2f2ee, roughness: 0.55, metalness: 0.25 },
    rollerWheel: { color: 0xd7d7d2, roughness: 0.82, metalness: 0.0 },
    blumSteel: { color: 0xe5e9ef, roughness: 0.2, metalness: 0.28 },
    blumInner: { color: 0xd8dde4, roughness: 0.24, metalness: 0.32 },
    blumLock: { color: 0xb8c0c8, roughness: 0.3, metalness: 0.32 },
  });
});

test('[drawer-runner-visuals-runtime] cleanGroup never disposes cached Runner materials or poisons rebuild reuse', () => {
  const App = createFakeApp();
  const first = append({ App, type: 'roller' });
  const steel = findRunnerMaterial(first.fixed, 'rollerSteel');
  const wheel = findRunnerMaterial(first.fixed, 'rollerWheel');

  cleanGroup(first.fixed);
  cleanGroup(first.moving);
  assert.equal(steel.disposeCount, 0);
  assert.equal(wheel.disposeCount, 0);

  const rebuilt = append({ App, type: 'roller' });
  assert.equal(findRunnerMaterial(rebuilt.fixed, 'rollerSteel'), steel);
  assert.equal(findRunnerMaterial(rebuilt.fixed, 'rollerWheel'), wheel);
  assert.equal(steel.disposeCount, 0);
  assert.equal(wheel.disposeCount, 0);
});

test('[drawer-runner-visuals-runtime] canonical pruning evicts unused Runner materials exactly once', () => {
  const App = createFakeApp();
  const emitted = append({ App, type: 'roller' });
  const steel = findRunnerMaterial(emitted.fixed, 'rollerSteel');
  const cache = readMaterialCache(App);
  (App.platform as { util: Record<string, unknown> }).util.cacheLimits = {
    textures: 0,
    materials: 0,
    dimLabels: 0,
    edges: 0,
    geometries: 0,
  };
  pruneCachesSafe(App as never, { traverse(): void {} });

  assert.equal(cache.has(String(steel.userData.__wpDrawerRunnerMaterialCacheKey)), false);
  assert.equal(steel.disposeCount, 1);
  pruneCachesSafe(App as never, { traverse(): void {} });
  assert.equal(steel.disposeCount, 1);
});

test('[drawer-runner-visuals-runtime] canonical pruning retains a Runner material that is live in scene', () => {
  const App = createFakeApp();
  const emitted = append({ App, type: 'roller' });
  const liveMesh = emitted.fixed.children[0];
  assert.ok(liveMesh);
  const liveMaterial = liveMesh.material;
  const liveKey = String(liveMaterial.userData.__wpDrawerRunnerMaterialCacheKey);
  const cache = readMaterialCache(App);
  (App.platform as { util: Record<string, unknown> }).util.cacheLimits = {
    textures: 0,
    materials: 0,
    dimLabels: 0,
    edges: 0,
    geometries: 0,
  };
  pruneCachesSafe(App as never, {
    traverse(visitor: (node: FakeMesh) => void): void {
      visitor(liveMesh);
    },
  });

  assert.equal(cache.get(liveKey), liveMaterial);
  assert.equal(liveMaterial.disposeCount, 0);
});
