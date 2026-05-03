import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 49 slice write dispatch ownership split is anchored', () => {
  const facade = read('esm/native/runtime/slice_write_access_dispatch.ts');
  const orderOwner = read('esm/native/runtime/slice_write_access_dispatch_order.ts');
  const targetsOwner = read('esm/native/runtime/slice_write_access_dispatch_targets.ts');
  const plan = read('esm/native/runtime/slice_write_access_plan.ts');

  assert.ok(
    lineCount(facade) <= 180,
    'slice_write_access_dispatch.ts must stay a small public dispatch facade instead of regrowing target tables'
  );

  assert.match(
    facade,
    /from '\.\/slice_write_access_dispatch_targets\.js';/,
    'dispatch facade must consume target execution helpers from the target owner'
  );
  assert.match(
    facade,
    /from '\.\/slice_write_access_dispatch_order\.js';/,
    'dispatch facade must consume target ordering helpers from the order owner'
  );
  assert.match(
    facade,
    /export \{[\s\S]*resolveSliceDispatchTargets[\s\S]*type RootFallbackOptions[\s\S]*\} from '\.\/slice_write_access_dispatch_order\.js';/,
    'dispatch facade must preserve the existing public ordering exports through the facade'
  );
  assert.doesNotMatch(
    facade,
    /SLICE_STORE_WRITER_HANDLERS|ROOT_FALLBACK_TARGET_HANDLERS|META_TOUCH_TARGET_HANDLERS/,
    'dispatch facade must not own concrete target handler tables'
  );
  assert.doesNotMatch(
    facade,
    /createSliceDispatchTargetCacheKey|buildCanonicalDispatchTargetOrder/,
    'dispatch facade must not own target-order cache or ordering policy internals'
  );

  assert.match(
    orderOwner,
    /export function resolveRootFallbackDispatchTargets/,
    'dispatch order owner must own root fallback target resolution'
  );
  assert.match(
    orderOwner,
    /export function resolveSliceDispatchTargets/,
    'dispatch order owner must own slice target order resolution'
  );
  assert.match(
    orderOwner,
    /export function resolveMetaTouchDispatchTargets/,
    'dispatch order owner must own meta-touch target order resolution'
  );
  assert.match(orderOwner, /sliceDispatchTargetsCache/, 'dispatch order owner must own slice target caching');
  assert.doesNotMatch(
    orderOwner,
    /getSliceNamespaceFromContext|readSlicePatchValue|toRootPatchPayload/,
    'dispatch order owner must stay pure policy and not execute writes'
  );

  assert.match(
    targetsOwner,
    /export const ROOT_FALLBACK_TARGET_HANDLERS/,
    'dispatch target owner must own root fallback handlers'
  );
  assert.match(
    targetsOwner,
    /export const META_TOUCH_TARGET_HANDLERS/,
    'dispatch target owner must own meta-touch handlers'
  );
  assert.match(
    targetsOwner,
    /export const SLICE_DISPATCH_TARGET_HANDLERS/,
    'dispatch target owner must own slice dispatch handlers'
  );
  assert.match(
    targetsOwner,
    /export function dispatchSliceTarget/,
    'dispatch target owner must expose a narrow slice target execution seam'
  );
  assert.doesNotMatch(
    targetsOwner,
    /resolveSliceDispatchTargets|resolveMetaTouchDispatchTargets/,
    'dispatch target owner must not own target ordering policy'
  );
  assert.doesNotMatch(
    orderOwner + targetsOwner + facade,
    /export default\s+/,
    'slice dispatch owners must stay named-export only'
  );

  assert.match(
    plan,
    /from '\.\/slice_write_access_dispatch\.js';/,
    'canonical dispatch plan must keep depending on the public dispatch facade'
  );
  assert.doesNotMatch(
    plan,
    /slice_write_access_dispatch_(order|targets)\.js/,
    'canonical dispatch plan must not bypass the public dispatch facade owners'
  );
});
