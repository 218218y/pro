import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeCorniceType as normalizeTypeScript } from '../types/cornice_type.ts';
import { normalizeCorniceType as normalizeJavaScript } from '../types/cornice_type.js';

test('cornice discriminator normalization is identical in TypeScript and direct JavaScript runtime', () => {
  const cases = [
    ['classic', 'classic', 'classic'],
    [' WAVE ', 'classic', 'wave'],
    ['STRAIGHT', 'classic', 'straight'],
    ['invalid', 'classic', 'classic'],
    [undefined, 'wave', 'wave'],
    [42, 'straight', 'straight'],
    [null, 'classic', 'classic'],
  ];

  for (const [value, fallback, expected] of cases) {
    assert.equal(normalizeTypeScript(value, fallback), expected);
    assert.equal(normalizeJavaScript(value, fallback), expected);
  }
});
