import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll } from './_source_bundle.js';

const domainBundle = bundleSources(
  ['../esm/native/kernel/domain_api.ts', '../esm/native/kernel/domain_api_modules_corner.ts'],
  import.meta.url
);
const stackRouter = bundleSources(
  [
    '../esm/native/kernel/state_api_stack_router.ts',
    '../esm/native/kernel/state_api_stack_router_patch.ts',
    '../esm/native/kernel/state_api_stack_router_shared.ts',
  ],
  import.meta.url
);

test('[stageA] corner root patch delegates remain marked in domain bundle and skipped by state stack router', () => {
  assertMatchesAll(
    assert,
    domainBundle,
    [
      /markDelegatesStackPatch\(cornerActions\.patch\);/,
      /markDelegatesStackPatch\(cornerActions\.patchLower\);/,
    ],
    'domainBundle'
  );

  assertMatchesAll(
    assert,
    stackRouter,
    [
      /if \(typeof fnLower === 'function' && !isDelegatingStackPatchFn\(fnLower\)\) \{/,
      /if \(typeof fnTop === 'function' && !isDelegatingStackPatchFn\(fnTop\)\) \{/,
    ],
    'stackRouter'
  );
});
