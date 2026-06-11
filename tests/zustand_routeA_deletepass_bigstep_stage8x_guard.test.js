import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { bundleSources } from './_source_bundle.js';

const stateApi = fs.readFileSync(new URL('../esm/native/kernel/state_api.ts', import.meta.url), 'utf8');
const stateApiConfigNamespace = [
  fs.readFileSync(new URL('../esm/native/kernel/state_api_config_namespace.ts', import.meta.url), 'utf8'),
  fs.readFileSync(
    new URL('../esm/native/kernel/state_api_config_namespace_core.ts', import.meta.url),
    'utf8'
  ),
  fs.readFileSync(
    new URL('../esm/native/kernel/state_api_config_namespace_scalars.ts', import.meta.url),
    'utf8'
  ),
].join('\n');
const mapsApi = bundleSources(
  [
    '../esm/native/kernel/maps_api.ts',
    '../esm/native/kernel/maps_api_shared.ts',
    '../esm/native/kernel/maps_api_named_maps.ts',
    '../esm/native/kernel/maps_api_saved_colors.ts',
  ],
  import.meta.url
);

test('[routeA delete-pass] actions.setCfgScalar is canonical commit-only (no cfg facade bounce)', () => {
  assert.match(stateApi, /installStateApiConfigNamespace\(\{/);
  assert.match(stateApiConfigNamespace, /actions\.setCfgScalar = function setCfgScalar/);
  assert.match(stateApiConfigNamespace, /configNs\.captureSnapshot\?\.\(\)/);
  assert.match(stateApiConfigNamespace, /return commitConfigWrite\(commitConfigPatch, o, meta\);/);
  assert.doesNotMatch(stateApiConfigNamespace, /callCfgCompat\('setScalar', key, valueOrFn, meta\)/);
});

test('[routeA delete-pass] maps_api config writes route through runtime cfg_access (no local applyConfig probe)', () => {
  assert.match(mapsApi, /patchConfigMap/);
  assert.match(mapsApi, /setCfgSavedColors/);
  assert.match(mapsApi, /setCfgColorSwatchesOrder/);
  assert.doesNotMatch(mapsApi, /applyConfigPatch/);
  assert.doesNotMatch(mapsApi, /from '\.\/config_write\.js'/);
  assert.match(
    mapsApi,
    /All writes route through runtime\/cfg_access helpers \(patchConfigMap \/ cfgSetScalar\)\./
  );
  assert.doesNotMatch(mapsApi, /maps\.commitConfigPatch\.applyConfig/);
  assert.doesNotMatch(mapsApi, /const applyConfig = actions \? actions\['applyConfig'\] : null/);
});
