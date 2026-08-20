import test from 'node:test';
import assert from 'node:assert/strict';
import { readFirstExisting } from './_read_src.js';
import { getFunctionSignatureFact, getInterfaceFact } from './_semantic_source_contracts.js';

const kernelTypes = readFirstExisting(['../types/kernel.ts'], import.meta.url);
const metaContract = readFirstExisting(['../esm/native/runtime/action_meta_contract.ts'], import.meta.url);
const stateApiShared = readFirstExisting(['../esm/native/kernel/state_api_shared.ts'], import.meta.url);
const metaProfiles = readFirstExisting(['../esm/native/runtime/meta_profiles_contract.ts'], import.meta.url);
const storeContract = readFirstExisting(['../esm/native/platform/store_contract.ts'], import.meta.url);
const storeMetaContract = readFirstExisting(
  ['../esm/native/platform/store_action_meta_contract.ts'],
  import.meta.url
);
const storeCommitPipeline = readFirstExisting(
  ['../esm/native/platform/store_commit_pipeline.ts'],
  import.meta.url
);
const storeStateTypes = readFirstExisting(['../types/store_state.ts'], import.meta.url);
const snapshotContracts = readFirstExisting(
  ['../esm/native/kernel/kernel_snapshot_store_contracts.ts'],
  import.meta.url
);
const backendStoreTypes = readFirstExisting(['../types/backend_store.ts'], import.meta.url);
const runtimeTypes = readFirstExisting(['../types/runtime.ts'], import.meta.url);
const doorsAccess = readFirstExisting(['../esm/native/runtime/doors_access_doors.ts'], import.meta.url);

test('action meta vocabulary stays closed at both canonical and public action boundaries', () => {
  assert.deepEqual(getInterfaceFact(kernelTypes, 'CanonicalActionMetaLike', 'types/kernel.ts'), {
    name: 'CanonicalActionMetaLike',
    extends: [],
    properties: [
      ['source', 'string'],
      ['reason', 'string'],
      ['silent', 'boolean'],
      ['immediate', 'boolean'],
      ['noBuild', 'boolean'],
      ['noAutosave', 'boolean'],
      ['noPersist', 'boolean'],
      ['noHistory', 'boolean'],
      ['noCapture', 'boolean'],
      ['forceBuild', 'boolean'],
      ['force', 'boolean'],
      ['uiOnly', 'boolean'],
      ['captureConfig', 'boolean'],
      ['noStorageWrite', 'boolean'],
      ['coalesceKey', 'string'],
      ['coalesceMs', 'number'],
      ['coalesceAcrossIdle', 'boolean'],
      ['resetDefault', 'boolean'],
      ['preserveAutosave', 'boolean'],
      ['preserveAutosaveOnLoad', 'boolean'],
      ['autosavePolicy', '"preserve-existing"'],
      ['traceStorePatch', 'boolean'],
      ['debugName', 'string'],
      ['diagnostics', 'UnknownRecord'],
      ['extensions', 'UnknownRecord'],
    ].map(([name, type]) => ({ name, optional: true, readonly: false, type })),
  });
  assert.deepEqual(getInterfaceFact(kernelTypes, 'ActionMetaLike', 'types/kernel.ts'), {
    name: 'ActionMetaLike',
    extends: ['CanonicalActionMetaLike'],
    properties: [],
  });
  const backendStore = getInterfaceFact(backendStoreTypes, 'BackendStoreLike', 'types/backend_store.ts');
  assert.equal(
    backendStore?.properties.find(property => property.name === 'patch')?.type,
    'fn(payload:StorePatchPayload|UnknownRecord,meta?:ActionMetaLike,opts?:DispatchOptionsLike)->unknown'
  );
});

test('canonical meta owners normalize through one runtime boundary', () => {
  assert.match(metaContract, /export function normalizeCanonicalActionMeta\(/);
  assert.match(metaContract, /export function mergeCanonicalActionMeta\(/);
  assert.match(metaContract, /satisfies CanonicalActionMetaSchemaLike/);
  assert.match(storeMetaContract, /satisfies CanonicalActionMetaSchemaLike/);
  assert.match(storeMetaContract, /export function normalizeStoreActionMetaInput\(/);
  assert.match(stateApiShared, /normalizeCanonicalActionMeta\(meta\)/);
  assert.match(stateApiShared, /mergeCanonicalActionMeta\(meta, defaults, defaultSource\)/);
  assert.match(metaProfiles, /return mergeCanonicalActionMeta\(meta, defaults, defaultSource\);/);
  assert.match(storeContract, /const out = normalizeStoreActionMetaInput\(meta\);/);
  assert.match(snapshotContracts, /KernelSnapshotStoreMetaLike extends ActionMetaLike/);
  assert.doesNotMatch(metaProfiles, /for \(const key of Object\.keys\(defaultsRecord\)\)/);
});

test('store observation metadata stays separate from behavior-changing action metadata', () => {
  assert.deepEqual(getInterfaceFact(storeStateTypes, 'StoreLastActionLike', 'types/store_state.ts'), {
    name: 'StoreLastActionLike',
    extends: ['CanonicalActionMetaLike'],
    properties: [
      ['type', 'string'],
      ['affectsConfig', 'boolean'],
      ['affectsUi', 'boolean'],
      ['affectsRuntime', 'boolean'],
      ['affectsMode', 'boolean'],
      ['affectsMeta', 'boolean'],
      ['ts', 'number'],
    ].map(([name, type]) => ({ name, optional: false, readonly: false, type })),
  });
  assert.match(storeCommitPipeline, /const stamped: StoreLastActionLike = \{/);
  const canonicalPropertyNames = new Set(
    getInterfaceFact(kernelTypes, 'CanonicalActionMetaLike', 'types/kernel.ts').properties.map(
      property => property.name
    )
  );
  for (const observationKey of ['type', 'affectsConfig', 'ts']) {
    assert.equal(canonicalPropertyNames.has(observationKey), false);
  }
});

test('door service options stay separate from behavior-changing action metadata', () => {
  assert.deepEqual(getInterfaceFact(runtimeTypes, 'DoorsSetOpenOptionsLike', 'types/runtime.ts'), {
    name: 'DoorsSetOpenOptionsLike',
    extends: ['ActionMetaLike'],
    properties: [
      ['touch', 'boolean'],
      ['forceUpdate', 'boolean'],
      ['hardCloseDoors', 'boolean'],
      ['hardClose', 'boolean'],
      ['slidingHideOpen', 'boolean'],
    ].map(([name, type]) => ({ name, optional: true, readonly: false, type })),
  });
  assert.deepEqual(getFunctionSignatureFact(doorsAccess, 'setDoorsOpenViaService', 'doors_access_doors.ts'), {
    name: 'setDoorsOpenViaService',
    async: false,
    params: [
      { name: 'App', optional: false, type: 'unknown' },
      { name: 'open', optional: false, type: 'boolean' },
      { name: 'opts', optional: true, type: 'DoorsSetOpenOptionsLike' },
    ],
    returnType: 'boolean',
  });
  const canonicalPropertyNames = new Set(
    getInterfaceFact(kernelTypes, 'CanonicalActionMetaLike', 'types/kernel.ts').properties.map(
      property => property.name
    )
  );
  assert.equal(canonicalPropertyNames.has('touch'), false);
  assert.equal(canonicalPropertyNames.has('forceUpdate'), false);
});
