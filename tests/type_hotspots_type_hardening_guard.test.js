import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('type hotspot hardening avoids double-casts in runtime/platform seams', () => {
  const actionsCore = read('esm/native/runtime/actions_access_core.ts');
  const renderState = [
    read('esm/native/runtime/render_access_state.ts'),
    read('esm/native/runtime/render_access_state_bags.ts'),
  ].join('\n');
  const cachePruning = [
    read('esm/native/platform/cache_pruning.ts'),
    read('esm/native/platform/cache_pruning_shared.ts'),
    read('esm/native/platform/cache_pruning_runtime.ts'),
  ].join('\n');
  const geomPatchContracts = read('esm/native/platform/three_geometry_cache_patch_contracts.ts');

  assert.doesNotMatch(actionsCore, /as ActionNode \| null/);
  assert.match(
    actionsCore,
    /function bindActionBinding<T extends ActionAccessFn>\(binding: SharedActionBinding<T>\): ActionBinding<T>/
  );

  assert.match(renderState, /function ensureOwnedBag<T extends UnknownRecord>/);
  assert.match(
    renderState,
    /function isRenderCacheMapsBag\(value: RenderCacheBag\): value is RenderCacheMapsBag/
  );
  assert.match(
    renderState,
    /function isRenderMetaMapsBag\(value: RenderMetaBag\): value is RenderMetaMapsBag/
  );
  assert.doesNotMatch(renderState, /as RenderCacheBag \| null \| undefined/);
  assert.doesNotMatch(renderState, /as RenderMetaBag \| null \| undefined/);
  assert.doesNotMatch(renderState, /as RenderMaterialsBag \| null \| undefined/);

  assert.match(cachePruning, /function isCacheMapLike<[^>]+>\(value: unknown\): value is CacheMapLike/);
  assert.doesNotMatch(cachePruning, /as unknown as/);

  assert.match(
    geomPatchContracts,
    /export function isGeometryMap\(value: unknown\): value is GeometryCacheMap/
  );
  assert.doesNotMatch(geomPatchContracts, /as unknown as/);
});
