import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';

import {
  computeCustomSplitCutsY,
  mergeSplitCuts,
} from '../esm/native/builder/hinged_doors_module_ops_split_policy.ts';
import {
  appendArchedHingedDoorOps,
  appendSplitHingedDoorOps,
} from '../esm/native/builder/hinged_doors_module_ops_split.ts';
import { readHingedDoorOp } from '../esm/native/builder/render_door_ops_shared_ops.ts';
import { readSplitDoorsMapValue } from '../esm/native/features/project_config/project_config_map_readers.ts';
import { normalizeKnownMapSnapshot } from '../esm/native/runtime/maps_access.ts';
import { createHingedDoorIterationState } from '../esm/native/builder/hinged_doors_module_ops_iteration.ts';
import {
  doorArchCutEdges,
  doorArchSpan,
  doorContourSpanAtX,
  readDoorArchCuts,
} from '../esm/shared/door_arch_geometry.ts';
import {
  makeDoorArchCut,
  planDoorArch,
  readDoorArchCutSlice,
  hitsDoorArchSlice,
  type ArchSurface,
} from '../esm/native/services/canvas_picking_door_arch_target.ts';
import type { DoorCurveShape } from '../types/maps.js';
import type { Vector3Like } from '../types/three_like.js';

function createCtx(overrides: Record<string, unknown> = {}) {
  const base = {
    App: {},
    THREE: null,
    cfg: {
      splitDoorsMap: {},
      handlesMap: {},
      groovesMap: {},
      isMultiColorMode: true,
      globalHandleType: 'bar',
    },
    index: 0,
    modulesLength: 1,
    moduleDoors: 1,
    modWidth: 1,
    currentX: 0,
    drawerHeightTotal: 0,
    effectiveBottomY: 0,
    startY: 0,
    woodThick: 0.02,
    cabinetBodyHeight: 2,
    D: 0.6,
    doorFrontZ: 0.1,
    splitLineY: 1.3,
    splitDoors: true,
    stackKey: 'main',
    isBottomStack: false,
    opsList: [] as any[],
    hingedDoorPivotMap: null,
    globalHandleAbsY: 1.05,
    configRecord: {},
    winterBraceDoorPlan: { cuts: [], fixedBelowY: null },
    moduleCfgList: [{}],
    isGroovesEnabled: true,
    removeDoorsEnabled: false,
    shadowMat: null,
    externalW: 1,
    externalCenterX: 0.5,
    drawerTopEdgeAbsolute: 0,
    doorBottomY: 0,
    effectiveTopLimit: 2,
    totalDoorSpace: 2,
    singleDoorW: 0.5,
    getHingeDirSafe: () => 'left' as const,
    isDoorSplitSafe: () => true,
    isDoorSplitBottomSafe: () => false,
    getPartColorValueSafe: (partId: string) => `color:${partId}`,
    grooveValSafe: (_doorId: number, suffix: string, defaultValue: boolean) =>
      suffix === 'full' ? defaultValue : false,
    isDoorRemovedSafe: () => false,
    reportDoorSoftOnce: () => undefined,
    resolveCurtainForPart: (partId: string, defaultCurtain: string | null | undefined) =>
      defaultCurtain ?? `curtain:${partId}`,
    resolveSpecialForPart: () => null,
    isDoorSplitExplicitOn: () => false,
  };

  const merged = {
    ...base,
    ...overrides,
    cfg: {
      ...base.cfg,
      ...((overrides.cfg as Record<string, unknown> | undefined) || {}),
    },
  };

  if (!Array.isArray((merged as any).opsList)) {
    (merged as any).opsList = [];
  }
  return merged as any;
}

