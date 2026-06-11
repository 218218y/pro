import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contract = fs.readFileSync(
  new URL('../esm/native/runtime/meta_profiles_contract.ts', import.meta.url),
  'utf8'
);
const metaActionsNamespace = fs.readFileSync(
  new URL('../esm/native/runtime/meta_actions_namespace.ts', import.meta.url),
  'utf8'
);
const actionsAccessShared = fs.readFileSync(
  new URL('../esm/native/runtime/actions_access_shared.ts', import.meta.url),
  'utf8'
);
const metaProfiles = fs.readFileSync(
  new URL('../esm/native/runtime/meta_profiles_access.ts', import.meta.url),
  'utf8'
);

test('[meta-contract] runtime meta helpers share a canonical fallback contract', () => {
  assert.match(
    contract,
    /export const META_PROFILE_DEFAULTS_TRANSIENT: ActionMetaLike = \{[\s\S]*noBuild: true,[\s\S]*noAutosave: true,[\s\S]*noPersist: true,[\s\S]*noHistory: true,[\s\S]*noCapture: true,[\s\S]*\};/
  );
  assert.match(
    contract,
    /export function buildMetaNoHistoryForceBuildImmediate\(source\?: string\): ActionMetaLike/
  );
  assert.match(metaActionsNamespace, /from '\.\/meta_profiles_contract\.js';/);
  assert.match(metaActionsNamespace, /META_PROFILE_DEFAULTS_TRANSIENT as META_STUB_TRANSIENT/);
  assert.match(actionsAccessShared, /from '\.\/meta_actions_namespace\.js';/);
  assert.match(metaProfiles, /from '\.\/meta_profiles_contract\.js';/);
  assert.match(metaProfiles, /mergeMetaProfileDefaults/);
});
