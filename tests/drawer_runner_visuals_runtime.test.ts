import test from 'node:test';
import assert from 'node:assert/strict';

import { appendDrawerRunnerVisuals } from '../esm/native/builder/drawer_runner_visuals.ts';
import { readConfigScalarOrDefault } from '../esm/native/runtime/config_selectors.ts';
import {
  BLUM_TANDEM_DRAWER_RUNNER_POLICY,
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
  constructor(public params: Record<string, unknown>) {}
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
}

const FakeTHREE = {
  Mesh: FakeMesh,
  BoxGeometry: FakeBoxGeometry,
  CylinderGeometry: FakeCylinderGeometry,
  MeshStandardMaterial: FakeMaterial,
};

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

function append(args: { type?: unknown; depth?: number; boxOffsetZ?: number } = {}): {
  fixed: FakeParent;
  moving: FakeParent;
} {
  const fixed = new FakeParent();
  const moving = new FakeParent();
  appendDrawerRunnerVisuals({
    THREE: FakeTHREE,
    runnerType: args.type,
    fixedParent: fixed,
    movingParent: moving,
    drawerWidthM: 0.56,
    drawerHeightM: 0.18,
    drawerDepthM: args.depth ?? 0.45,
    drawerBoxOffsetZM: args.boxOffsetZ ?? 0.01,
    closedPosition: { x: 1.2, y: 0.7, z: -0.35 },
    ownerPartId: 'drawer:test',
  });
  return { fixed, moving };
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

  assert.equal(fixed.children.length, 6);
  assert.equal(moving.children.length, 6);
  assert.deepEqual(
    roles(fixed).sort(),
    [
      'roller-fixed-flange-left',
      'roller-fixed-flange-right',
      'roller-fixed-front-wheel-left',
      'roller-fixed-front-wheel-right',
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

  assert.deepEqual(roles(fixed).sort(), ['blum-fixed-runner-left', 'blum-fixed-runner-right'].sort());
  assert.deepEqual(
    roles(moving).sort(),
    [
      'blum-locking-device-left',
      'blum-locking-device-right',
      'blum-moving-runner-left',
      'blum-moving-runner-right',
    ].sort()
  );
  for (const rail of fixed.children) {
    assert.ok(rail.position.y < 0.7 - 0.18 / 2, 'fixed TANDEM runner should be below the closed drawer');
  }
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
