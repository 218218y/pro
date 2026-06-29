import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeThreeRuntime } from './_fake_three_runtime.ts';

import { applyCornerWingCornice } from '../esm/native/builder/corner_wing_cornice_emit.ts';
import { positiveCorniceTopPlatformHeight } from '../esm/native/builder/corner_wing_cornice_contracts.ts';
import { shouldBuildSegmentedCornerWingCornice } from '../esm/native/builder/corner_wing_cornice_path.ts';
import {
  CARCASS_BASE_DIMENSIONS,
  CARCASS_CORNICE_DIMENSIONS,
} from '../esm/shared/wardrobe_dimension_tokens_shared.ts';
import type { CornerCell } from '../esm/native/builder/corner_geometry_plan.ts';

const THREE = createFakeThreeRuntime();

function makeCorniceParams(kind: 'classic' | 'wave') {
  const wingGroup = new THREE.Group();
  return {
    wingGroup,
    params: {
      ctx: {
        App: {},
        THREE,
        woodThick: 0.018,
        startY: 0.1,
        wingH: 2,
        wingD: 0.6,
        wingW: 1.2,
        blindWidth: 0,
        baseLegTopPlatformHeightM: 0,
        cornerConnectorEnabled: true,
        hasCorniceEnabled: true,
        __corniceAllowedForThisStack: true,
        __corniceTypeNorm: kind,
        getCornerMat: (partId: string, fallback: unknown) => `${partId}:${String(fallback)}`,
        bodyMat: 'body',
        addOutlines: () => undefined,
        __sketchMode: false,
        wingGroup,
      },
      locals: {
        __wingBackPanelThick: 0.005,
        __wingBackPanelCenterZ: -0.3,
      },
      helpers: {
        cfgSnapshot: {},
        readMap: () => ({}),
        isRecord: (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object',
        asRecord: (value: unknown): Record<string, unknown> =>
          value && typeof value === 'object' ? (value as Record<string, unknown>) : {},
        readNumFrom: (obj: unknown, key: string, defaultValue: number) => {
          const rec = obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : null;
          const value = rec ? rec[key] : undefined;
          return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
        },
      },
    },
  };
}

function makeCornerCell(args: {
  idx: number;
  startX: number;
  width: number;
  depth: number;
  bodyHeight?: number;
  hasActiveDepth?: boolean;
  hasActiveSpecialDims?: boolean;
  hex?: CornerCell['__hexCellGeometry'];
}): CornerCell {
  const bodyHeight = args.bodyHeight ?? 2;
  return {
    idx: args.idx,
    key: `corner:${args.idx}`,
    doorStart: args.idx,
    doorsInCell: 1,
    width: args.width,
    startX: args.startX,
    centerX: args.startX + args.width / 2,
    bodyHeight,
    depth: args.depth,
    __hasActiveHeight: false,
    __hasActiveDepth: args.hasActiveDepth === true,
    __hasActiveSpecialDims: args.hasActiveSpecialDims === true,
    __hexCellGeometry: args.hex ?? null,
    cfg: {
      layout: 'single',
      extDrawersCount: 0,
      hasShoeDrawer: false,
      isCustom: false,
      gridDivisions: 1,
      customData: { shelves: [], rods: [], storage: false },
    },
    drawerHeightTotal: 0,
    effectiveBottomY: 0,
    effectiveTopY: bodyHeight,
    gridDivisions: 1,
    localGridStep: bodyHeight,
  };
}

function childPartId(child: unknown): string {
  return String((child as { userData?: Record<string, unknown> }).userData?.partId);
}

function geometryDepth(child: unknown): number {
  const depth = (child as { geometry?: { parameters?: { depth?: unknown } } }).geometry?.parameters?.depth;
  return Number(depth);
}

function childRotationY(child: unknown): number {
  return Number((child as { rotation?: { y?: unknown } }).rotation?.y || 0);
}

test('corner wing classic cornice builds with real THREE prototype objects when connector exists', () => {
  const { params, wingGroup } = makeCorniceParams('classic');

  applyCornerWingCornice(params as never);

  assert.deepEqual(
    wingGroup.children.map(child =>
      String((child as { userData?: Record<string, unknown> }).userData?.partId)
    ),
    ['corner_cornice_front', 'corner_cornice_side_right']
  );
});

test('corner wing wave cornice builds with real THREE prototype objects when connector exists', () => {
  const { params, wingGroup } = makeCorniceParams('wave');

  applyCornerWingCornice(params as never);

  assert.deepEqual(
    wingGroup.children.map(child =>
      String((child as { userData?: Record<string, unknown> }).userData?.partId)
    ),
    ['corner_cornice_front', 'corner_cornice_side_right']
  );
});

test('corner wing cornice sits above the upper leg stage like the regular wardrobe', () => {
  const platformH = CARCASS_BASE_DIMENSIONS.legs.platform.heightM;
  for (const type of ['classic', 'wave'] as const) {
    const { params, wingGroup } = makeCorniceParams(type);
    params.ctx.baseLegTopPlatformHeightM = platformH;

    applyCornerWingCornice(params as never);

    const front = wingGroup.children.find(child => childPartId(child) === 'corner_cornice_front');
    assert.ok(front, `${type} cornice should emit a front piece`);
    assert.equal(
      Number((front as { position: { y: number } }).position.y.toFixed(6)),
      Number(
        (params.ctx.startY + params.ctx.wingH + platformH + CARCASS_CORNICE_DIMENSIONS.common.yLiftM).toFixed(
          6
        )
      )
    );
  }
});

test('corner wing cornice rejects string-encoded platform and cell metrics', () => {
  assert.equal(positiveCorniceTopPlatformHeight({ baseLegTopPlatformHeightM: '0.12' }), 0);

  const { params } = makeCorniceParams('classic');
  const cell = makeCornerCell({ idx: 0, startX: 0, width: 1.2, depth: 0.6 });
  (cell as any).depth = '0.45';
  (cell as any).bodyHeight = '1.6';
  params.locals.cornerCells = [cell];

  assert.equal(shouldBuildSegmentedCornerWingCornice(params.ctx as any, params.locals as any), false);
});

test('corner wing classic cornice follows per-cell depth changes instead of one straight front', () => {
  const { params, wingGroup } = makeCorniceParams('classic');
  params.locals.cornerCells = [
    makeCornerCell({ idx: 0, startX: 0, width: 0.6, depth: 0.45, hasActiveDepth: true }),
    makeCornerCell({ idx: 1, startX: 0.6, width: 0.6, depth: 0.75, hasActiveDepth: true }),
  ];

  applyCornerWingCornice(params as never);

  const straightFronts = wingGroup.children.filter(
    child =>
      childPartId(child) === 'corner_cornice_front' && Math.abs(childRotationY(child) + Math.PI / 2) < 1e-9
  );
  assert.equal(straightFronts.length, 2);
  assert.deepEqual(
    straightFronts.map(child => Number((child as { position: { z: number } }).position.z.toFixed(3))),
    [-0.145, 0.155]
  );

  const internalDepthReturns = wingGroup.children.filter(
    child => childPartId(child) === 'corner_cornice_front' && Math.abs(childRotationY(child)) < 1e-9
  );
  assert.equal(
    internalDepthReturns.length,
    2,
    'the connector seam and the exposed depth step between cells are front-painted returns'
  );
  const connectorReturn = internalDepthReturns.find(
    child => Math.abs((child as { position: { x: number } }).position.x) < 1e-9
  );
  assert.ok(connectorReturn, 'first changed-depth cell must bridge back to the pentagon cornice endpoint');
  assert.equal(Number(geometryDepth(connectorReturn).toFixed(3)), 0.15);
  const cellDepthReturn = internalDepthReturns.find(
    child => Math.abs((child as { position: { x: number } }).position.x - 0.6) < 1e-9
  );
  assert.ok(cellDepthReturn, 'depth transition between the two wing cells should stay bridged');
  assert.equal(Number(geometryDepth(cellDepthReturn).toFixed(3)), 0.34);
});

test('corner wing wave cornice follows a hex-cell footprint instead of a straight wing front', () => {
  const { params, wingGroup } = makeCorniceParams('wave');
  params.locals.cornerCells = [
    makeCornerCell({
      idx: 0,
      startX: 0,
      width: 1.2,
      depth: 0.45,
      hasActiveSpecialDims: true,
      hex: { sideDepthM: 0.45, doorDepthM: 0.72, doorWidthM: 0.42 },
    }),
  ];

  applyCornerWingCornice(params as never);

  const frontPieces = wingGroup.children.filter(child => childPartId(child) === 'corner_cornice_front');
  assert.equal(
    frontPieces.length,
    4,
    'hex footprint should render two diagonal fillers, the door-front run, and the pentagon seam return'
  );
  const connectorReturn = frontPieces.find(
    child => Math.abs((child as { position: { x: number } }).position.x - 0.009) < 1e-9
  );
  assert.ok(
    connectorReturn,
    'hex cell next to the pentagon should bridge from the pentagon endpoint to the hex side depth'
  );
  assert.equal(Number(geometryDepth(connectorReturn).toFixed(3)), 0.15);
  assert.deepEqual(
    frontPieces
      .filter(child => child !== connectorReturn)
      .map(child => Number((child as { position: { z: number } }).position.z.toFixed(3))),
    [-0.012, 0.107, -0.012]
  );
  assert.ok(frontPieces.some(child => Math.abs(childRotationY(child)) > 0.01));
});

test('corner wing wave cornice bridges a changed-depth first cell back to the pentagon endpoint', () => {
  const { params, wingGroup } = makeCorniceParams('wave');
  params.locals.cornerCells = [
    makeCornerCell({ idx: 0, startX: 0, width: 0.6, depth: 0.75, hasActiveDepth: true }),
    makeCornerCell({ idx: 1, startX: 0.6, width: 0.6, depth: 0.6 }),
  ];

  applyCornerWingCornice(params as never);

  const connectorReturn = wingGroup.children.find(
    child =>
      childPartId(child) === 'corner_cornice_front' &&
      Math.abs(childRotationY(child)) < 1e-9 &&
      Math.abs((child as { position: { x: number } }).position.x - 0.009) < 1e-9
  );
  assert.ok(
    connectorReturn,
    'wave cornice needs a visible connector seam return for a deeper first wing cell'
  );
  assert.equal(Number(geometryDepth(connectorReturn).toFixed(3)), 0.15);
  assert.equal(Number((connectorReturn as { position: { z: number } }).position.z.toFixed(3)), 0.08);
});
