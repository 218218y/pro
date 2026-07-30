import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertReviewedOwnershipFamily } from './helpers/dimension_reviewed_ownership_contract_helper.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryNumbers = Object.freeze([25, 28, 29, 35, 40, 41, 53, 54, 57, 58, 59, 75, 76, 78, 115, 120, 125]);

test('Wave E material thickness consumers use one canonical focused ownership family', () => {
  assertReviewedOwnershipFamily({
    root,
    label: 'Wave E material thickness',
    entryNumbers,
  });
});
