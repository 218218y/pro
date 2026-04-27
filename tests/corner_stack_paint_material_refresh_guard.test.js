import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const colorPolicy = readFileSync('esm/native/builder/materials_apply_color_policy.ts', 'utf8');
const traversal = readFileSync('esm/native/builder/materials_apply_traversal.ts', 'utf8');

test('corner no-build paint refresh is stack-aware for bottom stack materials', () => {
  assert.match(
    colorPolicy,
    /export function scopeCornerPartKeyForStack\(partId: string, stackKey: PartStackKey\): string \{/
  );
  assert.match(colorPolicy, /export function readPartColorEntry\(args: \{/);
  assert.match(colorPolicy, /const scopedPartId = scopeCornerPartKeyForStack\(partId, stackKey\);/);
  assert.match(
    colorPolicy,
    /if \(scopedPartId !== partId\) \{[\s\S]*Object\.prototype\.hasOwnProperty\.call\(individualColors, scopedPartId\)[\s\S]*return undefined;[\s\S]*\}/
  );
});

test('corner no-build paint refresh inherits __wpStack through the traversal so child meshes use the right scoped material key', () => {
  assert.match(traversal, /const ownStackKey = readStackKey\(userData\.__wpStack\) \|\| parentStackKey;/);
  assert.match(
    traversal,
    /stack\.push\(\{ obj: child, partId: ownPartId, stackKey: ownStackKey, skip: skipSubtree \}\);/
  );
  assert.match(traversal, /const material = getPartMat\(ownPartId, ownStackKey\);/);
});
