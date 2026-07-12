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
    sketchExternalListKind: 'custom-external' | 'regular-external' | null;
  }> = {}
) {
  return {
    family: overrides.family ?? 'sketch_external',
    partId: overrides.partId ?? 'sketch_ext_drawers_2_ext-a_1',
    moduleIndex: overrides.moduleIndex ?? '2',
    sketchExtDrawerId: overrides.sketchExtDrawerId ?? 'ext-a',
    sketchBoxId: overrides.sketchBoxId ?? '',
    sketchExternalListKind: overrides.sketchExternalListKind ?? null,
  };
}

test('drawer remove plan resolves exact typed targets and rejects ambiguous or cross-module hits', () => {
  assert.deepEqual(resolveCrossDrawerRemovePlan({ hit: createHit(), activeModuleKey: 2 }), {
    kind: 'remove-sketch-external-drawer',
    moduleKey: 2,
    target: { scope: 'module', drawerId: 'ext-a' },
  });

  assert.equal(
    resolveCrossDrawerRemovePlan({
      hit: createHit({
        family: 'sketch_external',
        sketchExtDrawerId: '',
        sketchBoxId: 'box-a',
        partId: 'sketch_box_box-a_ext_drawers_ext-b_1',
      }),
      activeModuleKey: 2,
    }),
    null
  );

  assert.deepEqual(
    resolveCrossDrawerRemovePlan({
      hit: createHit({
        sketchExtDrawerId: 'ext-b',
        sketchBoxId: 'box-a',
        sketchExternalListKind: 'custom-external',
      }),
      activeModuleKey: 2,
    }),
    {
      kind: 'remove-sketch-external-drawer',
      moduleKey: 2,
      target: {
        scope: 'box',
        boxId: 'box-a',
        drawerId: 'ext-b',
        listKind: 'custom-external',
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
      target: {
        scope: 'box',
        boxId: 'box-a',
        drawerId: 'nested-a',
        listKind: 'custom-external',
      },
    }),
    true
  );
  assert.deepEqual(cfg.sketchExtras.boxes[0]?.extDrawers, [{ id: 'nested-b' }]);
  assert.deepEqual(cfg.sketchExtras.extDrawers, [{ id: 'top-a' }, { id: 'top-b' }]);

  assert.equal(
    applyCrossDrawerRemovePlanToConfig(cfg as never, {
      kind: 'remove-sketch-external-drawer',
      moduleKey: 2,
      target: {
        scope: 'box',
        boxId: 'box-a',
        drawerId: 'regular-b',
        listKind: 'regular-external',
      },
    }),
    true
  );
  assert.deepEqual(cfg.sketchExtras.boxes[0]?.regularExtDrawers, [{ id: 'regular-a' }]);

  assert.equal(
    applyCrossDrawerRemovePlanToConfig(cfg as never, {
      kind: 'remove-sketch-external-drawer',
      moduleKey: 2,
      target: { scope: 'module', drawerId: 'top-b' },
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

test('sketch internal removal uses exact IDs regardless of overlap, list order, or cassette slot', () => {
  for (const ids of [
    ['a_b', 'a'],
    ['a', 'a_b'],
    ['drawer_1', 'drawer_10'],
    ['drawer_10', 'drawer_1'],
  ]) {
    for (const slot of ['lower', 'upper']) {
      const targetId = ids.includes('a_b') ? 'a_b' : 'drawer_1';
      const cfg = { sketchExtras: { drawers: ids.map(id => ({ id })) } };
      const plan = resolveCrossDrawerRemovePlan({
        hit: createHit({
          family: 'sketch_internal',
          partId: `div_int_sketch_2_${targetId}_${slot}`,
          sketchExtDrawerId: '',
        }),
        activeModuleKey: 2,
      });

      assert.ok(plan && plan.kind === 'remove-sketch-internal-drawer');
      assert.equal(applyCrossDrawerRemovePlanToConfig(cfg as never, plan), true);
      assert.deepEqual(
        cfg.sketchExtras.drawers.map(item => item.id),
        ids.filter(id => id !== targetId)
      );
    }
  }
});

test('sketch internal resolver rejects part identities that do not encode the exact module scope', () => {
  assert.equal(
    resolveCrossDrawerRemovePlan({
      hit: createHit({
        family: 'sketch_internal',
        partId: 'div_int_sketch_a_b_lower',
        moduleIndex: '2',
        sketchExtDrawerId: '',
      }),
      activeModuleKey: 2,
    }),
    null
  );
});

test('sketch external removal never crosses module, box, or list scopes for duplicate IDs', () => {
  const cfg = {
    sketchExtras: {
      extDrawers: [{ id: 'dup' }],
      boxes: [
        {
          id: 'box-a',
          extDrawers: [{ id: 'dup' }],
          regularExtDrawers: [{ id: 'dup' }],
        },
      ],
    },
  };

  assert.equal(
    applyCrossDrawerRemovePlanToConfig(cfg as never, {
      kind: 'remove-sketch-external-drawer',
      moduleKey: 2,
      target: {
        scope: 'box',
        boxId: 'box-a',
        drawerId: 'dup',
        listKind: 'regular-external',
      },
    }),
    true
  );
  assert.deepEqual(cfg.sketchExtras.extDrawers, [{ id: 'dup' }]);
  assert.deepEqual(cfg.sketchExtras.boxes[0]?.extDrawers, [{ id: 'dup' }]);
  assert.deepEqual(cfg.sketchExtras.boxes[0]?.regularExtDrawers, []);

  assert.equal(
    applyCrossDrawerRemovePlanToConfig(cfg as never, {
      kind: 'remove-sketch-external-drawer',
      moduleKey: 2,
      target: { scope: 'module', drawerId: 'dup' },
    }),
    true
  );
  assert.deepEqual(cfg.sketchExtras.extDrawers, []);
  assert.deepEqual(cfg.sketchExtras.boxes[0]?.extDrawers, [{ id: 'dup' }]);
});

test('ambiguous duplicate records and duplicate box identities are rejected without mutation', () => {
  const duplicateDrawers = { sketchExtras: { extDrawers: [{ id: 'dup' }, { id: 'dup' }] } };
  assert.equal(
    applyCrossDrawerRemovePlanToConfig(duplicateDrawers as never, {
      kind: 'remove-sketch-external-drawer',
      moduleKey: 2,
      target: { scope: 'module', drawerId: 'dup' },
    }),
    false
  );
  assert.equal(duplicateDrawers.sketchExtras.extDrawers.length, 2);

  const duplicateBoxes = {
    sketchExtras: {
      boxes: [
        { id: 'box-a', extDrawers: [{ id: 'dup' }] },
        { id: 'box-a', extDrawers: [{ id: 'dup' }] },
      ],
    },
  };
  assert.equal(
    applyCrossDrawerRemovePlanToConfig(duplicateBoxes as never, {
      kind: 'remove-sketch-external-drawer',
      moduleKey: 2,
      target: {
        scope: 'box',
        boxId: 'box-a',
        drawerId: 'dup',
        listKind: 'custom-external',
      },
    }),
    false
  );
  assert.equal(duplicateBoxes.sketchExtras.boxes[0]?.extDrawers.length, 1);
  assert.equal(duplicateBoxes.sketchExtras.boxes[1]?.extDrawers.length, 1);
});

test('drawer remove commit owns the structural patch boundary and applies one immutable plan', () => {
  const cfg = { sketchExtras: { extDrawers: [{ id: 'ext-a' }] } };
  const calls: Array<{ moduleKey: unknown; meta: unknown }> = [];
  const plan: CrossDrawerRemovePlan = {
    kind: 'remove-sketch-external-drawer',
    moduleKey: 2,
    target: { scope: 'module', drawerId: 'ext-a' },
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

test('drawer remove commit reports false when the patch is skipped or no target changes', () => {
  const missingPlan: CrossDrawerRemovePlan = {
    kind: 'remove-sketch-external-drawer',
    moduleKey: 2,
    target: { scope: 'module', drawerId: 'missing' },
  };
  const cfg = { sketchExtras: { extDrawers: [{ id: 'ext-a' }] } };

  assert.equal(
    commitCrossDrawerRemovePlan({
      plan: missingPlan,
      source: 'test.missing',
      patchConfigForKey(_moduleKey, patch) {
        patch(cfg as never);
      },
    }),
    false
  );
  assert.deepEqual(cfg.sketchExtras.extDrawers, [{ id: 'ext-a' }]);

  assert.equal(
    commitCrossDrawerRemovePlan({
      plan: missingPlan,
      source: 'test.skipped',
      patchConfigForKey() {
        return null;
      },
    }),
    false
  );
});
