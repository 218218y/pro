import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveSketchDoorStyle,
  resolveSketchDoorStyleMap,
} from '../esm/native/builder/render_interior_sketch_input_contract.ts';
import { resolveSketchGroovesEnabled } from '../esm/native/builder/render_interior_sketch_grooves_visibility.ts';
import { hasSketchDrawerDivider } from '../esm/native/builder/render_interior_sketch_drawer_dividers.ts';

function createCanonicalInput() {
  return {
    App: {},
    cfgSnapshot: {
      doorStyleMap: { drawer_1: 'profile' },
      drawerDividersMap: { drawer_1: false },
    },
    sketchExtras: {},
    doorStyle: 'flat',
    isGroovesEnabled: false,
    isInternalDrawersEnabled: true,
    // Deliberately conflicting retired shapes. Canonical readers must ignore them.
    cfg: {
      doorStyleMap: { drawer_1: 'double_profile' },
      drawerDividersMap: { drawer_1: true },
    },
    config: { doorStyle: 'profile' },
    ui: { doorStyle: 'double_profile', groovesEnabled: true },
    groovesEnabled: true,
  } as never;
}

test('interior sketch style, feature flags, and divider state read only canonical input fields', () => {
  const input = createCanonicalInput();

  assert.equal(resolveSketchDoorStyle(input), 'flat');
  assert.equal(resolveSketchDoorStyleMap(input).drawer_1, 'profile');
  assert.equal(resolveSketchGroovesEnabled(input), false);
  assert.equal(hasSketchDrawerDivider({ input, partId: 'drawer_1' }), false);
});

test('interior sketch input contract fails fast when the config snapshot is missing', () => {
  assert.throws(
    () =>
      resolveSketchDoorStyleMap({
        doorStyle: 'flat',
        isGroovesEnabled: true,
        isInternalDrawersEnabled: true,
      } as never),
    /cfgSnapshot is required/
  );
});
