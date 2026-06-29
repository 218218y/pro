import test from 'node:test';
import assert from 'node:assert/strict';

import { applyCornerWingCarcassCeiling } from '../esm/native/builder/corner_wing_carcass_shell_ceiling.ts';
import { CORNER_WING_DIMENSIONS } from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

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

type AddedMesh = FakeMesh & { userData: { partId?: string } };

function createCeilingHarness(options: {
  cornerCells: Array<Record<string, unknown>>;
  wingW?: number;
  woodThick?: number;
  unified?: boolean;
  stackKey?: 'top' | 'bottom';
  stackSplitUnifiedFrame?: boolean;
}) {
  const woodThick = options.woodThick ?? 0.018;
  const wingW = options.wingW ?? 1.2;
  const wingD = 0.58;
  const activeWidth = wingW - woodThick;
  const added: AddedMesh[] = [];

  const params = {
    ctx: {
      THREE: { Mesh: FakeMesh, BoxGeometry: FakeBoxGeometry },
      woodThick,
      startY: 0.1,
      wingD,
      wingW,
      activeWidth,
      blindWidth: 0,
      cornerConnectorActive: true,
      cabinetBodyHeight: 2.1,
      __stackKey: options.stackKey ?? 'top',
      __stackSplitUnifiedFrame: options.stackSplitUnifiedFrame ?? false,
      getCornerMat: () => ({ material: 'body' }),
      bodyMat: { material: 'default' },
      addOutlines: () => undefined,
      wingGroup: {
        add(mesh: AddedMesh) {
          added.push(mesh);
        },
      },
    },
    locals: {
      App: {},
      activeFaceCenter: activeWidth / 2,
      cornerCells: options.cornerCells,
    },
    helpers: {},
  } as any;

  const metrics = {
    __wingIsUnifiedCabinet: options.unified ?? false,
    __wingBackPanelThick: 0.005,
    __wingBackPanelCenterZ: -wingD + 0.005,
    __carcassBackInsetZ: 0.0078,
    __carcassFrontInsetZ: 0.005,
    __wallZHalfInset: 0.0039,
    __horizZOffset: (0.0078 - 0.005) / 2,
  } as any;

  return { params, metrics, added, wingW, woodThick };
}

function createCell(idx: number, startX: number, width: number): Record<string, unknown> {
  return {
    idx,
    key: `corner:${idx}`,
    startX,
    width,
    centerX: startX + width / 2,
    bodyHeight: 2.1,
    depth: 0.58,
    cfg: {},
  };
}

function rightEdge(mesh: FakeMesh): number {
  return mesh.position.x + mesh.geometry.parameters.width / 2;
}

function findPart(added: AddedMesh[], partId: string): AddedMesh {
  const mesh = added.find(item => item.userData.partId === partId);
  assert.ok(mesh, `expected ${partId} to be emitted`);
  return mesh;
}

function assertRoofReachesRightSideInnerFace(mesh: FakeMesh, wingW: number, woodThick: number): void {
  const expectedInnerFaceX = wingW - woodThick;
  const remainingGap = expectedInnerFaceX - rightEdge(mesh);
  assert.ok(remainingGap >= -1e-9, 'roof must not cross through the right side panel');
  assert.ok(
    remainingGap <= CORNER_WING_DIMENSIONS.ceiling.widthClearanceM + 1e-9,
    `roof should stop only at the tiny shell clearance, got ${remainingGap}`
  );
}

test('corner wing unified roof reaches the right side inner face without subtracting side thickness twice', () => {
  const wingW = 1.2;
  const woodThick = 0.018;
  const activeWidth = wingW - woodThick;
  const harness = createCeilingHarness({
    wingW,
    woodThick,
    unified: true,
    cornerCells: [createCell(0, 0, activeWidth / 2), createCell(1, activeWidth / 2, activeWidth / 2)],
  });

  applyCornerWingCarcassCeiling(harness.params, harness.metrics);

  assertRoofReachesRightSideInnerFace(
    findPart(harness.added, 'corner_wing_ceil'),
    harness.wingW,
    harness.woodThick
  );
});

test('corner wing last segmented roof reaches the right side inner face', () => {
  const wingW = 1.2;
  const woodThick = 0.018;
  const activeWidth = wingW - woodThick;
  const firstW = 0.5;
  const harness = createCeilingHarness({
    wingW,
    woodThick,
    unified: false,
    cornerCells: [createCell(0, 0, firstW), createCell(1, firstW, activeWidth - firstW)],
  });

  applyCornerWingCarcassCeiling(harness.params, harness.metrics);

  assertRoofReachesRightSideInnerFace(
    findPart(harness.added, 'corner_cell_top_c1'),
    harness.wingW,
    harness.woodThick
  );
});

test('corner wing unified stack-split lower stack does not emit a duplicate middle ceiling board', () => {
  const harness = createCeilingHarness({
    unified: true,
    stackKey: 'bottom',
    stackSplitUnifiedFrame: true,
    cornerCells: [createCell(0, 0, 0.55), createCell(1, 0.55, 0.55)],
  });

  applyCornerWingCarcassCeiling(harness.params, harness.metrics);

  assert.deepEqual(
    harness.added.map(item => item.userData.partId),
    [],
    'unified frame should keep a single seam board from the upper floor, not a coplanar lower ceiling'
  );
});
