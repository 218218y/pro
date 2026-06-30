import test from 'node:test';
import assert from 'node:assert/strict';

import { parseNum, readBoundsAxis } from '../esm/native/builder/post_build_extras_shared.ts';

test('post-build parseNum accepts explicit numeric text without generic JS coercion', () => {
  assert.equal(parseNum(0.25), 0.25);
  assert.equal(parseNum(' 0.25 '), 0.25);
  assert.equal(parseNum('-.5'), -0.5);

  assert.equal(Number.isNaN(parseNum('')), true);
  assert.equal(Number.isNaN(parseNum(null)), true);
  assert.equal(Number.isNaN(parseNum(false)), true);
  assert.equal(Number.isNaN(parseNum([])), true);
  assert.equal(Number.isNaN(parseNum('0x10')), true);
  assert.equal(Number.isNaN(parseNum('1e3')), true);
  assert.equal(Number.isNaN(parseNum('1abc')), true);
});

test('post-build bounds axis reads runtime geometry numbers only', () => {
  const bounds = { min: { x: '1', y: 2 }, max: { x: 3, y: '4' } } as any;

  assert.equal(Number.isNaN(readBoundsAxis(bounds, 'x', 'min')), true);
  assert.equal(readBoundsAxis(bounds, 'y', 'min'), 2);
  assert.equal(readBoundsAxis(bounds, 'x', 'max'), 3);
  assert.equal(Number.isNaN(readBoundsAxis(bounds, 'y', 'max')), true);
});
