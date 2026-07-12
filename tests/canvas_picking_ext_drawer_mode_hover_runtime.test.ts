import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extDrawerModeHoverMatchesModule,
  readRecentExtDrawerModeHover,
  writeExtDrawerModeHover,
} from '../esm/native/services/canvas_picking_ext_drawer_mode_hover.ts';

test('external drawer hover writes only canonical host identity and matches the exact module', () => {
  const App = {} as never;
  const hover = writeExtDrawerModeHover(App, {
    moduleKey: 2,
    isBottom: true,
    kind: 'ext_drawers',
    op: 'add',
    drawerCount: 3,
  });

  assert.equal(Object.hasOwn(hover, 'moduleKey'), false);
  assert.equal(Object.hasOwn(hover, 'isBottom'), false);
  assert.equal(hover.hostModuleKey, 2);
  assert.equal(hover.hostIsBottom, true);
  assert.equal(readRecentExtDrawerModeHover(App), hover);
  assert.equal(extDrawerModeHoverMatchesModule(hover, 2), true);
  assert.equal(extDrawerModeHoverMatchesModule(hover, '2'), true);
  assert.equal(extDrawerModeHoverMatchesModule(hover, 3), false);
  assert.equal(extDrawerModeHoverMatchesModule(hover, null), false);
});

test('external drawer hover rejects mixed retired identity instead of treating a null key as a wildcard', () => {
  const mixedHover = {
    ts: Date.now(),
    tool: 'ext_drawer_mode',
    moduleKey: null,
    isBottom: false,
    hostModuleKey: 4,
    hostIsBottom: false,
    kind: 'drawers',
    op: 'remove',
  } as never;

  assert.equal(extDrawerModeHoverMatchesModule(mixedHover, 4), false);
  assert.equal(extDrawerModeHoverMatchesModule(mixedHover, null), false);
});
