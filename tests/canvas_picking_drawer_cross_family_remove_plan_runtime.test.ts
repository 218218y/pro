import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyCrossDrawerRemovePlanToConfig,
  commitCrossDrawerRemovePlan,
  resolveCrossDrawerRemovePlan,
  type CrossDrawerRemovePlan,
} from '../esm/native/services/canvas_picking_drawer_cross_family_remove_plan.js';

function createHit(
  overrides: Partial<{
    family: 'standard_external' | 'sketch_external' | 'sketch_internal' | 'other';
    partId: string;
    moduleIndex: string;
    sketchExtDrawerId: string;
    sketchBoxId: string;
  }> = {}
) {
  return {
    family: overrides.family ?? 'sketch_external',
    partId: overrides.partId ?? 'sketch_ext_drawers_2_ext-a_1',
    moduleIndex: overrides.moduleIndex ?? '2',
    sketchExtDrawerId: overrides.sketchExtDrawerId ?? 'ext-a',
    sketchBoxId: overrides.sketchBoxId ?? '',
  };
}

test('drawer remove plan resolves exact typed targets and rejects ambiguous or cross-module hits', () => {
  assert.deepEqual(resolveCrossDrawerRemovePlan({ hit: createHit(), activeModuleKey: 2 }), {
    kind: 'remove-sketch-external-drawer',
    moduleKey: 2,
    target: {
      kind: 'drawer-id',
      drawerId: 'ext-a',
      partId: 'sketch_ext_drawers_2_ext-a_1',
    },
  });

  assert.deepEqual(
    resolveCrossDrawerRemovePlan({
      hit: createHit({
        family: 'sketch_external',
        sketchExtDrawerId: '',
        sketchBoxId: 'box-a',
        partId: 'sketch_box_box-a_ext_drawers_ext-b_1',
      }),
      activeModuleKey: 2,
    }),
    {
      kind: 'remove-sketch-external-drawer',
      moduleKey: 2,
      target: {
        kind: 'part-id',
        partId: 'sketch_box_box-a_ext_drawers_ext-b_1',
        boxId: 'box-a',
      },
    }
  );

  assert.deepEqual(
    resolveCrossDrawerRemovePlan({
      hit: createHit({
        family: 'sketch_internal',
        partId: 'div_int_sketch_2_stack-a_lower',
        sketchExtDrawerId: '',
      }),
      activeModuleKey: 2,
    }),
    {
      kind: 'remove-sketch-internal-drawer',
      moduleKey: 2,
      drawerId: 'stack-a',
      partId: 'div_int_sketch_2_stack-a_lower',
    }
  );

  assert.deepEqual(
    resolveCrossDrawerRemovePlan({
      hit: createHit({ family: 'standard_external', partId: 'd2_draw_3', sketchExtDrawerId: '' }),
      activeModuleKey: 2,
    }),
    {
      kind: 'remove-standard-external-drawer',
      moduleKey: 2,
      partId: 'd2_draw_3',
    }
  );

  assert.equal(
    resolveCrossDrawerRemovePlan({ hit: createHit({ moduleIndex: '3' }), activeModuleKey: 2 }),
    null
  );
  assert.equal(
    resolveCrossDrawerRemovePlan({
      hit: createHit({ family: 'other', partId: '', sketchExtDrawerId: '' }),
      activeModuleKey: 2,
    }),
    null
  );
});

test('drawer remove plan mutates only the resolved sketch external target', () => {
  const cfg = {
    sketchExtras: {
      extDrawers: [{ id: 'top-a' }, { id: 'top-b' }],
      boxes: [
        {
          id: 'box-a',
          extDrawers: [{ id: 'nested-a' }, { id: 'nested-b' }],
          regularExtDrawers: [{ id: 'regular-a' }, { id: 'regular-b' }],
        },
      ],
    },
  };

  assert.equal(
    applyCrossDrawerRemovePlanToConfig(cfg as never, {
      kind: 'remove-sketch-external-drawer',
      moduleKey: 2,
      target: { kind: 'drawer-id', drawerId: 'nested-a', boxId: 'box-a' },
    }),
    true
  );
  assert.deepEqual(cfg.sketchExtras.boxes[0]?.extDrawers, [{ id: 'nested-b' }]);
  assert.deepEqual(cfg.sketchExtras.extDrawers, [{ id: 'top-a' }, { id: 'top-b' }]);

  assert.equal(
    applyCrossDrawerRemovePlanToConfig(cfg as never, {
      kind: 'remove-sketch-external-drawer',
      moduleKey: 2,
      target: { kind: 'drawer-id', drawerId: 'regular-b', boxId: 'box-a' },
    }),
    true
  );
  assert.deepEqual(cfg.sketchExtras.boxes[0]?.regularExtDrawers, [{ id: 'regular-a' }]);

  assert.equal(
    applyCrossDrawerRemovePlanToConfig(cfg as never, {
      kind: 'remove-sketch-external-drawer',
      moduleKey: 2,
      target: { kind: 'part-id', partId: 'sketch_ext_drawers_2_top-b_1' },
    }),
    true
  );
  assert.deepEqual(cfg.sketchExtras.extDrawers, [{ id: 'top-a' }]);
});

test('drawer remove plan applies sketch internal and standard external mutations without cross-family spillover', () => {
  const cfg = {
    extDrawersCount: 4,
    hasShoeDrawer: true,
    sketchExtras: {
      drawers: [{ id: 'stack-a' }, { id: 'stack-b' }],
      extDrawers: [{ id: 'ext-a' }],
    },
  };

  assert.equal(
    applyCrossDrawerRemovePlanToConfig(cfg as never, {
      kind: 'remove-sketch-internal-drawer',
      moduleKey: 2,
      drawerId: 'stack-a',
      partId: 'div_int_sketch_2_stack-a_upper',
    }),
    true
  );
  assert.deepEqual(cfg.sketchExtras.drawers, [{ id: 'stack-b' }]);
  assert.deepEqual(cfg.sketchExtras.extDrawers, [{ id: 'ext-a' }]);

  assert.equal(
    applyCrossDrawerRemovePlanToConfig(cfg as never, {
      kind: 'remove-standard-external-drawer',
      moduleKey: 2,
      partId: 'd2_draw_3',
    }),
    true
  );
  assert.equal(cfg.extDrawersCount, 0);
  assert.equal(cfg.hasShoeDrawer, true);

  assert.equal(
    applyCrossDrawerRemovePlanToConfig(cfg as never, {
      kind: 'remove-standard-external-drawer',
      moduleKey: 2,
      partId: 'd2_draw_shoe',
    }),
    true
  );
  assert.equal(cfg.hasShoeDrawer, false);
});

test('drawer remove commit owns the structural patch boundary and applies one immutable plan', () => {
  const cfg = { sketchExtras: { extDrawers: [{ id: 'ext-a' }] } };
  const calls: Array<{ moduleKey: unknown; meta: unknown }> = [];
  const plan: CrossDrawerRemovePlan = {
    kind: 'remove-sketch-external-drawer',
    moduleKey: 2,
    target: { kind: 'drawer-id', drawerId: 'ext-a' },
  };

  assert.equal(
    commitCrossDrawerRemovePlan({
      plan,
      source: 'test.removeDrawer',
      patchConfigForKey(moduleKey, patch, meta) {
        calls.push({ moduleKey, meta });
        patch(cfg as never);
      },
    }),
    true
  );

  assert.deepEqual(calls, [{ moduleKey: 2, meta: { source: 'test.removeDrawer', immediate: true } }]);
  assert.deepEqual(cfg.sketchExtras.extDrawers, []);
});
