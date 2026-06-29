import test from 'node:test';
import assert from 'node:assert/strict';

import { createCornerWingDoorState } from '../esm/native/builder/corner_wing_cell_doors_state.ts';
import { maybeSeedEdgeHandleDefaultNone } from '../esm/native/builder/corner_wing_cell_doors_scope.ts';

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : {};
}

function readNumFrom(obj: unknown, key: string, defaultValue: number): number {
  const value = asRecord(obj)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

function makeDoorContext(overrides: AnyRecord = {}) {
  const ctx: AnyRecord = {
    App: {},
    THREE: {},
    wingGroup: { add: () => undefined },
    doorStyle: '',
    splitDoors: false,
    groovesEnabled: false,
    removeDoorsEnabled: false,
    getGroove: () => undefined,
    getCurtain: () => undefined,
    createDoorVisual: () => null,
    render: null,
    cornerCells: [],
    doorCount: 2,
    cornerSharedLongEdgeHandleLiftAbsY: 0,
    cornerSharedAlignedEdgeHandleBaseAbsY: 1.1,
    readMap: () => ({}),
    readSplitPosListFromMap: () => [],
    getOrCreateCacheRecord: () => ({}),
    primaryMode: '',
    isLongEdgeHandleVariantForPart: () => false,
    topSplitHandleInsetForPart: () => 0.02,
    clampHandleAbsYForPart: (_cfg: unknown, _partId: string, absY: number) => absY,
    asRecord,
    readNumFrom,
    woodThick: 0.018,
    startY: 0.1,
    wingH: 2.4,
    wingD: 0.55,
    activeWidth: 1.2,
    blindWidth: 0.1,
    uiAny: {},
    stackKey: 'top',
    stackSplitEnabled: false,
    isDoorRemoved: () => false,
    stackScopePartKey: (partId: string) => partId,
    readScopedReader: () => undefined,
    getMirrorMat: () => null,
    resolveSpecial: () => null,
    getCornerMat: (_partId: string, fallback: unknown) => fallback,
    frontMat: null,
    cfg0: {},
    doorTrimMap: {},
    hingeMap0: {},
    splitMap0: {},
    splitBottomMap0: {},
    fallbackDoorW: 0.6,
    splitGap: 0.004,
  };
  return { ...ctx, ...overrides } as any;
}

test('corner wing door state ignores string-encoded internal cell geometry scalars', () => {
  const dirtyCell = {
    key: 'corner-cell-0',
    startX: 0.2,
    width: 0.8,
    centerX: 0.6,
    depth: '0.9',
    bodyHeight: '2.1',
    effectiveBottomY: '0.2',
    drawerHeightTotal: '0.3',
    doorsInCell: '2',
    doorStart: '0',
    cfg: null,
  };
  const ctx = makeDoorContext({ cornerCells: [dirtyCell] });

  const state = createCornerWingDoorState(ctx, 0);

  assert.equal(state.cellD, 0.55, 'string depth must not override wing depth');
  assert.equal(
    Number(state.cellEffBottomY.toFixed(6)),
    0.118,
    'string effectiveBottomY must fall back to cabinet bottom'
  );
  assert.equal(state.cellDrawerH, 0, 'string drawerHeightTotal must not lift the door bottom');
  assert.equal(state.doorW, 0.8, 'string doorsInCell must not split the runtime door span');
  assert.equal(
    Number(state.dX.toFixed(6)),
    0.6,
    'door center should be derived from numeric startX/width only'
  );
  assert.equal(Number(state.effectiveTopLimit.toFixed(6)), Number((0.1 + 2.4 - 0.018 / 2).toFixed(6)));
});

test('corner wing door state ignores string hex door width and falls back to rectangular cell span', () => {
  const dirtyHexCell = {
    key: 'corner-cell-0',
    startX: 0.2,
    width: 0.8,
    centerX: 0.6,
    depth: 0.7,
    bodyHeight: 2.2,
    effectiveBottomY: 0.12,
    drawerHeightTotal: 0,
    doorsInCell: 1,
    doorStart: 0,
    __hexCellGeometry: { doorWidthM: '0.4', doorDepthM: 0.72 },
    cfg: null,
  };
  const ctx = makeDoorContext({ cornerCells: [dirtyHexCell] });

  const state = createCornerWingDoorState(ctx, 0);

  assert.equal(state.doorW, 0.8);
  assert.equal(Number(state.dX.toFixed(6)), 0.6);
  assert.equal(state.doorZShift, 0.72 - 0.55, 'numeric hex depth still applies');
});

test('corner wing edge-handle seeding ignores string cell door counts', () => {
  const calls: unknown[][] = [];
  const ctx = makeDoorContext({
    App: { actions: { parts: { markDefaultNone: (...args: unknown[]) => calls.push(args) } } },
    cfg0: { globalHandleType: 'edge' },
    doorCount: 2,
  });

  maybeSeedEdgeHandleDefaultNone(ctx, 0, 'corner_door_1', {
    geom: { cell: { doorsInCell: '2', doorStart: '0' }, doorW: 0.8, dX: 0.4 } as any,
  });

  assert.deepEqual(calls, [], 'legacy string door counts should not trigger internal seeding policy');
});
