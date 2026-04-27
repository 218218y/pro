import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource } from './_source_bundle.js';

const ownerSource = readSource('../esm/native/kernel/domain_api_modules_corner.ts', import.meta.url);
const source = bundleSources(
  [
    '../esm/native/kernel/domain_api_modules_corner.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_shared.ts',
    '../esm/native/kernel/domain_api_modules_corner_recompute_template.ts',
  ],
  import.meta.url
);

test('library mode recompute seeds library defaults for added modules instead of regular wardrobe alternation', () => {
  assert.match(ownerSource, /domain_api_modules_corner_recompute\.js/);
  assert.match(
    source,
    /import \{ createLibraryTopModuleConfig \} from '\.\.\/features\/library_preset\/module_defaults\.js';/
  );
  assert.match(source, /isLibraryMode:\s*!!cfg\.isLibraryMode/);
  assert.match(
    source,
    /if \(runtime\.isLibraryMode\) \{[\s\S]*return createLibraryTopModuleConfig\(doors\);[\s\S]*\}/
  );
  assert.match(source, /if \(!runtime\.isLibraryMode && newLen > oldLen\) \{/);
});
