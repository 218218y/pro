import test from 'node:test';
import assert from 'node:assert/strict';

import { createCornerConnectorShellMetrics } from '../esm/native/builder/corner_connector_emit_shell_metrics.ts';
import { createCornerConnectorPlinthShape } from '../esm/native/builder/corner_connector_emit_shell_base.ts';
import { applyCornerConnectorShellPanels } from '../esm/native/builder/corner_connector_emit_shell_panels.ts';
import { buildCornerConnectorShell } from '../esm/native/builder/corner_connector_emit_shell.ts';

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

function createSetup(overrides: Record<string, unknown> = {}) {
  const cornerGroup = new Group();
  const outlined: unknown[] = [];
  const ctx: any = {
    App: { cfg: { isMultiColorMode: true } },
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

test('corner connector plinth shape adds toe inset points along the diagonal when enabled', () => {
  const { setup } = createSetup();
  const shape = createCornerConnectorPlinthShape(setup, 0.04) as Shape;
  assert.ok(shape.points.length > 6);
  assert.deepEqual(shape.points[0], ['M', -0.01, 0.01]);
  assert.ok(shape.points.some(point => point[0] === 'L' && point[1] > -0.6 && point[1] < -0.4));
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
