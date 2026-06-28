import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeThreeRuntime } from './_fake_three_runtime.ts';

import { applyCornerConnectorCornice } from '../esm/native/builder/corner_connector_cornice_emit.ts';
import {
  CARCASS_BASE_DIMENSIONS,
  CARCASS_CORNICE_DIMENSIONS,
} from '../esm/shared/wardrobe_dimension_tokens_shared.ts';

const THREE = createFakeThreeRuntime();

type AnyRecord = Record<string, unknown>;

function childPartIds(group: { children: unknown[] }): string[] {
  return group.children.map(child => String((child as { userData?: AnyRecord }).userData?.partId));
}

function makeConnectorParams(args: {
  type: 'classic' | 'wave';
  connectorBodyHeight?: number;
  mainBodyHeight?: number;
  adjacentMainBodyHeight?: number | null;
  adjacentWingBodyHeight?: number | null;
}) {
  const L = 0.8;
  const mainD = 0.6;
  const wingD = 0.6;
  const pts = [
    { x: 0, z: 0 },
    { x: 0, z: L },
    { x: -wingD, z: L },
    { x: -L, z: mainD },
    { x: -L, z: 0 },
  ];
  const interiorX = pts.reduce((sum, point) => sum + point.x, 0) / pts.length;
  const interiorZ = pts.reduce((sum, point) => sum + point.z, 0) / pts.length;
  const cornerGroup = new THREE.Group();

  return {
    ctx: {
      App: {},
      THREE,
      woodThick: 0.018,
      startY: 0.1,
      wingH: args.connectorBodyHeight ?? 2.4,
      mainH: args.mainBodyHeight ?? args.connectorBodyHeight ?? 2.4,
      baseLegTopPlatformHeightM: 0,
      __stackOffsetZ: 0,
      __stackKey: 'top',
      hasCorniceEnabled: true,
      __corniceAllowedForThisStack: true,
      __corniceTypeNorm: args.type,
      bodyMat: 'body',
      addOutlines: () => undefined,
      getCornerMat: (partId: string, fallback: unknown) => `${partId}:${String(fallback)}`,
      __sketchMode: false,
    },
    locals: {
      pts,
      cornerGroup,
      interiorX,
      interiorZ,
      mx: (x: number) => x,
      L,
      adjacentMainBodyHeight: args.adjacentMainBodyHeight,
      adjacentWingBodyHeight: args.adjacentWingBodyHeight,
    },
    helpers: {
      readNumFrom: (obj: unknown, key: string, defaultValue: number) => {
        const rec = obj && typeof obj === 'object' ? (obj as AnyRecord) : null;
        const value = rec ? rec[key] : undefined;
        return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
      },
      asRecord: (value: unknown): AnyRecord =>
        value && typeof value === 'object' ? (value as AnyRecord) : {},
      reportErrorThrottled: () => undefined,
    },
    cornerGroup,
  };
}

test('pentagon wave cornice adds exposed side return on the main-cabinet seam when the pentagon is taller', () => {
  const { ctx, locals, helpers, cornerGroup } = makeConnectorParams({
    type: 'wave',
    connectorBodyHeight: 2.4,
    mainBodyHeight: 2.1,
    adjacentWingBodyHeight: 2.4,
  });

  applyCornerConnectorCornice({ ctx, locals, helpers } as never);

  const partIds = childPartIds(cornerGroup);
  assert.ok(partIds.includes('corner_cornice_front'), 'expected the existing diagonal front cornice');
  assert.ok(
    partIds.includes('corner_cornice_side_right'),
    'the taller pentagon needs a full side cornice return where it rises above the main cabinet'
  );
  assert.ok(!partIds.includes('corner_cornice_side_left'), 'equal-height wing seam must stay internal');
});

test('pentagon cornice sits above the upper leg stage like the regular wardrobe', () => {
  const platformH = CARCASS_BASE_DIMENSIONS.legs.platform.heightM;
  for (const type of ['classic', 'wave'] as const) {
    const { ctx, locals, helpers, cornerGroup } = makeConnectorParams({ type });
    ctx.baseLegTopPlatformHeightM = platformH;

    applyCornerConnectorCornice({ ctx, locals, helpers } as never);

    const front = cornerGroup.children.find(
      child => String((child as { userData?: AnyRecord }).userData?.partId) === 'corner_cornice_front'
    );
    assert.ok(front, `${type} pentagon cornice should emit a front piece`);
    assert.equal(
      Number((front as { position: { y: number } }).position.y.toFixed(6)),
      Number((ctx.startY + ctx.wingH + platformH + CARCASS_CORNICE_DIMENSIONS.common.yLiftM).toFixed(6))
    );
  }
});

test('pentagon side-return resolver uses the adjacent main cell height, not only the global main height', () => {
  const { ctx, locals, helpers, cornerGroup } = makeConnectorParams({
    type: 'classic',
    connectorBodyHeight: 2.4,
    mainBodyHeight: 2.7,
    adjacentMainBodyHeight: 2.1,
    adjacentWingBodyHeight: 2.4,
  });

  applyCornerConnectorCornice({ ctx, locals, helpers } as never);

  const partIds = childPartIds(cornerGroup);
  assert.ok(
    partIds.includes('corner_cornice_side_right'),
    'a lower adjacent main cell must expose the pentagon side even when another main cell is taller globally'
  );
  assert.ok(!partIds.includes('corner_cornice_side_left'), 'equal-height wing seam must stay internal');
});

test('pentagon wave cornice adds both exposed side returns when both neighbors are lower or missing', () => {
  const { ctx, locals, helpers, cornerGroup } = makeConnectorParams({
    type: 'wave',
    connectorBodyHeight: 2.4,
    mainBodyHeight: 2.1,
    adjacentWingBodyHeight: null,
  });

  applyCornerConnectorCornice({ ctx, locals, helpers } as never);

  const partIds = childPartIds(cornerGroup);
  assert.ok(partIds.includes('corner_cornice_side_left'));
  assert.ok(partIds.includes('corner_cornice_side_right'));
});

test('pentagon classic cornice keeps equal-height attach seams internal but caps lower-neighbor seams', () => {
  const equal = makeConnectorParams({
    type: 'classic',
    connectorBodyHeight: 2.4,
    mainBodyHeight: 2.4,
    adjacentWingBodyHeight: 2.4,
  });
  applyCornerConnectorCornice({ ctx: equal.ctx, locals: equal.locals, helpers: equal.helpers } as never);
  assert.ok(!childPartIds(equal.cornerGroup).includes('corner_cornice_side_right'));
  assert.ok(!childPartIds(equal.cornerGroup).includes('corner_cornice_side_left'));

  const stepped = makeConnectorParams({
    type: 'classic',
    connectorBodyHeight: 2.4,
    mainBodyHeight: 2.1,
    adjacentWingBodyHeight: 2.0,
  });
  applyCornerConnectorCornice({
    ctx: stepped.ctx,
    locals: stepped.locals,
    helpers: stepped.helpers,
  } as never);

  const partIds = childPartIds(stepped.cornerGroup);
  assert.ok(partIds.includes('corner_cornice_side_left'));
  assert.ok(partIds.includes('corner_cornice_side_right'));
});
