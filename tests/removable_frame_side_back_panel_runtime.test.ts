import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCarcassOps } from '../esm/native/builder/core_carcass_compute.ts';
import { applyCarcassAndGetCabinetMetrics } from '../esm/native/builder/carcass_pipeline.ts';
import { createApplyCarcassBaseOps } from '../esm/native/builder/render_carcass_ops_base.ts';

class BoxGeometry {
  width: number;
  height: number;
  depth: number;

  constructor(width: number, height: number, depth: number) {
    this.width = width;
    this.height = height;
    this.depth = depth;
  }
}

class MeshBasicMaterial {
  opts: Record<string, unknown>;

  constructor(opts: Record<string, unknown>) {
    this.opts = opts;
  }
}

class Mesh {
  geometry: unknown;
  material: unknown;
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
  userData: Record<string, unknown> = {};
  castShadow = false;
  receiveShadow = false;

  constructor(geometry: unknown, material: unknown) {
    this.geometry = geometry;
    this.material = material;
  }
}

function isBackPanelSeg(value: unknown): value is {
  kind: 'back_panel';
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  z: number;
} {
  const rec = value as Record<string, unknown> | null;
  return !!(
    rec &&
    rec.kind === 'back_panel' &&
    typeof rec.width === 'number' &&
    typeof rec.height === 'number' &&
    typeof rec.depth === 'number' &&
    typeof rec.x === 'number' &&
    typeof rec.y === 'number' &&
    typeof rec.z === 'number'
  );
}

function readPanelEdges(seg: Record<string, unknown>): { left: number; right: number } {
  const x = Number(seg.x);
  const width = Number(seg.width);
  return { left: x - width / 2, right: x + width / 2 };
}

test('removed frame side turns the adjacent back-panel segment into paintable wood', () => {
  const ops = computeCarcassOps({
    totalW: 2,
    D: 0.6,
    H: 2.4,
    woodThick: 0.018,
    doorsCount: 4,
    baseType: '',
    hasCornice: false,
    moduleInternalWidths: [0.8, 1.164],
    cfg: { removedDoorsMap: { removed_body_left: true } },
  }) as Record<string, unknown>;

  const backPanels = ops.backPanels as Array<Record<string, unknown>>;
  assert.equal(backPanels.length, 2);
  assert.equal(backPanels[0].partId, 'body_back_left_open');
  assert.equal(backPanels[0].material, 'wood');
  assert.equal(backPanels[0].__wpWoodBackPanel, true);
  assert.equal(backPanels[1].partId, undefined);
  assert.equal(backPanels[1].material, undefined);
});

test('removed left frame side trims the adjacent back-panel edge to the shelf inner face', () => {
  const totalW = 2;
  const woodThick = 0.018;
  const ops = computeCarcassOps({
    totalW,
    D: 0.6,
    H: 2.4,
    woodThick,
    doorsCount: 4,
    baseType: '',
    hasCornice: false,
    moduleInternalWidths: [0.8, 1.164],
    cfg: { removedDoorsMap: { removed_body_left: true } },
  }) as Record<string, unknown>;

  const backPanels = ops.backPanels as Array<Record<string, unknown>>;
  const firstPanelEdges = readPanelEdges(backPanels[0]);
  const shelfLeftInnerFace = -totalW / 2 + woodThick;

  assert.ok(firstPanelEdges.left >= shelfLeftInnerFace - 1e-9);
  assert.ok(firstPanelEdges.left < shelfLeftInnerFace + 0.003);
});

test('removed right frame side trims the adjacent back-panel edge to the shelf inner face', () => {
  const totalW = 2;
  const woodThick = 0.018;
  const ops = computeCarcassOps({
    totalW,
    D: 0.6,
    H: 2.4,
    woodThick,
    doorsCount: 4,
    baseType: '',
    hasCornice: false,
    moduleInternalWidths: [0.8, 1.164],
    cfg: { removedDoorsMap: { removed_body_right: true } },
  }) as Record<string, unknown>;

  const backPanels = ops.backPanels as Array<Record<string, unknown>>;
  const lastPanelEdges = readPanelEdges(backPanels[1]);
  const shelfRightInnerFace = totalW / 2 - woodThick;

  assert.ok(lastPanelEdges.right <= shelfRightInnerFace + 1e-9);
  assert.ok(lastPanelEdges.right > shelfRightInnerFace - 0.003);
});

