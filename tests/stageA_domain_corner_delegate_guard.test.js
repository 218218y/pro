import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, assertLacksAll, assertMatchesAll } from './_source_bundle.js';

const domainBundle = bundleSources(
  [
    '../esm/native/kernel/domain_api.ts',
    '../esm/native/kernel/domain_api_modules_corner.ts',
    '../esm/native/kernel/domain_api_modules_corner_selectors.ts',
  ],
  import.meta.url
);
const stackRouter = bundleSources(
  [
    '../esm/native/kernel/state_api_stack_router.ts',
    '../esm/native/kernel/state_api_stack_router_ensure.ts',
    '../esm/native/kernel/state_api_stack_router_patch.ts',
    '../esm/native/kernel/state_api_stack_router_shared.ts',
  ],
  import.meta.url
);

test('[stageA] canonical stack routing has no domain aliases, reverse lookup, or marker cycles', () => {
  assertMatchesAll(
    assert,
    stackRouter,
    [/ensureCornerCellDirect\(ctx, stackNorm, cornerCellIdx\)/, /patchCornerRootDirect\(stackNorm/],
    'stackRouter'
  );

  assertLacksAll(
    assert,
    `${domainBundle}\n${stackRouter}`,
    [
      /__wp_delegatesStackPatch/,
      /markDelegatesStackPatch/,
      /isDelegatingStackPatchFn/,
      /requireEnsureForStack/,
      /patchCanonicalStack/,
      /patchCornerForStack/,
      /cornerNs\[/,
      /modulesNs\['ensure/,
    ],
    'one-way stack routing'
  );
  assertLacksAll(
    assert,
    domainBundle,
    [/ensureAt\s*=/, /ensureLowerAt\s*=/, /modulesActions\.patchAt\s*=/, /cornerActions\.patchCellAt\s*=/],
    'retired domain aliases'
  );
});
