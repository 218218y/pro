import test from 'node:test';
import assert from 'node:assert/strict';

import { createCornerConnectorShellMetrics } from '../esm/native/builder/corner_connector_emit_shell_metrics.ts';
import {
  applyCornerConnectorShellBase,
  createCornerConnectorPlinthShape,
} from '../esm/native/builder/corner_connector_emit_shell_base.ts';
import { applyCornerConnectorShellPanels } from '../esm/native/builder/corner_connector_emit_shell_panels.ts';
import { buildCornerConnectorShell } from '../esm/native/builder/corner_connector_emit_shell.ts';
import { BASE_LEG_LAYOUT_POLICY } from '../esm/shared/dimensions/base_leg_policy.ts';
import { BASE_PLATFORM_RENDER_POLICY } from '../esm/shared/dimensions/base_platform_render_policy.ts';
import { BASE_PLINTH_POLICY } from '../esm/shared/dimensions/base_plinth_policy.ts';

class Shape {
  points: Array<[string, number, number]> = [];
  moveTo(x: number, y: number) {
    this.points.push(['M', x, y]);
  }
  lineTo(x: number, y: number) {
    this.points.push(['L', x, y]);
  }
}

class Mesh {
  geometry: any;
  material: any;
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
  rotation = { x: 0, y: 0, z: 0 };
  userData: Record<string, unknown> = {};
  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }
}

class Group {
  children: unknown[] = [];
  position = { set() {} };
  userData: Record<string, unknown> = {};
  add(obj: unknown) {
    this.children.push(obj);
  }
}

class BoxGeometry {
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}

class ExtrudeGeometry {
  shape: Shape;
  opts: Record<string, unknown>;
  constructor(shape: Shape, opts: Record<string, unknown>) {
    this.shape = shape;
    this.opts = opts;
  }
}

class CylinderGeometry {
  args: number[];
  constructor(...args: number[]) {
    this.args = args;
  }
}

const THREE = {
  Shape,
  Mesh,
  Group,
  BoxGeometry,
  ExtrudeGeometry,
  CylinderGeometry,
};

function assertClose(actual: number, expected: number, message?: string): void {
  assert.ok(Math.abs(actual - expected) <= 1e-12, message ?? `${actual} !== ${expected}`);
}

function assertShapePoint(actual: [string, number, number], expected: [string, number, number]): void {
  assert.equal(actual[0], expected[0]);
  assertClose(actual[1], expected[1]);
  assertClose(actual[2], expected[2]);
}

function createSetup(overrides: Record<string, unknown> = {}) {
  const cornerGroup = new Group();
  const outlined: unknown[] = [];
  const ctx: any = {
    App: {},
    __cfg: { isMultiColorMode: true },
    woodThick: 0.018,
    startY: 0.1,
    wingH: 2.1,
    stackOffsetY: 0.03,
    baseType: 'plinth',
    baseH: 0.09,
    bodyMat: 'body',
    backPanelMaterialArray: [
      {
        polygonOffset: true,
        polygonOffsetFactor: 3,
        polygonOffsetUnits: 2,
        clone() {
          return {
            polygonOffset: this.polygonOffset,
            polygonOffsetFactor: this.polygonOffsetFactor,
            polygonOffsetUnits: this.polygonOffsetUnits,
          };
        },
      },
    ],
    __individualColors: { corner_pent_plinth: true },
    getCornerMat: (partId: string, fallback: unknown) => `corner:${partId}:${String(fallback)}`,
    addOutlines: (obj: unknown) => outlined.push(obj),
    getMaterial: (_a: unknown, kind: string) => `mat:${kind}`,
    wingD: 0.6,
  };
  const setup: any = {
    THREE,
    mx: (x: number) => x,
    L: 1.2,
    Dmain: 0.8,
    shape: new Shape(),
    pts: [
      { x: 0, z: 0 },
      { x: 0, z: 1.2 },
      { x: -0.6, z: 1.2 },
      { x: -1.2, z: 0.8 },
      { x: -1.2, z: 0 },
    ],
    interiorX: -0.6,
    interiorZ: 0.64,
    cornerGroup,
    showFrontPanel: true,
    cornerConnectorAsStandaloneCabinet: true,
    plateShape: new Shape(),
    carcassBackInsetX: 0.0078,
    carcassBackInsetZ: 0.0078,
    ctx,
  };
  Object.assign(setup, overrides);
  if (overrides.ctx) Object.assign(ctx, overrides.ctx as object);
  return { setup, cornerGroup, outlined };
}

test('corner connector shell metrics strip polygon offset from cloned back-panel materials', () => {
  const { setup } = createSetup();
  const metrics = createCornerConnectorShellMetrics(setup);
  assert.equal(metrics.panelThick, 0.018);
  assert.equal(metrics.backPanelThick, 0.005);
  assert.equal((metrics.backPanelMaterialArrayNoPO[0] as any).polygonOffset, false);
  assert.equal((setup.ctx.backPanelMaterialArray[0] as any).polygonOffset, true);
});

