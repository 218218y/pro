import test from 'node:test';
import assert from 'node:assert/strict';

import { appendDrawerRunnerVisuals } from '../esm/native/builder/drawer_runner_visuals.ts';
import { readConfigScalarOrDefault } from '../esm/native/runtime/config_selectors.ts';
import {
  DEFAULT_DRAWER_RUNNER_TYPE,
  INTERNAL_DRAWER_RUNNER_TYPE,
  normalizeDrawerRunnerType,
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
    assert.equal(child.userData.__wpDrawerRunnerOwnerPartId, ownerPartId);
  }
}

function append(args: { type?: unknown; depth?: number } = {}): {
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
    drawerLocalCenterZM: 0.01,
    closedPosition: { x: 1.2, y: 0.7, z: -0.35 },
    ownerPartId: 'drawer:test',
  });
  return { fixed, moving };
}

test('[drawer-runner-visuals-runtime] roller is the canonical default', () => {
  assert.equal(DEFAULT_DRAWER_RUNNER_TYPE, 'roller');
  assert.equal(INTERNAL_DRAWER_RUNNER_TYPE, 'roller');
  assert.equal(normalizeDrawerRunnerType(undefined), 'roller');
  assert.equal(normalizeDrawerRunnerType('invalid'), 'roller');
  assert.equal(normalizeDrawerRunnerType('blum'), 'blum');
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
  assertHardwareMetadata(fixed, 'drawer:test');
  assertHardwareMetadata(moving, 'drawer:test');
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
