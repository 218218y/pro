import test from 'node:test';
import assert from 'node:assert/strict';
import { assertMatchesAll, readSource } from './_source_bundle.js';
import {
  getCallFacts,
  getFunctionSignatureFact,
  getInterfaceFact,
  getVariableInitializerFact,
} from './_semantic_source_contracts.js';

test('doors transient meta fallback stays aligned with the shared contract', () => {
  const metaActionsNamespace = readSource('../esm/native/runtime/meta_actions_namespace.ts');
  const contract = readSource('../esm/native/runtime/meta_profiles_contract.ts');
  const kernelTypes = readSource('../types/kernel.ts');
  const transientDefaults = getVariableInitializerFact(
    contract,
    'META_PROFILE_DEFAULTS_TRANSIENT',
    'meta_profiles_contract.ts'
  );
  assert.deepEqual(transientDefaults, {
    kind: 'object',
    properties: {
      noBuild: { kind: 'literal', value: true },
      noAutosave: { kind: 'literal', value: true },
      noPersist: { kind: 'literal', value: true },
      noHistory: { kind: 'literal', value: true },
      noCapture: { kind: 'literal', value: true },
    },
    spreads: [],
  });
  assert.deepEqual(
    getFunctionSignatureFact(contract, 'buildMetaUiOnlyImmediate', 'meta_profiles_contract.ts'),
    {
      name: 'buildMetaUiOnlyImmediate',
      async: false,
      params: [{ name: 'source', optional: true, type: 'string' }],
      returnType: 'ActionMetaLike',
    }
  );
  assert.ok(
    getCallFacts(contract, 'mergeMetaProfileDefaults', 'meta_profiles_contract.ts').some(call => {
      const [, defaults] = call.args;
      return defaults?.kind === 'identifier' && defaults.name === 'META_PROFILE_DEFAULTS_UI_ONLY';
    }),
    'ui-only immediate profile should merge the canonical UI-only defaults'
  );

  assertMatchesAll(
    assert,
    metaActionsNamespace,
    [/META_PROFILE_DEFAULTS_TRANSIENT as META_STUB_TRANSIENT/],
    'meta_actions_namespace'
  );
  const stub = getVariableInitializerFact(
    metaActionsNamespace,
    'META_ACTIONS_STUB',
    'meta_actions_namespace.ts'
  );
  assert.equal(stub?.kind, 'object');
  assert.deepEqual(stub?.properties?.transient, {
    kind: 'function',
    name: null,
    async: false,
    params: [
      { name: 'meta', optional: true, type: 'ActionMetaLike' },
      { name: 'source', optional: true, type: 'string' },
    ],
    returnType: 'ActionMetaLike',
  });
  assert.deepEqual(stub?.properties?.uiOnlyImmediate, {
    kind: 'function',
    name: null,
    async: false,
    params: [{ name: 'source', optional: true, type: 'string' }],
    returnType: 'ActionMetaLike',
  });
  assert.ok(
    getCallFacts(metaActionsNamespace, 'mergeMetaProfile', 'meta_actions_namespace.ts').some(call => {
      const [meta, defaults, source] = call.args;
      return (
        meta?.kind === 'identifier' &&
        meta.name === 'meta' &&
        defaults?.kind === 'identifier' &&
        defaults.name === 'META_STUB_TRANSIENT' &&
        source?.kind === 'identifier' &&
        source.name === 'source'
      );
    }),
    'transient meta stub should merge META_STUB_TRANSIENT'
  );
  assert.ok(
    getCallFacts(metaActionsNamespace, 'buildMetaUiOnlyImmediate', 'meta_actions_namespace.ts').some(
      call => call.args[0]?.kind === 'identifier' && call.args[0].name === 'source'
    ),
    'uiOnlyImmediate stub should delegate to buildMetaUiOnlyImmediate'
  );

  const metaActions = getInterfaceFact(kernelTypes, 'MetaActionsNamespaceLike', 'types/kernel.ts');
  const metaProps = new Map(metaActions?.properties.map(property => [property.name, property]));
  assert.equal(metaProps.get('transient')?.type, 'fn(meta?:ActionMetaLike,source?:string)->ActionMetaLike');
  assert.equal(metaProps.get('uiOnlyImmediate')?.type, 'fn(source?:string)->ActionMetaLike');
});
