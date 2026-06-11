import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDomainSelectSurface,
  ensureDomainApiInstallState,
  isDomainApiInstalled,
  readDomainApiInstallState,
} from '../esm/native/kernel/domain_api_install_state.ts';

test('domain api install state stores its marker in the canonical services slot', () => {
  const App: any = {};

  assert.equal(readDomainApiInstallState(App), null);
  assert.equal(isDomainApiInstalled(App), false);

  const state = ensureDomainApiInstallState(App);
  assert.equal(state.installed, undefined);
  assert.ok(App.services);
  assert.equal(App.services.domainApi, state);

  state.installed = true;

  assert.equal(readDomainApiInstallState(App), state);
  assert.equal(ensureDomainApiInstallState(App), state);
  assert.equal(isDomainApiInstalled(App), true);
});

test('domain api install state creates the full select surface shape up front', () => {
  const select = createDomainSelectSurface() as Record<string, unknown>;

  assert.deepEqual(Object.keys(select).sort(), [
    'colors',
    'corner',
    'curtains',
    'dividers',
    'doors',
    'drawers',
    'flags',
    'grooves',
    'modules',
    'room',
    'textures',
    'view',
  ]);

  for (const key of Object.keys(select)) {
    assert.deepEqual(select[key], {});
  }
});
