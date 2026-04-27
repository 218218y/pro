import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureDoorTrimMaterialCache,
  getDoorTrimVisualsServiceMaybe,
} from '../esm/native/runtime/door_trim_visuals_access.js';

test('door trim visuals cache is created only under the canonical service slot', () => {
  const App: Record<string, unknown> = {};

  const cache = ensureDoorTrimMaterialCache(App);
  assert.equal(Object.getPrototypeOf(cache), null);
  assert.equal(cache.nickel, undefined);
  cache.nickel = { id: 'm1' };
  assert.equal(getDoorTrimVisualsServiceMaybe(App)?.materialCache, cache);
  assert.equal('__doorTrimMaterialCache' in App, false);
});
