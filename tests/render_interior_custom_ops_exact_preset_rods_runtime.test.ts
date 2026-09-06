import test from 'node:test';
import assert from 'node:assert/strict';

import { computeInteriorCustomOps } from '../esm/native/builder/core_storage_compute.js';
import { createBuilderRenderInteriorCustomOps } from '../esm/native/builder/render_interior_custom_ops.js';
import { createTestRoomArchitecturePlan } from './room_architecture_test_helpers.ts';

function closeEnough(actual: number, expected: number, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

function createRenderHarness() {
  const rodCalls: Array<{ y: number; limit: number | null; span: Record<string, number> | null }> = [];
  const group = { children: [] as unknown[] };
  const renderer = createBuilderRenderInteriorCustomOps({
    app: () => ({}),
    ops: () => ({}),
    wardrobeGroup: () => group,
    three: value => value,
    matCache: () => null,
    renderOpsHandleCatch: () => undefined,
    assertTHREE: () => null,
  });

  return {
    rodCalls,
    apply(ops: unknown, overrides: Record<string, unknown> = {}) {
      return renderer.applyInteriorCustomOps({
        THREE: null,
        roomArchitecturePlan: createTestRoomArchitecturePlan(),
        customOps: ops,
        createBoard: () => null,
        createRod: (y: unknown, _hangClothes: unknown, _single: unknown, limit: unknown, span: unknown) => {
          const rec =
            span && typeof span === 'object' && !Array.isArray(span)
              ? (span as Record<string, unknown>)
              : null;
          rodCalls.push({
            y: Number(y),
            limit: limit == null ? null : Number(limit),
            span: rec
              ? {
                  innerW: Number(rec.innerW),
                  internalCenterX: Number(rec.internalCenterX),
                  effectiveBottomY: Number(rec.effectiveBottomY),
                  effectiveTopY: Number(rec.effectiveTopY),
                }
              : null,
          });
          return null;
        },
        wardrobeGroup: group,
        gridDivisions: 6,
        effectiveBottomY: 0,
        effectiveTopY: 2.4,
        localGridStep: 0.4,
        innerW: 1,
        woodThick: 0.018,
        internalDepth: 0.55,
        internalCenterX: 0,
        internalZ: 0,
        D: 0.6,
        moduleIndex: 0,
        modulesLength: 1,
        ...overrides,
      });
    },
  };
}

test('renderInteriorCustomOps keeps exact preset-backed hanging_split rod heights', () => {
  const ops = computeInteriorCustomOps(
    {
      shelves: [true, false, false, false, true],
      rods: [false, true, false, false, true, false],
      rodOps: [
        {
          gridIndex: 2,
          yFactor: 2.3,
          enableHangingClothes: true,
          enableSingleHanger: true,
          limitFactor: 1.3,
          limitAdd: 0,
        },
        {
          gridIndex: 5,
          yFactor: 4.8,
          enableHangingClothes: true,
          enableSingleHanger: true,
          limitFactor: 2.5,
          limitAdd: 0,
        },
      ],
      storage: false,
      shelfVariants: [],
    },
    6
  );

  const harness = createRenderHarness();
  assert.equal(harness.apply(ops), true);
  assert.equal(harness.rodCalls.length, 2);
  assert.deepEqual(
    harness.rodCalls.map(call => ({
      y: Number(call.y.toFixed(2)),
      limit: call.limit == null ? null : Number(call.limit.toFixed(2)),
    })),
    [
      { y: 0.92, limit: 0.52 },
      { y: 1.92, limit: 1 },
    ]
  );
});

test('renderInteriorCustomOps keeps exact preset-backed hanging rod height after shelf removal seeding', () => {
  const ops = computeInteriorCustomOps(
    {
      shelves: [false, false, false, true, false],
      rods: [false, false, false, true, false, false],
      rodOps: [{ gridIndex: 4, yFactor: 3.8, enableHangingClothes: true, enableSingleHanger: true }],
      storage: false,
      shelfVariants: [],
    },
    6
  );

  const harness = createRenderHarness();
  assert.equal(harness.apply(ops), true);
  assert.equal(harness.rodCalls.length, 1);
  assert.equal(Number(harness.rodCalls[0].y.toFixed(2)), 1.52);
});

test('custom hanging rod is split into the logical cells created by a regular-module divider', () => {
  const ops = computeInteriorCustomOps(
    {
      shelves: [false, false, false, false, false],
      rods: [false, true, false, false, false, false],
      rodOps: [{ gridIndex: 2, yFactor: 2.3, enableHangingClothes: true, enableSingleHanger: true }],
      storage: false,
      shelfVariants: [],
    },
    6
  );
  const harness = createRenderHarness();
  assert.equal(
    harness.apply(ops, {
      sketchExtras: { dividers: [{ id: 'v1', xNorm: 0.5, yNorm: 0.5, order: 1 }] },
    }),
    true
  );
  assert.equal(harness.rodCalls.length, 2);
  const spans = harness.rodCalls.map(call => call.span);
  assert.ok(spans.every(Boolean));
  assert.ok((spans[0]?.internalCenterX ?? 0) < 0);
  assert.ok((spans[1]?.internalCenterX ?? 0) > 0);
  closeEnough(spans[0]?.innerW as number, 0.491);
  closeEnough(spans[1]?.innerW as number, 0.491);
});
