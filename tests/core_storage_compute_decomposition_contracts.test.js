import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const storageFacade = readSource('../esm/native/builder/core_storage_compute.ts', import.meta.url);
const externalOwner = readSource(
  '../esm/native/builder/core_storage_compute_external_drawers.ts',
  import.meta.url
);
const customOwner = readSource('../esm/native/builder/core_storage_compute_custom.ts', import.meta.url);
const internalOwner = readSource(
  '../esm/native/builder/core_storage_compute_internal_drawers.ts',
  import.meta.url
);

test('[core-storage-compute] storage facade stays thin while focused owners keep drawer/custom math isolated', () => {
  assertMatchesAll(
    assert,
    storageFacade,
    [
      /core_storage_compute_external_drawers\.js/,
      /core_storage_compute_custom\.js/,
      /core_storage_compute_internal_drawers\.js/,
    ],
    'storageFacade'
  );
  assertLacksAll(
    assert,
    storageFacade,
    [
      /export function computeExternalDrawersOpsForModule\(/,
      /export function computeInteriorCustomOps\(/,
      /export function computeInternalDrawersOpsForSlot\(/,
    ],
    'storageFacade'
  );
  assertMatchesAll(
    assert,
    externalOwner,
    [/export function computeExternalDrawersOpsForModule\(/],
    'externalOwner'
  );
  assertMatchesAll(assert, customOwner, [/export function computeInteriorCustomOps\(/], 'customOwner');
  assertMatchesAll(
    assert,
    internalOwner,
    [/export function computeInternalDrawersOpsForSlot\(/],
    'internalOwner'
  );
});
