import test from 'node:test';
import assert from 'node:assert/strict';
import { readFirstExisting } from './_read_src.js';

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
  const canonicalBlock = kernelTypes.match(/export interface CanonicalActionMetaLike \{[\s\S]*?\n\}/)?.[0];
  assert.ok(canonicalBlock, 'CanonicalActionMetaLike should exist');
  assert.doesNotMatch(canonicalBlock, /\[k:\s*string\]/);
  assert.match(canonicalBlock, /immediate\?: boolean;/);
  assert.match(canonicalBlock, /forceBuild\?: boolean;/);
  assert.match(canonicalBlock, /noStorageWrite\?: boolean;/);
  assert.match(canonicalBlock, /coalesceAcrossIdle\?: boolean;/);
  assert.match(canonicalBlock, /preserveAutosave\?: boolean;/);
  assert.match(canonicalBlock, /diagnostics\?: UnknownRecord;/);
  assert.match(canonicalBlock, /extensions\?: UnknownRecord;/);

  assert.match(kernelTypes, /export interface ActionMetaLike extends CanonicalActionMetaLike \{\}/);
  assert.doesNotMatch(
    kernelTypes,
    /export interface ActionMetaLike extends CanonicalActionMetaLike,?\s*UnknownRecord/
  );
  assert.doesNotMatch(backendStoreTypes, /meta\?: ActionMetaLike \| UnknownRecord/);
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
  assert.match(storeStateTypes, /export interface StoreLastActionLike extends CanonicalActionMetaLike/);
  assert.match(storeStateTypes, /type: string;/);
  assert.match(storeStateTypes, /affectsConfig: boolean;/);
  assert.match(storeStateTypes, /ts: number;/);
  assert.match(storeCommitPipeline, /const stamped: StoreLastActionLike = \{/);
  const canonicalBlock =
    kernelTypes.match(/export interface CanonicalActionMetaLike \{[\s\S]*?\n\}/)?.[0] || '';
  assert.doesNotMatch(canonicalBlock, /\btype\?:/);
  assert.doesNotMatch(canonicalBlock, /\baffectsConfig\?:/);
  assert.doesNotMatch(canonicalBlock, /\bts\?:/);
});

test('door service options stay separate from behavior-changing action metadata', () => {
  assert.match(runtimeTypes, /export interface DoorsSetOpenOptionsLike extends ActionMetaLike/);
  assert.match(runtimeTypes, /touch\?: boolean;/);
  assert.match(runtimeTypes, /forceUpdate\?: boolean;/);
  assert.match(
    doorsAccess,
    /setDoorsOpenViaService\(App: unknown, open: boolean, opts\?: DoorsSetOpenOptionsLike\)/
  );
  const canonicalBlock =
    kernelTypes.match(/export interface CanonicalActionMetaLike \{[\s\S]*?\n\}/)?.[0] || '';
  assert.doesNotMatch(canonicalBlock, /\btouch\?:/);
  assert.doesNotMatch(canonicalBlock, /\bforceUpdate\?:/);
});
