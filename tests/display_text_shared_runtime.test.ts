import test from 'node:test';
import assert from 'node:assert/strict';

import { formatDisplayScalar, readDisplayScalar } from '../esm/shared/display_text_shared.ts';

test('display text formats declared scalar values only', () => {
  assert.equal(formatDisplayScalar(readDisplayScalar('hello')), 'hello');
  assert.equal(formatDisplayScalar(readDisplayScalar(12)), '12');
  assert.equal(formatDisplayScalar(readDisplayScalar(false)), 'false');
  assert.equal(formatDisplayScalar(readDisplayScalar(12n)), '12');
  assert.equal(formatDisplayScalar(readDisplayScalar(null), 'fallback'), 'fallback');
});

test('display text rejects object, array, function, symbol, and non-finite numbers', () => {
  for (const value of [{}, [], () => 'text', Symbol('text'), Number.NaN]) {
    assert.equal(formatDisplayScalar(readDisplayScalar(value)), '');
  }
});
