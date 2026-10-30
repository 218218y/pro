import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addShortcutShelf,
  applyShelfShortcutToList,
  createShelfShortcutAddHover,
  readFreshShelfShortcutAddition,
  resolveShelfShortcutAddition,
  resolveShelfShortcutOperation,
} from '../esm/native/services/canvas_picking_shelf_shortcuts.ts';

test('brace shortcut distinguishes a converted shelf from an added shelf across persistence', () => {
  const shelves = [{ variant: 'regular', depthM: 0.3 }];
  assert.equal(applyShelfShortcutToList(shelves, 0, 'brace'), true);
  assert.equal(shelves[0]?.variant, 'brace');
  assert.equal(shelves[0]?.depthM, undefined);
  applyShelfShortcutToList(shelves, 0, 'brace');
  assert.equal(shelves[0]?.variant, 'regular');

  const config: Record<string, any> = {};
  const addition = resolveShelfShortcutAddition({
    config,
    bottomY: 0,
    topY: 2.4,
    pointerY: 1.1,
    pointerX: 0,
    internalCenterX: 0,
    innerW: 1,
    woodThick: 0.018,
  });
  assert.ok(addition);
  addShortcutShelf(config, addition, 'brace');
  const restored = JSON.parse(JSON.stringify(config));
  assert.deepEqual(resolveShelfShortcutOperation(restored.sketchExtras.shelves[0], 'brace'), {
    action: 'remove',
    variant: 'brace',
    previewOp: 'remove',
  });
  applyShelfShortcutToList(restored.sketchExtras.shelves, 0, 'brace');
  assert.deepEqual(restored.sketchExtras.shelves, []);
});

test('regular shortcut converts both brace kinds and removes ordinary shelves', () => {
  for (const variant of ['brace', 'winter_brace']) {
    const shelves = [{ variant, braceShortcutAdded: true }];
    assert.equal(resolveShelfShortcutOperation(shelves[0]!, 'regular').previewOp, 'add');
    applyShelfShortcutToList(shelves, 0, 'regular');
    assert.deepEqual(shelves, [{ variant: 'regular' }]);
    assert.equal(resolveShelfShortcutOperation(shelves[0]!, 'regular').previewOp, 'remove');
    applyShelfShortcutToList(shelves, 0, 'regular');
    assert.deepEqual(shelves, []);
  }
});

test('addition preview is tied to its target, stack, variant and freshness', () => {
  const addition = { y: 1, yNorm: 0.5, xNorm: 0.5, scopeOrder: 0, centerX: 0, width: 1, blocked: false };
  const hover = createShelfShortcutAddHover(addition, 'corner:1', true, 'regular');
  assert.deepEqual(readFreshShelfShortcutAddition(hover, 'corner:1', true, 'regular'), addition);
  assert.equal(readFreshShelfShortcutAddition(hover, 'corner:0', true, 'regular'), null);
  assert.equal(readFreshShelfShortcutAddition(hover, 'corner:1', false, 'regular'), null);
  assert.equal(readFreshShelfShortcutAddition(hover, 'corner:1', true, 'brace'), null);
  assert.equal(
    readFreshShelfShortcutAddition({ ...hover, ts: Date.now() - 1300 }, 'corner:1', true, 'regular'),
    null
  );
  assert.equal(
    readFreshShelfShortcutAddition(
      { ...hover, addition: { ...addition, yNorm: NaN } },
      'corner:1',
      true,
      'regular'
    ),
    null
  );
});

test('addition blocks storage volume and rods only in the selected partition cell', () => {
  const base = {
    bottomY: 0,
    topY: 2,
    pointerY: 1.1,
    pointerX: -0.25,
    innerW: 1,
    internalCenterX: 0,
    woodThick: 0.018,
  };
  const config = {
    sketchExtras: {
      dividers: [{ xNorm: 0.5, yNorm: 0.5, order: 1 }],
      storageBarriers: [{ yNorm: 0.5, xNorm: 0.25, scopeOrder: 1, heightM: 0.4 }],
    },
  };
  assert.equal(resolveShelfShortcutAddition({ ...base, config })?.blocked, true);
  const right = resolveShelfShortcutAddition({ ...base, config, pointerX: 0.25 });
  assert.equal(right?.blocked, false);
  assert.ok(right && right.centerX > 0 && right.width < 0.5);
  assert.equal(
    resolveShelfShortcutAddition({
      ...base,
      pointerY: 1,
      config: { sketchExtras: { rods: [{ yNorm: 0.5 }] } },
    })?.blocked,
    true
  );
});