function createState(overrides: Record<string, unknown> = {}) {
  return {
    currentDoorId: 5,
    nextGlobalDoorCounter: 6,
    doorLeftEdge: 0,
    pivotX: 0.4,
    meshOffsetX: 0,
    isLeftHinge: true,
    doorWidth: 0.48,
    topSplitEnabled: true,
    bottomSplitEnabled: false,
    shouldSplitThisDoor: true,
    sourceKey: 'd5_full',
    topKey: 'd5_top',
    midKey: 'd5_mid',
    botKey: 'd5_bot',
    ...overrides,
  } as any;
}

test('hinged door split policy dedupes nearby custom cuts and merged bottom cuts', () => {
  const ctx = createCtx({
    cfg: {
      splitDoorsMap: {
        splitpos_d5: [0.2, 0.21, 0.5],
      },
    },
  });
  const state = createState();

  const customCuts = computeCustomSplitCutsY(ctx, state);
  assert.equal(customCuts.length, 2);
  assert.ok(Math.abs(customCuts[0] - 0.4) < 1e-9);
  assert.ok(Math.abs(customCuts[1] - 1.0) < 1e-9);

  const mergedCuts = mergeSplitCuts(ctx, customCuts, 0.41, true);
  assert.equal(mergedCuts.length, 2);
  assert.ok(Math.abs(mergedCuts[0] - 0.4) < 1e-9);
  assert.ok(Math.abs(mergedCuts[1] - 1.0) < 1e-9);
});

test('hinged door split append emits canonical multi-cut segment ids and bottom handle policy', () => {
  const ctx = createCtx({
    cfg: {
      splitDoorsMap: {
        splitpos_d5: [0.25, 0.5, 0.75],
      },
      groovesMap: {
        groove_d5_mid1: true,
      },
    },
  });
  const state = createState({ bottomSplitEnabled: true });

  appendSplitHingedDoorOps(ctx, state);

  assert.equal(ctx.opsList.length, 4);
  assert.deepEqual(
    ctx.opsList.map((entry: any) => entry.partId),
    ['d5_bot', 'd5_mid1', 'd5_mid2', 'd5_top']
  );
  assert.deepEqual(
    ctx.opsList.map((entry: any) => entry.allowHandle),
    [false, true, true, true]
  );
  assert.equal(ctx.opsList[1].hasGroove, true);
  assert.ok(Math.abs(ctx.opsList[0].y - 0.2485) < 1e-9);
  assert.ok(Math.abs(ctx.opsList[3].handleAbsY - 1.603) < 1e-9);
});

test('module door split emission defers to the sketch door-cut pass when sketch external drawers own the leaf', () => {
  const ctx = createCtx({
    configRecord: {
      sketchExtras: {
        extDrawers: [{ count: 2, yNormC: 0.5 }],
      },
    },
    isDoorSplitSafe: () => true,
    isDoorSplitBottomSafe: () => true,
  });

  const state = createHingedDoorIterationState(ctx, 0, 5);
  assert.equal(state.topSplitEnabled, true);
  assert.equal(state.bottomSplitEnabled, true);
  assert.equal(state.shouldSplitThisDoor, false);
});

test('module door split emission also defers when a sketch box contains external drawers', () => {
  const ctx = createCtx({
    configRecord: {
      sketchExtras: {
        boxes: [{ regularExtDrawers: [{ count: 1 }] }],
      },
    },
    isDoorSplitSafe: () => true,
  });

  const state = createHingedDoorIterationState(ctx, 0, 5);
  assert.equal(state.topSplitEnabled, true);
  assert.equal(state.shouldSplitThisDoor, false);
});

