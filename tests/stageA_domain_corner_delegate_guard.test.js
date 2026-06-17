import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, assertLacksAll, assertMatchesAll } from './_source_bundle.js';

const domainBundle = bundleSources(
  [
    '../esm/native/kernel/domain_api.ts',
    '../esm/native/kernel/domain_api_modules_corner.ts',
    '../esm/native/kernel/domain_api_modules_corner_selectors.ts',
    '../esm/native/kernel/domain_api_modules_corner_module_patch.ts',
    '../esm/native/kernel/domain_api_modules_corner_corner_patch.ts',
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

test('[stageA] domain aliases delegate one-way into the canonical stack router without marker cycles', () => {
  assertMatchesAll(
    assert,
    domainBundle,
    [/requireEnsureForStack/, /patchCanonicalStack/, /patchCornerForStack/],
    'domainBundle'
  );

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
      /cornerNs\[/,
      /modulesNs\['ensure/,
    ],
    'one-way stack routing'
  );
});