test('stepped carcass also trims an open-side back-panel segment to the shelf inner face', () => {
  const totalW = 2;
  const woodThick = 0.018;
  const ops = computeCarcassOps({
    totalW,
    D: 0.6,
    H: 2.4,
    woodThick,
    doorsCount: 4,
    baseType: '',
    hasCornice: false,
    moduleInternalWidths: [0.8, 1.164],
    moduleHeightsTotal: [2.1, 2.4],
    cfg: { removedDoorsMap: { removed_body_left: true } },
  }) as Record<string, unknown>;

  const backPanels = ops.backPanels as Array<Record<string, unknown>>;
  const firstPanelEdges = readPanelEdges(backPanels[0]);
  const shelfLeftInnerFace = -totalW / 2 + woodThick;

  assert.equal(backPanels[0].partId, 'body_back_left_open');
  assert.ok(firstPanelEdges.left >= shelfLeftInnerFace - 1e-9);
  assert.ok(firstPanelEdges.left < shelfLeftInnerFace + 0.003);
});

test('wood back-panel render ops register the segment as body and use its part material on every face', () => {
  const added: unknown[] = [];
  const outlined: unknown[] = [];
  const registered: Array<{ partId: string; kind: string }> = [];
  const { applyCarcassBaseOps } = createApplyCarcassBaseOps({ isBackPanelSeg });

  applyCarcassBaseOps(
    {
      backPanels: [
        {
          kind: 'back_panel',
          width: 1,
          height: 2,
          depth: 0.018,
          x: 0,
          y: 1,
          z: -0.3,
          partId: 'body_back_left_open',
          material: 'wood',
          __wpWoodBackPanel: true,
        },
      ],
    },
    {
      THREE: { BoxGeometry, Mesh, MeshBasicMaterial },
      ctx: {
        bodyMat: 'body-material',
        masoniteMat: 'masonite-material',
        whiteMat: 'white-material',
      },
      sketchMode: false,
      wardrobeGroup: { add: (obj: unknown) => added.push(obj) },
      getPartMaterial: (partId: string) => `paint:${partId}`,
      addOutlines: (obj: unknown) => outlined.push(obj),
      reg: (_App: unknown, partId: string, _obj: unknown, kind: string) => {
        registered.push({ partId, kind });
      },
      App: {},
    } as never
  );

  const mesh = added[0] as Mesh;
  assert.equal(mesh.material, 'paint:body_back_left_open');
  assert.deepEqual(mesh.userData, {
    partId: 'body_back_left_open',
    kind: 'backPanel',
    __wpWoodBackPanel: true,
  });
  assert.deepEqual(registered, [{ partId: 'body_back_left_open', kind: 'body' }]);
  assert.equal(outlined[0], mesh);
  assert.equal(mesh.castShadow, true);
  assert.equal(mesh.receiveShadow, true);
});

test('lower stack back-panel wood identity is scoped to lower removed frame side ids', () => {
  const common = {
    App: {},
    THREE: null,
    totalW: 2,
    D: 0.6,
    H: 0.9,
    woodThick: 0.018,
    doorsCount: 4,
    baseType: '',
    hasCornice: false,
    moduleInternalWidths: [0.8, 1.164],
    moduleHeightsTotal: [0.9, 0.9],
    renderCarcass: false,
    partIdPrefix: 'lower_',
    frameSidePartIdPrefix: 'lower_',
  };

  const topOnly = applyCarcassAndGetCabinetMetrics({
    ...common,
    cfg: { removedDoorsMap: { removed_body_left: true } },
  }).carcassOps as Record<string, unknown>;
  assert.equal(topOnly.backPanels, null);

  const lower = applyCarcassAndGetCabinetMetrics({
    ...common,
    cfg: { removedDoorsMap: { removed_lower_body_left: true } },
  }).carcassOps as Record<string, unknown>;
  const lowerBackPanels = lower.backPanels as Array<Record<string, unknown>>;

  assert.equal(lowerBackPanels.length, 2);
  assert.equal(lowerBackPanels[0].partId, 'lower_body_back_left_open');
  assert.equal(lowerBackPanels[0].material, 'wood');
  assert.equal(lowerBackPanels[1].partId, undefined);
});
