import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('[stage4-ui-build-reactivity] state_api interactive ui commits use root store.patch and not store.setUi helper defaults', () => {
  const src = read('esm/native/kernel/state_api_install_support.ts');

  assert.match(src, /const commitFilteredSlicePatch = <N extends SlicePatchNamespace>\(/);
  assert.match(src, /if \(namespace === 'ui' && typeof store\.patch === 'function'\) \{/);
  assert.match(
    src,
    /const payload: PatchPayload = \{ ui: (?:filtered as UiSlicePatch|readSlicePatchValue\('ui', filtered\)) \};/
  );
  assert.match(src, /return store\.patch\(payload, meta\);/);
  assert.match(
    src,
    /const commitUiPatch = \(patch: UiSlicePatch, meta: ActionMetaLike\): unknown =>\s*commitFilteredSlicePatch\('ui', patch, meta\);/
  );

  // Guard against regressing back to helper-default ui leaf writes as the first-choice interactive route.
  assert.doesNotMatch(
    src,
    /const commitUiPatch = \(patch: UiSlicePatch, meta: ActionMetaLike\): unknown =>\s*patchSliceWithDedicatedWriter\(App, 'ui', patch, meta/
  );
});

test('[stage4-ui-build-reactivity] render loop visual helper no longer carries unused doors-runtime DI', () => {
  const helper = [
    read('esm/native/platform/render_loop_visual_effects.ts'),
    read('esm/native/platform/render_loop_visual_effects_shared.ts'),
    read('esm/native/platform/render_loop_visual_effects_mirror.ts'),
    read('esm/native/platform/render_loop_visual_effects_floor.ts'),
    read('esm/native/platform/render_loop_visual_effects_front_overlay.ts'),
  ].join('\n');
  assert.doesNotMatch(helper, /getDoorsOpenViaService: \(A: unknown\) => boolean/);
  assert.doesNotMatch(helper, /getDoorsRuntime: \(A: unknown\) => AnyRecord \| null/);
  assert.doesNotMatch(helper, /getHardCloseUntil: \(A: unknown\) => number/);
});
