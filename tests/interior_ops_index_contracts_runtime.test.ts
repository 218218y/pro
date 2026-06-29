import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInteriorRenderIndexSet,
  buildInteriorShelfVariantByIndex,
  readInteriorRenderObjectIndexKey,
} from '../esm/native/builder/render_interior_ops_index_contracts.ts';
import { buildShelfVariantByIndex } from '../esm/native/builder/render_interior_custom_ops_shared.ts';

test('interior render index contracts keep object-key parsing canonical', () => {
  assert.equal(readInteriorRenderObjectIndexKey('0'), 0);
  assert.equal(readInteriorRenderObjectIndexKey('12'), 12);
  assert.equal(readInteriorRenderObjectIndexKey('01'), null);
  assert.equal(readInteriorRenderObjectIndexKey('1x'), null);
  assert.equal(readInteriorRenderObjectIndexKey('1.2'), null);
  assert.equal(readInteriorRenderObjectIndexKey('-1'), null);
  assert.equal(readInteriorRenderObjectIndexKey(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
  assert.equal(readInteriorRenderObjectIndexKey(String(Number.MAX_SAFE_INTEGER) + '0'), null);
});

test('interior render index contracts reject encoded numeric payload values but accept object keys', () => {
  assert.deepEqual(Object.keys(buildInteriorRenderIndexSet(['2', 3])), ['3']);

  assert.deepEqual(
    { ...buildInteriorShelfVariantByIndex({ 2: 'glass', 4: 'BRACE' }) },
    {
      2: 'glass',
      4: 'brace',
    }
  );
  assert.deepEqual(
    { ...buildInteriorShelfVariantByIndex({ '2x': 'glass', '01': 'brace', '-1': 'regular' }) },
    {}
  );

  assert.deepEqual(
    { ...buildShelfVariantByIndex({ shelfVariants: { 2: 'double', '3x': 'glass' } }) },
    {
      2: 'double',
    }
  );
});