test('corner connector plinth shape derives toe ratio, trim, wall inset, and point ordering from Base Plinth', () => {
  const { setup } = createSetup();
  const shape = createCornerConnectorPlinthShape(setup, 10) as Shape;
  const p2 = { x: -setup.ctx.wingD, z: setup.L };
  const p3 = { x: -setup.L, z: setup.Dmain };
  const dv = { x: p3.x - p2.x, z: p3.z - p2.z };
  const diagonal = Math.hypot(dv.x, dv.z);
  const toeInset = diagonal * BASE_PLINTH_POLICY.connectorMaxToeRatio;
  const toeEndTrim = Math.min(toeInset, BASE_PLINTH_POLICY.connectorToeEndTrimMaxM);
  const normal = { x: -dv.z / diagonal, z: dv.x / diagonal };
  const wallInset = BASE_PLINTH_POLICY.connectorWallInsetM;

  const expected: Array<[string, number, number]> = [
    ['M', -wallInset, wallInset],
    ['L', -wallInset, setup.L],
    ['L', p2.x + toeEndTrim, p2.z],
    ['L', p2.x + normal.x * toeInset, p2.z + normal.z * toeInset],
    ['L', p3.x + normal.x * toeInset, p3.z + normal.z * toeInset],
    ['L', p3.x, p3.z - toeEndTrim],
    ['L', -setup.L, wallInset],
    ['L', -wallInset, wallInset],
  ];

  assert.equal(shape.points.length, expected.length);
  shape.points.forEach((point, index) => assertShapePoint(point, expected[index]!));

  const belowTinyInset = createCornerConnectorPlinthShape(
    setup,
    BASE_PLINTH_POLICY.connectorTinyEpsilonM
  ) as Shape;
  assert.equal(belowTinyInset.points.length, 6);

  const shortSegment = createSetup();
  const segmentDelta = BASE_PLINTH_POLICY.segmentWidthEpsilonM / 4;
  shortSegment.setup.ctx.wingD = shortSegment.setup.L - segmentDelta;
  shortSegment.setup.Dmain = shortSegment.setup.L - segmentDelta;
  const shortDiagonal = Math.hypot(
    shortSegment.setup.L - shortSegment.setup.ctx.wingD,
    shortSegment.setup.L - shortSegment.setup.Dmain
  );
  assert.ok(shortDiagonal < BASE_PLINTH_POLICY.segmentWidthEpsilonM);
  assert.ok(
    BASE_PLINTH_POLICY.segmentWidthEpsilonM * BASE_PLINTH_POLICY.connectorMaxToeRatio <
      BASE_PLINTH_POLICY.connectorTinyEpsilonM
  );
  const shortSegmentShape = createCornerConnectorPlinthShape(shortSegment.setup, 10) as Shape;
  assert.equal(shortSegmentShape.points.length, 6);
});

test('corner connector plinth branch uses the focused shape inset and preserves its part contract', () => {
  const { setup, cornerGroup, outlined } = createSetup();
  const metrics = createCornerConnectorShellMetrics(setup);

  applyCornerConnectorShellBase(setup, metrics);

  const plinth = (cornerGroup.children as Mesh[]).find(
    child => child.userData.partId === 'corner_pent_plinth'
  );
  assert.ok(plinth);
  assert.equal(plinth.material, 'corner:corner_pent_plinth:body');
  assert.equal((plinth.geometry as ExtrudeGeometry).opts.depth, setup.ctx.baseH);
  assert.equal(plinth.position.y, setup.ctx.stackOffsetY + setup.ctx.baseH);
  assert.equal(plinth.rotation.x, Math.PI / 2);
  assert.equal(outlined.includes(plinth), true);

  const expectedShape = createCornerConnectorPlinthShape(
    setup,
    BASE_PLINTH_POLICY.connectorShapeInsetM
  ) as Shape;
  assert.deepEqual((plinth.geometry as ExtrudeGeometry).shape.points, expectedShape.points);
});

test('corner connector plain legs use five focused layout positions and preserve mirroring', () => {
  const { setup, cornerGroup } = createSetup();
  Object.assign(setup.ctx, {
    baseType: 'legs',
    baseH: 0.12,
    baseLegHeightM: 0.12,
    baseLegPlatformMode: 'plain',
    baseLegStyle: 'square',
    baseLegColor: 'black',
    baseLegWidthCm: 4,
  });
  const metrics = createCornerConnectorShellMetrics(setup);

  applyCornerConnectorShellBase(setup, metrics);

  const inset = BASE_LEG_LAYOUT_POLICY.connectorInsetM;
  const backX = Math.max(-setup.L + inset, -inset - BASE_LEG_LAYOUT_POLICY.connectorBackInsetM);
  const expectedPoints = [
    { x: -inset, z: inset },
    { x: -inset, z: Math.max(inset, setup.L - inset) },
    {
      x: Math.min(-inset, -setup.ctx.wingD + inset),
      z: Math.max(inset, setup.L - inset),
    },
    { x: backX, z: Math.max(inset, setup.Dmain + inset) },
    { x: backX, z: inset },
  ];
  const legs = (cornerGroup.children as Mesh[]).slice(0, 5);
  assert.equal(legs.length, 5);
  legs.forEach((leg, index) => {
    assert.deepEqual((leg.geometry as BoxGeometry).args, [0.04, 0.12, 0.04]);
    assert.equal(leg.material, 'mat:metal');
    assertClose(leg.position.x, expectedPoints[index]!.x);
    assertClose(leg.position.y, setup.ctx.stackOffsetY + 0.12 / 2);
    assertClose(leg.position.z, expectedPoints[index]!.z);
  });

  const mirrored = createSetup({ mx: (x: number) => -x });
  Object.assign(mirrored.setup.ctx, {
    baseType: 'legs',
    baseH: 0.12,
    baseLegHeightM: 0.12,
    baseLegPlatformMode: 'plain',
    baseLegStyle: 'square',
    baseLegColor: 'black',
    baseLegWidthCm: 4,
  });
  applyCornerConnectorShellBase(mirrored.setup, createCornerConnectorShellMetrics(mirrored.setup));
  const mirroredLegs = (mirrored.cornerGroup.children as Mesh[]).slice(0, 5);
  mirroredLegs.forEach((leg, index) => {
    assertClose(leg.position.x, -expectedPoints[index]!.x);
    assertClose(leg.position.z, expectedPoints[index]!.z);
  });
});