test('a saved arched cut emits matching curved edges between two straight cuts', () => {
  const cut = { peak: 0.67, profile: { start: 0, end: 1, rise: 0.12 } };
  const persisted = readSplitDoorsMapValue(
    JSON.parse(
      JSON.stringify({
        splitarch_d5: cut,
        splitarch_d6: { ...cut, peak: 0 },
        splitpos_d5: [0.35, 0.85],
      })
    )
  );
  const splitDoorsMap = normalizeKnownMapSnapshot('splitDoorsMap', persisted);
  assert.deepEqual(splitDoorsMap.splitarch_d5, [cut]);
  assert.equal(splitDoorsMap.splitarch_d6, undefined);
  assert.deepEqual(splitDoorsMap.splitpos_d5, [0.35, 0.85]);

  const ctx = createCtx({ cfg: { splitDoorsMap } });
  assert.equal(appendArchedHingedDoorOps(ctx, createState()), true);
  const ops = ctx.opsList.map(readHingedDoorOp);
  assert.deepEqual(
    ops.map(op => op.partId),
    ['d5_bot', 'd5_mid1', 'd5_mid2', 'd5_top']
  );
  const [bottom, lower, upper, top] = ops;
  assert.equal(bottom.archCut, undefined);
  assert.equal(top.archCut, undefined);
  assert.ok(lower?.archCut && upper?.archCut);
  assert.ok(Math.abs(bottom.y + bottom.height / 2 - 0.7) < 0.01);
  assert.ok(Math.abs(top.y - top.height / 2 - 1.7) < 0.01);
  const edge = lower.archCut.contour.slice(1, -1);
  const corresponding = upper.archCut.contour.slice(1, -1);
  assert.ok(edge.length > 20);
  assert.ok(Math.max(...edge.map(point => point.y)) - edge[0]!.y > 0.2);
  for (const [index, point] of edge.entries()) {
    const other = corresponding[index]!;
    assert.equal(point.x, other.x);
    const clearance = upper.y + other.y - (lower.y + point.y);
    assert.ok(clearance > 0 && clearance < 0.02);
  }
});

test('new shapes use the same geometry on single and paired cuts, CNC and mirrors', () => {
  const rect = { minX: -0.24, maxX: 0.24, minY: 0, maxY: 2 };
  const makeSurface = (key: string): ArchSurface => ({
    key,
    rect,
    z: 0,
    face: 1,
    anchor: {} as ArchSurface['anchor'],
    group: {} as ArchSurface['group'],
    toWorld: point => point,
    toLocal: point => point,
  });
  const left = makeSurface('splitarch_d5');
  const right = makeSurface('splitarch_d6');
  const offsetX = 0.484;
  const y = 1;
  for (const shape of ['arch-down', 'arch-both', 'ellipse'] as const) {
    for (const tool of ['cut', 'groove', 'mirror'] as const) {
      for (const paired of [false, true]) {
        const point = new Vector3(paired ? offsetX / 2 : 0, y, 0) as unknown as Vector3Like;
        const slices = planDoorArch({
          tool,
          shape,
          target: {
            surface: left,
            point,
            seam: paired ? offsetX / 2 : null,
            surfaces: [
              { surface: left, offsetX: 0, offsetY: 0 },
              ...(paired ? [{ surface: right, offsetX, offsetY: 0 }] : []),
            ],
            allSurfaces: [left, right],
          },
        });
        if (tool === 'cut' && shape !== 'arch-down') {
          assert.deepEqual(slices, []);
          continue;
        }
        assert.equal(slices.length, paired ? 2 : 1, `${tool} ${shape} paired=${paired}`);
        const first = slices[0]!;
        assert.equal(first.profile.shape, shape);
        if (paired) {
          const second = slices[1]!;
          assert.ok(first.profile.link);
          assert.equal(first.profile.link, second.profile.link);
          const a = doorArchSpan(first.rect, first.profile, first.rect.maxX);
          const b = doorArchSpan(second.rect, second.profile, second.rect.minX);
          assert.ok(Math.abs(a.minY - b.minY) < 1e-8);
          assert.ok(Math.abs(a.maxY - b.maxY) < 1e-8);
        }
        if (shape === 'arch-down') {
          assert.equal(first.rect.minY, y);
          assert.ok(first.rect.maxY > y);
        }
        if (tool === 'cut') {
          const saved = makeDoorArchCut(first);
          const persisted = readSplitDoorsMapValue(JSON.parse(JSON.stringify({ splitarch_d5: saved })));
          const restored = readDoorArchCutSlice(left, readDoorArchCuts(persisted.splitarch_d5)[0]!);
          assert.ok(restored);
          const edges = doorArchCutEdges(restored.rect, restored.profile);
          assert.equal(edges.length, shape === 'arch-down' ? 1 : 2);
          const onEdge = edges[0]![10]!;
          assert.ok(
            hitsDoorArchSlice(restored, new Vector3(onEdge.x, onEdge.y, 0) as unknown as Vector3Like, tool)
          );
        } else {
          const x = (first.rect.minX + first.rect.maxX) / 2;
          const { minY, maxY } = doorArchSpan(first.rect, first.profile, x);
          assert.ok(
            hitsDoorArchSlice(first, new Vector3(x, (minY + maxY) / 2, 0) as unknown as Vector3Like, tool)
          );
        }
      }
    }
  }
});

