import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource } from './_source_bundle.js';

const ownerSource = readSource('../esm/native/kernel/domain_api_modules_corner.ts', import.meta.url);
const src = bundleSources(
  [
    '../esm/native/kernel/domain_api_modules_corner.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_shared.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_template.ts',
    '../esm/native/kernel/domain_api_modules_corner_shared.ts',
  ],
  import.meta.url
);

test('domain modules corner uses cloneModuleConfig helper instead of ModuleCfgItem assertions', () => {
  assert.match(ownerSource, /domain_api_modules_corner_shared\.js/);
  assert.match(src, /function cloneModuleConfig\(/);
  assert.doesNotMatch(src, /\sas ModuleCfgItem/);
  assert.match(src, /return cloneModuleConfig\(dst, prevCloned, index, doors\);/);
  assert.match(src, /export function setDefaultModuleLayout\([\s\S]*?layout:/);
});
