import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
}

const owner = read('../esm/native/platform/store.ts');
const shared = read('../esm/native/platform/store_shared.ts');
const commitPipeline = read('../esm/native/platform/store_commit_pipeline.ts');
const patchApply = read('../esm/native/platform/store_patch_apply.ts');
const subscriptions = read('../esm/native/platform/store_subscriptions.ts');
const capability = read('../esm/native/runtime/store_config_map_write_capability.ts');
const cfgAccessCore = read('../esm/native/runtime/cfg_access_core.ts');
const stateApiInstallSupport = read('../esm/native/kernel/state_api_install_support.ts');
const kernelInstallSupport = read('../esm/native/kernel/kernel_install_support.ts');
const publicStateTypes = read('../types/state.ts');
const backendStoreTypes = read('../types/backend_store.ts');
const typeHardeningAudit = read('../tools/wp_type_hardening_audit.mjs');

const rawCapabilityExportPatterns = [
  /\bexport\s+const\s+STORE_CONFIG_MAP_WRITE_CAPABILITY\b/,
  /\bexport\s*\{[^}]*\bSTORE_CONFIG_MAP_WRITE_CAPABILITY\b[^}]*\}/,
  /\bexport\s+default\s+STORE_CONFIG_MAP_WRITE_CAPABILITY\b/,
];

test('store backend family stays split across owner/shared/commit/patch/subscription seams', () => {
  assert.match(owner, /from '\.\/store_shared\.js';/);
  assert.match(owner, /from '\.\/store_commit_pipeline\.js';/);
  assert.match(owner, /from '\.\/store_subscriptions\.js';/);
  assert.match(owner, /export function createStore\(opts: StoreCreateOpts = \{\}\): StoreCreateResult/);
  assert.doesNotMatch(owner, /function commitNextState\(/);
  assert.doesNotMatch(owner, /function patchRoot\(/);
  assert.doesNotMatch(owner, /function replaceRoot\(/);
  assert.doesNotMatch(owner, /function deepMerge\(/);
  assert.doesNotMatch(owner, /function createListenerRegistry<T>\(/);
  assert.doesNotMatch(owner, /function createSelectorRegistryEntry<T>\(/);

  assert.match(shared, /export function normalizeHelperMeta\(/);
  assert.match(shared, /export function recordDebugPatchStat\(/);
  assert.match(shared, /export function cloneMetaForWrite\(/);
  assert.match(shared, /export function storeValueEqual\(/);
  assert.match(shared, /export function storeMetaValueEqual\(/);

  assert.match(commitPipeline, /export function createStoreCommitPipeline\(/);
  assert.match(commitPipeline, /function commitNextState\(/);
  assert.match(commitPipeline, /function patchRoot\(/);
  assert.match(commitPipeline, /function replaceRoot\(/);
  assert.match(commitPipeline, /function isNoopReplacedRoot\(/);

  assert.match(patchApply, /function deepMerge\(/);
  assert.match(patchApply, /export function applyConfigPatch\(/);
  assert.match(patchApply, /export function applyModePatchSlice\(/);

  assert.match(subscriptions, /export function createListenerRegistry<T>\(\)/);
  assert.match(subscriptions, /export function createSelectorRegistryEntry<T>\(/);
});

test('store backend known config map writes require owner capability, not meta source', () => {
  assert.match(capability, /const STORE_CONFIG_MAP_WRITE_CAPABILITY = Symbol/);
  for (const pattern of rawCapabilityExportPatterns) {
    assert.doesNotMatch(capability, pattern);
  }
  assert.match(capability, /isKnownMapName/);
  assert.match(capability, /hasStoreConfigMapWriteCapability\(opts\)/);
  assert.doesNotMatch(capability, /\bsource\b/);
  assert.match(typeHardeningAudit, /rawCapabilityExportPatterns/);
  assert.match(typeHardeningAudit, /export\\s\+default\\s\+STORE_CONFIG_MAP_WRITE_CAPABILITY/);
  assert.match(typeHardeningAudit, /export\\s\*\\\{/);

  assert.match(commitPipeline, /assertStoreConfigMapWriteAllowed\(pld\.config, configApiName, opts2\)/);
  assert.match(patchApply, /assertStoreConfigMapWriteAllowed\(configPatch, 'applyConfigPatch', opts\)/);

  assert.match(cfgAccessCore, /withStoreConfigMapWriteCapability/);
  assert.match(stateApiInstallSupport, /withStoreConfigMapWriteCapability/);
  assert.match(kernelInstallSupport, /withStoreConfigMapWriteCapability/);
});

test('store root replacement stays a backend snapshot boundary', () => {
  assert.match(backendStoreTypes, /Snapshot\/parity tooling only; not for UI\/service\/domain callers\./);
  assert.match(backendStoreTypes, /\bsetRoot\?:/);
  assert.doesNotMatch(publicStateTypes, /\bsetRoot\b/);
  assert.match(typeHardeningAudit, /setRoot\|replaceRoot/);
  assert.match(
    typeHardeningAudit,
    /raw store\.patch\/store\.setConfig\/store\.setRoot\/store\.replaceRoot write outside backend boundary/
  );
});