test('stacked arcs with different sampled spans leave ordered leaves through the whole width', () => {
  const cuts = [
    { peak: 0.37, profile: { start: 0, end: 1, rise: 0.15 } },
    { peak: 0.51, profile: { start: 0.17, end: 0.9, rise: 0.13 } },
    { base: 0.68, peak: 1, profile: { shape: 'arch-down' as const, start: 0, end: 1, rise: 0.08 } },
    { peak: 0.995, profile: { start: 0, end: 1, rise: 0.14 } },
  ];
  const map = readSplitDoorsMapValue(JSON.parse(JSON.stringify({ splitarch_d5: cuts })));
  assert.deepEqual(map.splitarch_d5, cuts);
  const ctx = createCtx({ cfg: { splitDoorsMap: map } });
  assert.equal(appendArchedHingedDoorOps(ctx, createState()), true);
  const ops = ctx.opsList.map(readHingedDoorOp);
  assert.deepEqual(
    ops.map(op => op.partId),
    ['d5_bot', 'd5_mid1', 'd5_mid2', 'd5_mid3', 'd5_top']
  );
  for (const x of [-0.23, -0.11, 0, 0.13, 0.23]) {
    const spans = ops.map(op => {
      const span = doorContourSpanAtX(op.archCut!.contour, x)!;
      assert.ok(span.maxY > span.minY);
      return { bottom: op.y + span.minY, top: op.y + span.maxY };
    });
    for (const [index, span] of spans.entries()) {
      const above = spans[index + 1];
      if (above) assert.ok(above.bottom > span.top, `x=${x} lower=${span.top} upper=${above.bottom}`);
    }
  }
});

test('both cut edges produce an independent middle leaf with a hinge only where it can mount', () => {
  for (const shape of ['arch-down', 'arch-both', 'ellipse'] satisfies DoorCurveShape[]) {
    const base = 0.3;
    const peak = shape === 'arch-down' ? 1 : 0.7;
    const rise = shape === 'ellipse' ? (peak - base) / 2 : 0.12;
    const ctx = createCtx({
      cfg: { splitDoorsMap: { splitarch_d5: { base, peak, profile: { shape, start: 0, end: 1, rise } } } },
    });
    assert.equal(appendArchedHingedDoorOps(ctx, createState()), true);
    const ops = ctx.opsList.map(readHingedDoorOp);
    assert.deepEqual(
      ops.map(op => op.partId),
      shape === 'arch-down' ? ['d5_bot', 'd5_top'] : ['d5_bot', 'd5_mid', 'd5_top']
    );
    assert.ok(ops.every(op => op.archCut?.contour.length > 20));
    if (shape !== 'arch-down') {
      assert.equal(ops[1].fixedClosed, shape === 'ellipse');
      assert.equal(ops[1].allowHandle !== false, shape === 'arch-both');
    }
  }
});
