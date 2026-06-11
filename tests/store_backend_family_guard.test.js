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
