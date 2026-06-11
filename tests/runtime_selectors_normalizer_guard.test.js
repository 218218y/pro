import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const normalizersSrc = fs.readFileSync(
  new URL('../esm/native/runtime/runtime_selectors_normalizers.ts', import.meta.url),
  'utf8'
);
const snapshotSrc = fs.readFileSync(
  new URL('../esm/native/runtime/runtime_selectors_snapshot.ts', import.meta.url),
  'utf8'
);
const facadeSrc = fs.readFileSync(
  new URL('../esm/native/runtime/runtime_selectors.ts', import.meta.url),
  'utf8'
);

test('runtime selectors use a canonical normalizer table instead of per-branch generic casts', () => {
  assert.match(normalizersSrc, /const RUNTIME_SCALAR_NORMALIZERS: \{/);
  assert.match(snapshotSrc, /return RUNTIME_SCALAR_NORMALIZERS\[key\]\(rawValue, def\);/);
  assert.match(facadeSrc, /runtime_selectors_normalizers|runtime_selectors_snapshot/);
  assert.doesNotMatch(snapshotSrc, /readBooleanLike\(rawValue, boolFallback\) as RuntimeScalarValueMap\[K\]/);
  assert.doesNotMatch(
    snapshotSrc,
    /normalizeDrawersOpenId\(rawValue, drawersFallback\) as RuntimeScalarValueMap\[K\]/
  );
});
