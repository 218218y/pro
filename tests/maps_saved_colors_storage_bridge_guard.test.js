import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource } from './_source_bundle.js';

const mapsOwner = readSource('../esm/native/kernel/maps_api.ts', import.meta.url);
const mapsBundle = bundleSources(
  [
    '../esm/native/kernel/maps_api.ts',
    '../esm/native/kernel/maps_api_shared.ts',
    '../esm/native/kernel/maps_api_named_maps.ts',
    '../esm/native/kernel/maps_api_saved_colors.ts',
  ],
  import.meta.url
);

test('maps_api commits savedColors through the canonical collections repository', () => {
  assert.match(mapsOwner, /maps_api_saved_colors\.js/);
  assert.match(mapsBundle, /updateCloudCollectionsViaServiceOrThrow\(/);
  assert.match(mapsBundle, /\{ savedColors \}/);
  assert.doesNotMatch(mapsBundle, /writeStorageJson/);
});

test('maps_api commits color order through the same canonical repository', () => {
  assert.match(mapsBundle, /\{ colorOrder \}/);
  assert.doesNotMatch(mapsBundle, /SAVED_COLORS|:order/);
});

test('maps_api respects noStorageWrite to avoid cloud-pull write loops', () => {
  assert.match(mapsBundle, /if \(!shouldSkipStorageWrite\(meta\)\)/);
  assert.match(mapsBundle, /return !!m\.noStorageWrite/);
});
