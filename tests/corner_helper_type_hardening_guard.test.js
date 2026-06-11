import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const normalizeShared = read('esm/native/builder/corner_state_normalize_shared.ts');
const materials = read('esm/native/builder/corner_materials.ts');
const cache = read('esm/native/builder/corner_cache.ts');
const common = read('esm/native/builder/corner_ops_emit_common.ts');

test('[corner-helpers-type-hardening] normalization/material/cache helpers use readers instead of brittle casts', () => {
  assert.match(normalizeShared, /const srcRec = asCornerConfigRecord\(src\);/);
  assert.match(normalizeShared, /const rec: CornerConfigRecord = srcRec \? \{ \.\.\.srcRec \} : \{\};/);
  assert.doesNotMatch(
    normalizeShared,
    /asCornerConfigRecord\(src\) \? \{ \.\.\.asCornerConfigRecord\(src\)! \} : \(\{\} as CornerConfigRecord\)/
  );

  assert.match(materials, /function readDoorSpecialValue\(value: unknown\): DoorSpecialValue/);
  assert.match(
    materials,
    /const scopedSpecial = readDoorSpecialValue\(readScopedMapVal\(doorSpecialMap, partId\)\);/
  );

  assert.match(cache, /const cache = asUnknownRecord\(getCacheBag\(App\)\);/);
  assert.match(cache, /const current = cache \? asUnknownRecord\(cache\[key\]\) : null;/);

  assert.match(common, /function asModesLike\(value: unknown\): ModesLike \| null/);
  assert.match(common, /const modeState = asModeStateLike\(readModeStateFromStore\(readStore\(app\)\)\);/);
});