test('corner connector shell panels add back and attachment panels with outer-face alignment', () => {
  const { setup, cornerGroup, outlined } = createSetup();
  const metrics = createCornerConnectorShellMetrics(setup);
  const addEdgePanel = applyCornerConnectorShellPanels(setup, metrics);
  assert.equal(typeof addEdgePanel, 'function');
  assert.equal(cornerGroup.children.length, 4);
  const wingAttach = cornerGroup.children[2] as Mesh;
  const mainAttach = cornerGroup.children[3] as Mesh;
  assert.equal(wingAttach.userData.partId, 'corner_pent_attach_wing');
  assert.equal(mainAttach.userData.partId, 'corner_pent_attach_main');
  assert.equal(outlined.length, 2);
  assert.notEqual(wingAttach.position.x, (setup.pts[1].x + setup.pts[2].x) / 2);
  assert.notEqual(mainAttach.position.z, (setup.pts[3].z + setup.pts[4].z) / 2);
});

test('buildCornerConnectorShell orchestrates base plates and panel flows through focused owners', () => {
  const { setup, cornerGroup, outlined } = createSetup();
  const result = buildCornerConnectorShell(setup);
  assert.equal(result.panelThick, 0.018);
  assert.equal(result.backPanelThick, 0.005);
  assert.equal(result.backPanelOutsideInsetZ, 0.0025);
  assert.equal(typeof result.addEdgePanel, 'function');

  const partIds = (cornerGroup.children as Mesh[]).map(child => child.userData.partId);
  assert.ok(partIds.includes('corner_pent_plinth'));
  assert.ok(partIds.includes('corner_pent_floor'));
  assert.ok(partIds.includes('corner_pent_ceil'));
  assert.ok(partIds.includes('corner_pent_back_side'));
  assert.ok(partIds.includes('corner_pent_attach_main'));
  assert.ok(outlined.length >= 4);
});

test('corner connector legs stage adds matching bottom and top pentagon platforms', () => {
  const platformH = BASE_PLATFORM_RENDER_POLICY.heightM;
  const legSupportH = 0.12;
  const { setup, cornerGroup } = createSetup();
  Object.assign(setup.ctx, {
    baseType: 'legs',
    baseH: legSupportH + platformH,
    baseLegHeightM: 0,
    baseLegPlatformMode: 'stage',
    baseLegBottomPlatformHeightM: platformH,
    baseLegTopPlatformHeightM: platformH,
    baseLegStyle: 'round',
    baseLegColor: 'black',
    baseLegWidthCm: 4,
    stackOffsetY: 0,
    startY: legSupportH + platformH,
    wingH: 2.0,
  });

  buildCornerConnectorShell(setup);

  const meshes = cornerGroup.children as Mesh[];
  const partIds = meshes.map(child => child.userData.partId).filter(Boolean);
  assert.ok(partIds.includes('corner_pent_leg_platform_bottom'));
  assert.ok(partIds.includes('corner_pent_leg_platform_top'));

  const bottom = meshes.find(child => child.userData.partId === 'corner_pent_leg_platform_bottom');
  const top = meshes.find(child => child.userData.partId === 'corner_pent_leg_platform_top');
  assert.equal((bottom?.geometry as ExtrudeGeometry | undefined)?.opts.depth, platformH);
  assert.equal((top?.geometry as ExtrudeGeometry | undefined)?.opts.depth, platformH);
  assert.equal((bottom?.geometry as ExtrudeGeometry | undefined)?.shape, setup.shape);
  assert.equal((top?.geometry as ExtrudeGeometry | undefined)?.shape, setup.shape);
  assert.equal(bottom?.position.y, legSupportH + platformH);
  assert.equal(top?.position.y, legSupportH + platformH + 2.0 + platformH);
  assert.equal(bottom?.userData.kind, 'legPlatformSeg');
  assert.equal(top?.userData.kind, 'legPlatformSeg');
});
