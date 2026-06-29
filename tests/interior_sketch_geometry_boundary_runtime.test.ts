import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSketchExtrasArgs } from '../esm/native/builder/interior_pipeline_shared.ts';
import { resolveInteriorSketchExtrasInput } from '../esm/native/builder/render_interior_sketch_ops_input.ts';
import type { RenderInteriorSketchOpsContext } from '../esm/native/builder/render_interior_sketch_ops_types.ts';
import type { UnknownRecord } from '../types/index.ts';

function createResolverOwner(group: UnknownRecord = {}): RenderInteriorSketchOpsContext {
  return {
    app: args => (args as UnknownRecord).App as UnknownRecord,
    ops: () => ({}),
    wardrobeGroup: () => group,
    doors: () => [],
    markSplitHoverPickablesDirty: null,
    isFn: (value): value is (...args: unknown[]) => unknown => typeof value === 'function',
    asObject: value => (value && typeof value === 'object' ? (value as UnknownRecord) : null),
    matCache: () => ({}),
    renderOpsHandleCatch: () => undefined,
    assertTHREE: () => ({}),
    applyInternalDrawersOps: () => undefined,
    measureWardrobeLocalBox: () => null,
  } as RenderInteriorSketchOpsContext;
}

test('interior sketch pipeline normalizes draft string geometry before builder runtime args', () => {
  const args = buildSketchExtrasArgs(
    {
      App: {},
      cfg: {},
      doorStyle: 'flat',
      effectiveBottomY: '0.1',
      effectiveTopY: '2.4',
      innerW: '1.2',
      woodThick: '0.018',
      moduleIndex: '3',
      modulesLength: '4',
    } as unknown as Parameters<typeof buildSketchExtrasArgs>[0],
    {
      sketchExtras: {
        shelves: [{ id: 's1', yNorm: '0.25', depthM: '0.42' }],
        boxes: [
          {
            id: 'box1',
            heightM: '0.8',
            widthM: '0.6',
            dividers: [{ id: 'd1', xNorm: '0.5' }],
            drawers: [{ id: 'dr1', yNormC: '0.55', drawerHeightM: '0.18' }],
            doors: [{ id: 'door1', xNorm: '0.3', grooveLinesCount: '2' }],
          },
        ],
      },
    }
  );

  assert.equal(args.effectiveBottomY, 0.1);
  assert.equal(args.effectiveTopY, 2.4);
  assert.equal(args.innerW, 1.2);
  assert.equal(args.woodThick, 0.018);
  assert.equal(args.moduleIndex, 3);
  assert.equal(args.modulesLength, 4);

  const shelf = args.sketchExtras.shelves?.[0] as UnknownRecord;
  assert.equal(shelf.yNorm, 0.25);
  assert.equal(shelf.depthM, 0.42);

  const box = args.sketchExtras.boxes?.[0] as UnknownRecord;
  assert.equal(box.heightM, 0.8);
  assert.equal(box.widthM, 0.6);
  assert.equal((box.dividers as UnknownRecord[])[0].xNorm, 0.5);
  assert.equal((box.drawers as UnknownRecord[])[0].drawerHeightM, 0.18);
  assert.equal((box.doors as UnknownRecord[])[0].grooveLinesCount, 2);
});

test('direct render sketch resolver rejects string draft geometry at the runtime boundary', () => {
  const group: UnknownRecord = {};
  const resolved = resolveInteriorSketchExtrasInput(createResolverOwner(group), {
    App: {},
    cfgSnapshot: {},
    sketchExtras: {
      shelves: [{ id: 's1', yNorm: '0.4' }],
      drawers: [{ id: 'drawer1', yNormC: '0.6', drawerHeightM: '0.2' }],
    },
    doorStyle: 'flat',
    isGroovesEnabled: true,
    isInternalDrawersEnabled: true,
    sketchMode: true,
    createBoard: () => ({}),
    wardrobeGroup: group,
    effectiveBottomY: 0,
    effectiveTopY: 2.4,
    innerW: 1.5,
    woodThick: 0.018,
    shelfThick: 0.018,
    internalDepth: 0.52,
    internalCenterX: 0.1,
    internalZ: -0.26,
    D: 0.6,
    moduleIndex: 2,
    modulesLength: 5,
  });

  assert.ok(resolved);
  assert.equal(resolved.effectiveBottomY, 0);
  assert.equal(resolved.effectiveTopY, 2.4);
  assert.equal(resolved.innerW, 1.5);
  assert.equal(resolved.internalDepth, 0.52);
  assert.equal(resolved.moduleIndex, 2);
  assert.equal(resolved.modulesLength, 5);
  assert.equal(resolved.shelves[0]?.yNorm, null);
  assert.equal(resolved.drawers[0]?.drawerHeightM, null);
});
