import test from 'node:test';
import assert from 'node:assert/strict';
import { assertMatchesAll, readSource } from './_source_bundle.js';

test('doors transient meta fallback stays aligned with the shared contract', () => {
  const metaActionsNamespace = readSource('../esm/native/runtime/meta_actions_namespace.ts');
  const contract = readSource('../esm/native/runtime/meta_profiles_contract.ts');
  assertMatchesAll(
    assert,
    contract,
    [
      /export const META_PROFILE_DEFAULTS_TRANSIENT: ActionMetaLike = \{[\s\S]*noBuild: true,[\s\S]*noAutosave: true,[\s\S]*noPersist: true,[\s\S]*noHistory: true,[\s\S]*noCapture: true,[\s\S]*\};/,
      /export function buildMetaUiOnlyImmediate\(source\?: string\): ActionMetaLike \{[\s\S]*META_PROFILE_DEFAULTS_UI_ONLY[\s\S]*\}/,
    ],
    'meta_profiles_contract'
  );
  assertMatchesAll(
    assert,
    metaActionsNamespace,
    [
      /META_PROFILE_DEFAULTS_TRANSIENT as META_STUB_TRANSIENT/,
      /transient\(meta\?: ActionMetaLike, source\?: string\): ActionMetaLike \{\s*return mergeMetaProfile\(meta, META_STUB_TRANSIENT, source\);\s*\}/,
      /uiOnlyImmediate\(source\?: string\): ActionMetaLike \{\s*return buildMetaUiOnlyImmediate\(source\);\s*\}/,
    ],
    'meta_actions_namespace'
  );
});
