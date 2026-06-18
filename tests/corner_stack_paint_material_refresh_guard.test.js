import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const colorLookup = readFileSync('esm/native/builder/material_color_lookup.ts', 'utf8');
const traversal = readFileSync('esm/native/builder/materials_apply_traversal.ts', 'utf8');

test('corner no-build paint refresh is stack-aware for bottom stack materials', () => {
  assert.match(
    colorLookup,
    /export function scopeCornerPartKeyForStack\(partId: string, stackKey: PartStackKey\): string \{/
  );
  assert.match(colorLookup, /export function readPartColorEntry\(args: \{/);
  assert.match(colorLookup, /const scopedPartId = scopeCornerPartKeyForStack\(partId, stackKey\);/);
  assert.match(
    colorLookup,
    /if \(scopedPartId !== partId\) \{[\s\S]*Object\.prototype\.hasOwnProperty\.call\(individualColors, scopedPartId\)[\s\S]*return undefined;[\s\S]*\}/
  );
});

test('corner no-build paint refresh inherits __wpStack through the traversal so child meshes use the right scoped material key', () => {
  assert.match(traversal, /const ownStackKey = readStackKey\(userData\.__wpStack\) \|\| parentStackKey;/);
  assert.match(traversal, /const ownStackSplitUnifiedFrame =/);
  assert.match(traversal, /const effectiveUserData =/);
  assert.match(traversal, /stackSplitUnifiedFrame: ownStackSplitUnifiedFrame,/);
  assert.match(traversal, /const shelfDefaultKey = userData\.__wpShelfGroupPartId/);
  assert.match(traversal, /const material = getPartMat\(ownPartId, ownStackKey, effectiveUserData\);/);
});
